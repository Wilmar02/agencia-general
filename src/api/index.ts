import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sql from "../db/index.js";
import billingRouter from "./billing.js";
import insightsRouter from "./insights.js";
import cron from "node-cron";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3001");

app.use(express.json());
app.use(express.static(path.join(__dirname, "../../dist"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".js")) res.setHeader("Content-Type", "application/javascript");
    if (filePath.endsWith(".css")) res.setHeader("Content-Type", "text/css");
  }
}));
app.use("/api/billing", billingRouter);
app.use("/api", insightsRouter);

// GET /api/accounts — todas las cuentas
app.get("/api/accounts", async (_req, res) => {
  const accounts = await sql`SELECT * FROM ad_accounts WHERE active = true ORDER BY name`;
  res.json(accounts);
});

// GET /api/dashboard?days=7 — resumen general (days=-1 = yesterday)
app.get("/api/dashboard", async (req, res) => {
  const rawDays = parseInt(req.query.days as string) || 7;
  const isYesterday = rawDays < 0;
  const days = isYesterday ? 1 : rawDays;
  const offset = isYesterday ? 1 : 0;
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
    LEFT JOIN metrics_daily m ON m.ad_account_id = a.id
      AND m.date > CURRENT_DATE - ${offset + days}::int
      AND m.date <= CURRENT_DATE - ${offset}::int
    WHERE a.active = true
    GROUP BY a.id, a.name, a.platform, a.currency, a.tipo
    ORDER BY spend DESC
  `;

  const totalSpendCOP = rows.filter(r => r.currency === "COP").reduce((s, r) => s + Number(r.spend), 0);
  const totalSpendUSD = rows.filter(r => r.currency === "USD").reduce((s, r) => s + Number(r.spend), 0);
  const totalLeads = rows.filter(r => r.tipo === "leads").reduce((s, r) => s + Number(r.conversions), 0);
  const totalChats = rows.filter(r => r.tipo === "whatsapp").reduce((s, r) => s + Number(r.conversions), 0);
  const totalVentas = rows.filter(r => r.tipo === "ventas").reduce((s, r) => s + Number(r.conversions), 0);

  res.json({ totalSpendCOP, totalSpendUSD, totalLeads, totalChats, totalVentas, accounts: rows });
});

// GET /api/metrics/:accountId?days=30 — métricas por cuenta
app.get("/api/metrics/:accountId", async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const rows = await sql`
    SELECT * FROM metrics_daily
    WHERE ad_account_id = ${req.params.accountId}
    AND date >= CURRENT_DATE - ${days}::int
    ORDER BY date ASC
  `;
  res.json(rows);
});

// GET /api/campaigns/:accountId?days=7 — campañas por cuenta
app.get("/api/campaigns/:accountId", async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const rows = await sql`
    SELECT campaign_name, campaign_id,
      SUM(spend)::numeric as spend, SUM(impressions)::int as impressions,
      SUM(clicks)::int as clicks, COALESCE(SUM(reach), 0)::int as reach,
      CASE WHEN SUM(impressions) > 0 THEN (SUM(clicks)::numeric/SUM(impressions)*100) ELSE 0 END as ctr,
      CASE WHEN SUM(impressions) > 0 THEN (SUM(spend)/SUM(impressions)*1000) ELSE 0 END as cpm,
      CASE WHEN SUM(clicks) > 0 THEN (SUM(spend)/SUM(clicks)) ELSE 0 END as cpc,
      CASE WHEN COALESCE(SUM(reach), 0) > 0 THEN (SUM(impressions)::numeric/SUM(reach)) ELSE 0 END as frequency,
      SUM(conversions)::int as conversions,
      CASE WHEN SUM(conversions) > 0 THEN SUM(spend)/SUM(conversions) ELSE 0 END as cost_per_conv,
      COALESCE(SUM(conv_value), 0)::numeric as conv_value,
      CASE WHEN SUM(spend) > 0 AND COALESCE(SUM(conv_value), 0) > 0 THEN SUM(conv_value)/SUM(spend) ELSE 0 END as roas,
      MAX(objective) as objective,
      MAX(status) as status
    FROM campaigns_daily
    WHERE ad_account_id = ${req.params.accountId}
    AND date >= CURRENT_DATE - ${days}::int
    GROUP BY campaign_name, campaign_id
    ORDER BY SUM(spend) DESC
  `;
  res.json(rows);
});

// GET /api/adsets/:accountId?days=7&campaign_id=X — ad sets por cuenta
app.get("/api/adsets/:accountId", async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const campaignId = req.query.campaign_id as string | undefined;

  const rows = campaignId
    ? await sql`
        SELECT adset_name, adset_id, MAX(campaign_id) as campaign_id,
          SUM(spend)::numeric as spend, SUM(impressions)::int as impressions,
          SUM(clicks)::int as clicks, COALESCE(SUM(reach), 0)::int as reach,
          CASE WHEN SUM(impressions) > 0 THEN (SUM(clicks)::numeric/SUM(impressions)*100) ELSE 0 END as ctr,
          CASE WHEN SUM(impressions) > 0 THEN (SUM(spend)/SUM(impressions)*1000) ELSE 0 END as cpm,
          CASE WHEN SUM(clicks) > 0 THEN (SUM(spend)/SUM(clicks)) ELSE 0 END as cpc,
          CASE WHEN COALESCE(SUM(reach), 0) > 0 THEN (SUM(impressions)::numeric/SUM(reach)) ELSE 0 END as frequency,
          SUM(conversions)::int as conversions,
          CASE WHEN SUM(conversions) > 0 THEN SUM(spend)/SUM(conversions) ELSE 0 END as cost_per_conv,
          COALESCE(SUM(conv_value), 0)::numeric as conv_value,
          CASE WHEN SUM(spend) > 0 AND COALESCE(SUM(conv_value), 0) > 0 THEN SUM(conv_value)/SUM(spend) ELSE 0 END as roas,
          MAX(daily_budget)::numeric as daily_budget,
          MAX(lifetime_budget)::numeric as lifetime_budget,
          MAX(status) as status
        FROM adsets_daily
        WHERE ad_account_id = ${req.params.accountId}
        AND date >= CURRENT_DATE - ${days}::int
        AND campaign_id = ${campaignId}
        GROUP BY adset_name, adset_id
        ORDER BY SUM(spend) DESC
      `
    : await sql`
        SELECT adset_name, adset_id, MAX(campaign_id) as campaign_id,
          SUM(spend)::numeric as spend, SUM(impressions)::int as impressions,
          SUM(clicks)::int as clicks, COALESCE(SUM(reach), 0)::int as reach,
          CASE WHEN SUM(impressions) > 0 THEN (SUM(clicks)::numeric/SUM(impressions)*100) ELSE 0 END as ctr,
          CASE WHEN SUM(impressions) > 0 THEN (SUM(spend)/SUM(impressions)*1000) ELSE 0 END as cpm,
          CASE WHEN SUM(clicks) > 0 THEN (SUM(spend)/SUM(clicks)) ELSE 0 END as cpc,
          CASE WHEN COALESCE(SUM(reach), 0) > 0 THEN (SUM(impressions)::numeric/SUM(reach)) ELSE 0 END as frequency,
          SUM(conversions)::int as conversions,
          CASE WHEN SUM(conversions) > 0 THEN SUM(spend)/SUM(conversions) ELSE 0 END as cost_per_conv,
          COALESCE(SUM(conv_value), 0)::numeric as conv_value,
          CASE WHEN SUM(spend) > 0 AND COALESCE(SUM(conv_value), 0) > 0 THEN SUM(conv_value)/SUM(spend) ELSE 0 END as roas,
          MAX(daily_budget)::numeric as daily_budget,
          MAX(lifetime_budget)::numeric as lifetime_budget,
          MAX(status) as status
        FROM adsets_daily
        WHERE ad_account_id = ${req.params.accountId}
        AND date >= CURRENT_DATE - ${days}::int
        GROUP BY adset_name, adset_id
        ORDER BY SUM(spend) DESC
      `;
  res.json(rows);
});

// GET /api/ads/:accountId?days=7&adset_id=X — anuncios por cuenta
app.get("/api/ads/:accountId", async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const adsetId = req.query.adset_id as string | undefined;

  const rows = adsetId
    ? await sql`
        SELECT ad_name, ad_id, MAX(adset_id) as adset_id, MAX(campaign_id) as campaign_id,
          SUM(spend)::numeric as spend, SUM(impressions)::int as impressions,
          SUM(clicks)::int as clicks, COALESCE(SUM(reach), 0)::int as reach,
          CASE WHEN SUM(impressions) > 0 THEN (SUM(clicks)::numeric/SUM(impressions)*100) ELSE 0 END as ctr,
          CASE WHEN SUM(impressions) > 0 THEN (SUM(spend)/SUM(impressions)*1000) ELSE 0 END as cpm,
          CASE WHEN SUM(clicks) > 0 THEN (SUM(spend)/SUM(clicks)) ELSE 0 END as cpc,
          CASE WHEN COALESCE(SUM(reach), 0) > 0 THEN (SUM(impressions)::numeric/SUM(reach)) ELSE 0 END as frequency,
          SUM(conversions)::int as conversions,
          CASE WHEN SUM(conversions) > 0 THEN SUM(spend)/SUM(conversions) ELSE 0 END as cost_per_conv,
          COALESCE(SUM(conv_value), 0)::numeric as conv_value,
          CASE WHEN SUM(spend) > 0 AND COALESCE(SUM(conv_value), 0) > 0 THEN SUM(conv_value)/SUM(spend) ELSE 0 END as roas,
          MAX(thumbnail_url) as thumbnail_url,
          MAX(body_text) as body_text,
          MAX(title) as title,
          MAX(creative_type) as creative_type,
          MAX(call_to_action) as call_to_action,
          MAX(status) as status
        FROM ads_daily
        WHERE ad_account_id = ${req.params.accountId}
        AND date >= CURRENT_DATE - ${days}::int
        AND adset_id = ${adsetId}
        GROUP BY ad_name, ad_id
        ORDER BY SUM(spend) DESC
      `
    : await sql`
        SELECT ad_name, ad_id, MAX(adset_id) as adset_id, MAX(campaign_id) as campaign_id,
          SUM(spend)::numeric as spend, SUM(impressions)::int as impressions,
          SUM(clicks)::int as clicks, COALESCE(SUM(reach), 0)::int as reach,
          CASE WHEN SUM(impressions) > 0 THEN (SUM(clicks)::numeric/SUM(impressions)*100) ELSE 0 END as ctr,
          CASE WHEN SUM(impressions) > 0 THEN (SUM(spend)/SUM(impressions)*1000) ELSE 0 END as cpm,
          CASE WHEN SUM(clicks) > 0 THEN (SUM(spend)/SUM(clicks)) ELSE 0 END as cpc,
          CASE WHEN COALESCE(SUM(reach), 0) > 0 THEN (SUM(impressions)::numeric/SUM(reach)) ELSE 0 END as frequency,
          SUM(conversions)::int as conversions,
          CASE WHEN SUM(conversions) > 0 THEN SUM(spend)/SUM(conversions) ELSE 0 END as cost_per_conv,
          COALESCE(SUM(conv_value), 0)::numeric as conv_value,
          CASE WHEN SUM(spend) > 0 AND COALESCE(SUM(conv_value), 0) > 0 THEN SUM(conv_value)/SUM(spend) ELSE 0 END as roas,
          MAX(thumbnail_url) as thumbnail_url,
          MAX(body_text) as body_text,
          MAX(title) as title,
          MAX(creative_type) as creative_type,
          MAX(call_to_action) as call_to_action,
          MAX(status) as status
        FROM ads_daily
        WHERE ad_account_id = ${req.params.accountId}
        AND date >= CURRENT_DATE - ${days}::int
        GROUP BY ad_name, ad_id
        ORDER BY SUM(spend) DESC
      `;
  res.json(rows);
});

// GET /api/alerts — alertas recientes
app.get("/api/alerts", async (_req, res) => {
  const rows = await sql`
    SELECT al.*, a.name as account_name
    FROM alerts al JOIN ad_accounts a ON al.account_id = a.id
    ORDER BY al.created_at DESC LIMIT 50
  `;
  res.json(rows);
});

// GET /api/alerts/history?days=30 — historial de alertas
app.get("/api/alerts/history", async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const rows = await sql`
    SELECT al.*, a.name as account_name
    FROM alerts al JOIN ad_accounts a ON al.account_id = a.id
    WHERE al.created_at >= CURRENT_DATE - ${days}::int
    ORDER BY al.created_at DESC
  `;
  res.json(rows);
});

// GET /api/sync/status — última sincronización
app.get("/api/sync/status", async (_req, res) => {
  const [last] = await sql`SELECT MAX(synced_at) as last_sync FROM metrics_daily`;
  res.json({ lastSync: last?.last_sync, nextSync: "cada hora en punto" });
});

// POST /api/sync/now — forzar sync manual (últimos 3 días)
app.post("/api/sync/now", async (_req, res) => {
  try {
    const { syncMeta } = await import("../jobs/sync-meta.js");
    syncMeta(3).catch(console.error); // async, no esperar
    res.json({ ok: true, message: "Sync iniciado (últimos 3 días)" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-sync cada hora (Meta + Google, últimos 3 días)
cron.schedule("0 * * * *", async () => {
  console.log(`[CRON] Auto-sync iniciado ${new Date().toISOString()}`);
  try {
    const { syncMeta } = await import("../jobs/sync-meta.js");
    await syncMeta(3);
    console.log(`[CRON] Meta sync completado`);
  } catch (err: any) {
    console.error(`[CRON] Error Meta: ${err.message}`);
  }
  try {
    const { syncGoogle } = await import("../jobs/sync-google.js");
    await syncGoogle(3);
    console.log(`[CRON] Google sync completado`);
  } catch (err: any) {
    console.error(`[CRON] Error Google: ${err.message}`);
  }
});

// SPA fallback — must be last
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "../../dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
  console.log(`Auto-sync Meta + Google: cada hora (últimos 3 días)`);
});
