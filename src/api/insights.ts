import { Router } from "express";
import sql from "../db/index.js";

const router = Router();

interface AccountMetrics {
  id: number;
  name: string;
  platform: string;
  currency: string;
  tipo: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cost_per_conv: number;
  roas: number;
  ctr: number;
}

interface Alert {
  account: string;
  accountId: number;
  type: string;
  message: string;
  severity: "critical" | "high" | "medium" | "info";
  suggestion: string;
}

interface PerformanceScore {
  accountId: number;
  name: string;
  platform: string;
  currency: string;
  tipo: string;
  score: number;
  trend: string;
  status: "good" | "warning" | "bad";
  spend: number;
  conversions: number;
  costPerConv: number;
  ctr: number;
  roas: number;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function fmtPct(val: number): string {
  const sign = val >= 0 ? "+" : "";
  return `${sign}${Math.round(val)}%`;
}

function fmtMoney(val: number, currency: string): string {
  if (currency === "USD") return `US$${val.toFixed(2)}`;
  return `$${Math.round(val).toLocaleString("es-CO")}`;
}

function computeScore(
  acc: AccountMetrics,
  prev: AccountMetrics | null,
): number {
  let score = 0;
  const conv = Number(acc.conversions);
  const ctr = Number(acc.ctr);
  const cpc = Number(acc.cost_per_conv);
  const currency = acc.currency;
  const tipo = acc.tipo;

  if (conv > 0) score += 30;
  if (ctr > 1) score += 20;

  if (conv > 0) {
    if (tipo === "leads") {
      const threshold = currency === "COP" ? 25000 : 8;
      if (cpc <= threshold) score += 30;
      else if (cpc <= threshold * 1.5) score += 15;
    } else if (tipo === "whatsapp") {
      const threshold = currency === "COP" ? 12000 : 5;
      if (cpc <= threshold) score += 30;
      else if (cpc <= threshold * 1.5) score += 15;
    } else if (tipo === "ventas") {
      const roas = Number(acc.roas);
      if (roas >= 2) score += 30;
      else if (roas >= 1) score += 15;
    }
  }

  if (prev) {
    const prevCpc = Number(prev.cost_per_conv);
    const prevConv = Number(prev.conversions);
    if (conv > 0 && prevCpc > 0 && cpc < prevCpc) score += 10;
    if (conv > prevConv) score += 10;
  }

  return Math.min(100, score);
}

function generateAlerts(
  current: AccountMetrics,
  previous: AccountMetrics | null,
): Alert[] {
  const alerts: Alert[] = [];
  const spend = Number(current.spend);
  const conv = Number(current.conversions);
  const cpc = Number(current.cost_per_conv);
  const ctr = Number(current.ctr);
  const name = current.name;
  const id = current.id;
  const currency = current.currency;

  const prevSpend = previous ? Number(previous.spend) : 0;
  const prevConv = previous ? Number(previous.conversions) : 0;
  const prevCpc = previous ? Number(previous.cost_per_conv) : 0;
  const prevCtr = previous ? Number(previous.ctr) : 0;

  if (spend === 0) {
    alerts.push({
      account: name,
      accountId: id,
      type: "sin_gasto",
      message: `Sin gasto en el periodo actual`,
      severity: "info",
      suggestion:
        "Verificar si la cuenta esta pausada o si hay problemas de facturacion",
    });
    return alerts;
  }

  if (spend > 0 && conv === 0) {
    alerts.push({
      account: name,
      accountId: id,
      type: "sin_conversiones",
      message: `Gastando ${fmtMoney(spend, currency)} sin conversiones`,
      severity: "critical",
      suggestion:
        "Verificar pixel/evento de conversion. Revisar landing page y que el tracking este funcionando correctamente",
    });
  }

  if (prevCpc > 0 && cpc > 0) {
    const cpcChange = pctChange(cpc, prevCpc);
    if (cpcChange > 30) {
      alerts.push({
        account: name,
        accountId: id,
        type: "cpl_alto",
        message: `Costo por conversion subio ${Math.round(cpcChange)}% vs periodo anterior (${fmtMoney(prevCpc, currency)} → ${fmtMoney(cpc, currency)})`,
        severity: "high",
        suggestion:
          "Revisar audiencias y creativos. Considerar pausar anuncios con frecuencia >3",
      });
    }
  }

  if (ctr < 0.8 && spend > 0 && conv > 0) {
    alerts.push({
      account: name,
      accountId: id,
      type: "ctr_bajo",
      message: `CTR en ${ctr.toFixed(2)}%${prevCtr > 0 ? ` (antes ${prevCtr.toFixed(2)}%)` : ""}`,
      severity: "medium",
      suggestion:
        "Creativos agotados. Probar nuevos formatos (video/carrusel) y refrescar copys",
    });
  }

  if (prevSpend > 0 && prevConv > 0) {
    const spendChange = pctChange(spend, prevSpend);
    const convChange = pctChange(conv, prevConv);
    if (spendChange > 40 && convChange < spendChange * 0.5) {
      alerts.push({
        account: name,
        accountId: id,
        type: "gasto_ineficiente",
        message: `Gasto subio ${Math.round(spendChange)}% pero conversiones solo ${fmtPct(convChange)}`,
        severity: "high",
        suggestion:
          "Revisar presupuestos diarios y reglas automatizadas. El aumento de gasto no esta generando resultados proporcionales",
      });
    }
  }

  return alerts;
}

async function persistAlerts(alerts: Alert[], days: number) {
  for (const alert of alerts) {
    if (alert.severity === "info") continue; // don't persist info alerts

    // Dedup: check if same alert exists in last 24h
    const existing = await sql`
      SELECT id FROM alerts
      WHERE account_id = ${alert.accountId}
        AND type = ${alert.type}
        AND resolved = false
        AND created_at > now() - interval '24 hours'
      LIMIT 1
    `;
    if (existing.length > 0) continue;

    await sql`
      INSERT INTO alerts (account_id, type, message, priority, severity, suggestion, alert_type, period_days)
      VALUES (${alert.accountId}, ${alert.type}, ${alert.message}, ${alert.severity}, ${alert.severity}, ${alert.suggestion}, ${alert.type}, ${days})
    `;
  }

  // Mark alerts as resolved if their account no longer has them
  const activeAccountIds = new Set(alerts.map(a => a.accountId));
  const activeTypes = new Set(alerts.map(a => `${a.accountId}:${a.type}`));

  const unresolvedAlerts = await sql`
    SELECT id, account_id, type FROM alerts WHERE resolved = false
  `;

  for (const ua of unresolvedAlerts) {
    const key = `${ua.account_id}:${ua.type}`;
    if (activeAccountIds.has(ua.account_id) && !activeTypes.has(key)) {
      await sql`UPDATE alerts SET resolved = true, resolved_at = now() WHERE id = ${ua.id}`;
    }
  }
}

async function fetchPeriodMetrics(
  days: number,
  offsetDays: number,
): Promise<AccountMetrics[]> {
  const rows = await sql`
    SELECT
      a.id, a.name, a.platform, a.currency, a.tipo,
      COALESCE(SUM(m.spend), 0) as spend,
      COALESCE(SUM(m.impressions), 0) as impressions,
      COALESCE(SUM(m.clicks), 0) as clicks,
      COALESCE(SUM(m.conversions), 0) as conversions,
      CASE WHEN SUM(m.conversions) > 0 THEN SUM(m.spend) / SUM(m.conversions) ELSE 0 END as cost_per_conv,
      CASE WHEN SUM(m.spend) > 0 AND SUM(m.conv_value) > 0 THEN SUM(m.conv_value) / SUM(m.spend) ELSE 0 END as roas,
      CASE WHEN SUM(m.impressions) > 0 THEN (SUM(m.clicks)::numeric / SUM(m.impressions) * 100) ELSE 0 END as ctr
    FROM ad_accounts a
    LEFT JOIN metrics_daily m
      ON m.ad_account_id = a.id
      AND m.date > CURRENT_DATE - ${offsetDays + days}::int
      AND m.date <= CURRENT_DATE - ${offsetDays}::int
    WHERE a.active = true
    GROUP BY a.id, a.name, a.platform, a.currency, a.tipo
    ORDER BY spend DESC
  `;
  return rows as unknown as AccountMetrics[];
}

router.get("/insights", async (req, res) => {
  try {
    const rawDays = parseInt(req.query.days as string) || 7;
    const isYesterday = rawDays < 0;
    const days = isYesterday ? 1 : rawDays;
    const offset = isYesterday ? 1 : 0;

    const [current, previous] = await Promise.all([
      fetchPeriodMetrics(days, offset),
      fetchPeriodMetrics(days, offset + days),
    ]);

    const prevMap = new Map(previous.map((p) => [p.id, p]));

    const alerts: Alert[] = [];
    const performanceScores: PerformanceScore[] = [];

    for (const acc of current) {
      const prev = prevMap.get(acc.id) || null;

      const accountAlerts = generateAlerts(acc, prev);
      alerts.push(...accountAlerts);

      const score = computeScore(acc, prev);

      const prevCpc = prev ? Number(prev.cost_per_conv) : 0;
      const curCpc = Number(acc.cost_per_conv);
      let trend = "sin datos";
      if (prev && Number(prev.spend) > 0) {
        if (curCpc > 0 && prevCpc > 0) {
          const change = pctChange(curCpc, prevCpc);
          trend = `${change <= 0 ? "↓" : "↑"}CPL ${Math.abs(Math.round(change))}%`;
        } else if (Number(acc.conversions) > 0 && Number(prev.conversions) > 0) {
          const change = pctChange(
            Number(acc.conversions),
            Number(prev.conversions),
          );
          trend = `${change >= 0 ? "↑" : "↓"}Conv ${Math.abs(Math.round(change))}%`;
        } else {
          const spendChange = pctChange(
            Number(acc.spend),
            Number(prev.spend),
          );
          trend = `${spendChange >= 0 ? "↑" : "↓"}Gasto ${Math.abs(Math.round(spendChange))}%`;
        }
      }

      performanceScores.push({
        accountId: acc.id,
        name: acc.name,
        platform: acc.platform,
        currency: acc.currency,
        tipo: acc.tipo,
        score,
        trend,
        status: score > 70 ? "good" : score > 40 ? "warning" : "bad",
        spend: Number(acc.spend),
        conversions: Number(acc.conversions),
        costPerConv: Number(acc.cost_per_conv),
        ctr: Number(acc.ctr),
        roas: Number(acc.roas),
      });
    }

    // Sort alerts by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, info: 3 };
    alerts.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    // Persist alerts to DB (async, don't block response)
    persistAlerts(alerts, days).catch(err =>
      console.error("Error persisting alerts:", err.message)
    );

    // Week over week totals
    const curTotalSpend = current.reduce((s, a) => s + Number(a.spend), 0);
    const prevTotalSpend = previous.reduce((s, a) => s + Number(a.spend), 0);
    const curTotalConv = current.reduce(
      (s, a) => s + Number(a.conversions),
      0,
    );
    const prevTotalConv = previous.reduce(
      (s, a) => s + Number(a.conversions),
      0,
    );
    const curAvgCpl =
      curTotalConv > 0 ? curTotalSpend / curTotalConv : 0;
    const prevAvgCpl =
      prevTotalConv > 0 ? prevTotalSpend / prevTotalConv : 0;

    const spendChange = pctChange(curTotalSpend, prevTotalSpend);
    const leadsChange = pctChange(curTotalConv, prevTotalConv);
    const cplChange = pctChange(curAvgCpl, prevAvgCpl);

    let direction: "better" | "worse" | "stable" = "stable";
    if (cplChange > 15 || (spendChange > 10 && leadsChange < -5))
      direction = "worse";
    else if (cplChange < -10 || leadsChange > 10) direction = "better";

    const weekOverWeek = {
      spendChange: fmtPct(spendChange),
      leadsChange: fmtPct(leadsChange),
      cplChange: fmtPct(cplChange),
      direction,
      currentSpend: curTotalSpend,
      previousSpend: prevTotalSpend,
      currentConversions: curTotalConv,
      previousConversions: prevTotalConv,
    };

    const topPerformers = performanceScores
      .filter((p) => p.status === "good")
      .sort((a, b) => b.score - a.score);

    const alertAccountIds = new Set(
      alerts
        .filter((a) => a.severity === "critical" || a.severity === "high")
        .map((a) => a.accountId),
    );
    const needsAttention = performanceScores
      .filter((p) => p.status !== "good" || alertAccountIds.has(p.accountId))
      .sort((a, b) => a.score - b.score);

    res.json({
      alerts,
      performanceScores,
      weekOverWeek,
      topPerformers,
      needsAttention,
    });
  } catch (err) {
    console.error("Error in /api/insights:", err);
    res.status(500).json({ error: "Error generando insights" });
  }
});

export default router;
