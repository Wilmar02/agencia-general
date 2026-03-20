import { useState, useEffect } from "react";
import Billing from "./pages/Billing.js";

interface Insight {
  alerts: any[];
  performanceScores: any[];
  weekOverWeek: any;
  topPerformers: any[];
  needsAttention: any[];
}

const fmt = (v: number, cur = "COP") => {
  if (cur === "USD") return `US$${v.toFixed(2)}`;
  return `$${Math.round(v).toLocaleString("es-CO")}`;
};

const fmtK = (v: number, cur = "COP") => {
  if (cur === "USD") return `US$${v.toFixed(2)}`;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${Math.round(v).toLocaleString("es-CO")}`;
};

export default function App() {
  const [page, setPage] = useState<"ads" | "billing">("ads");
  const [insights, setInsights] = useState<Insight | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/insights?days=${days}`)
      .then(r => r.json())
      .then(d => { setInsights(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  if (loading) return (
    <div style={S.center}>
      <div style={S.spinner} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!insights) return <div style={S.center}>Error cargando datos</div>;

  const wow = insights.weekOverWeek;
  const scores = insights.performanceScores;
  const alerts = insights.alerts.filter(a => a.severity !== "info");
  const metaScores = scores.filter(s => s.platform === "meta" && s.spend > 0);
  const googleScores = scores.filter(s => s.platform === "google");

  const totalSpendCOP = scores.filter(s => s.currency === "COP").reduce((a, s) => a + s.spend, 0);
  const totalSpendUSD = scores.filter(s => s.currency === "USD").reduce((a, s) => a + s.spend, 0);
  const totalLeads = scores.filter(s => s.tipo === "leads").reduce((a, s) => a + s.conversions, 0);
  const totalChats = scores.filter(s => s.tipo === "whatsapp").reduce((a, s) => a + s.conversions, 0);
  const totalVentas = scores.filter(s => s.tipo === "ventas").reduce((a, s) => a + s.conversions, 0);

  return (
    <div style={{ background: "#0f1117", minHeight: "100vh", color: "#e4e4e7", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* NAV */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", borderBottom: "1px solid #1c1c28" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Agencia General</span>
          <div style={{ display: "flex", gap: 2, background: "#1a1a26", borderRadius: 8, padding: 3 }}>
            {(["ads", "billing"] as const).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{
                padding: "7px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, border: "none",
                background: page === p ? "#2563eb" : "transparent",
                color: page === p ? "#fff" : "#71717a",
              }}>
                {p === "ads" ? "Ads" : "Facturacion"}
              </button>
            ))}
          </div>
        </div>
        {page === "ads" && (
          <div style={{ display: "flex", gap: 2, background: "#1a1a26", borderRadius: 8, padding: 3 }}>
            {[{v:1,l:"Hoy"},{v:3,l:"3d"},{v:7,l:"7d"},{v:14,l:"14d"},{v:30,l:"30d"}].map(d => (
              <button key={d.v} onClick={() => setDays(d.v)} style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none",
                background: days === d.v ? "#27272a" : "transparent",
                color: days === d.v ? "#fff" : "#71717a",
              }}>{d.l}</button>
            ))}
          </div>
        )}
      </nav>

      {page === "billing" && <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}><Billing /></div>}

      {page === "ads" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 28px" }}>

          {/* ALERTAS */}
          {alerts.length > 0 && (
            <div style={{ background: "#1a1520", border: "1px solid #3b2020", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f87171", marginBottom: 10 }}>
                {alerts.length} cuenta{alerts.length > 1 ? "s" : ""} necesita{alerts.length > 1 ? "n" : ""} atencion
              </div>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderTop: i > 0 ? "1px solid #2a1a1a" : "none" }}>
                  <span style={{ fontSize: 12, marginTop: 2, color: a.severity === "critical" ? "#ef4444" : a.severity === "high" ? "#f97316" : "#eab308" }}>●</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5" }}>{a.account}</span>
                    <span style={{ fontSize: 12, color: "#a8a8b3", marginLeft: 8 }}>{a.message}</span>
                    <div style={{ fontSize: 11, color: "#71717a", marginTop: 3 }}>→ {a.suggestion}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
            <KPI label="Gasto COP" value={fmtK(totalSpendCOP)} change={wow.spendChange} invertColor />
            <KPI label="Gasto USD" value={fmt(totalSpendUSD, "USD")} />
            <KPI label="Leads" value={String(totalLeads)} change={wow.leadsChange} />
            <KPI label="Chats WA" value={String(totalChats)} />
            <KPI label="Ventas" value={String(totalVentas)} />
          </div>

          {/* TABLA PRINCIPAL */}
          <div style={{ background: "#16161e", borderRadius: 10, border: "1px solid #1c1c28", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #1c1c28", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Rendimiento por cuenta</span>
              <span style={{ fontSize: 11, color: "#71717a" }}>{days === 1 ? "Hoy" : `Ultimos ${days} dias`} — click para ver detalle</span>
            </div>

            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 80px 80px 80px 60px 80px 70px", gap: 0, padding: "10px 20px", borderBottom: "1px solid #1c1c28", fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              <span></span>
              <span>Cuenta</span>
              <span style={{ textAlign: "right" }}>Gasto</span>
              <span style={{ textAlign: "right" }}>Conv.</span>
              <span style={{ textAlign: "right" }}>Costo/Conv</span>
              <span style={{ textAlign: "right" }}>CTR</span>
              <span style={{ textAlign: "right" }}>Tendencia</span>
              <span style={{ textAlign: "center" }}>Score</span>
            </div>

            {/* Meta rows */}
            {metaScores.sort((a, b) => b.spend - a.spend).map(acc => (
              <AccountRow key={acc.accountId} acc={acc} expanded={expandedRow === acc.accountId}
                onToggle={() => setExpandedRow(expandedRow === acc.accountId ? null : acc.accountId)}
                alerts={insights.alerts.filter(a => a.accountId === acc.accountId)} days={days} />
            ))}

            {/* Google section */}
            {googleScores.length > 0 && (
              <>
                <div style={{ padding: "10px 20px", fontSize: 11, color: "#52525b", borderTop: "1px solid #1c1c28", background: "#12121a", fontWeight: 600, letterSpacing: "0.05em" }}>
                  GOOGLE ADS
                </div>
                {googleScores.map(acc => (
                  <AccountRow key={acc.accountId} acc={acc} expanded={expandedRow === acc.accountId}
                    onToggle={() => setExpandedRow(expandedRow === acc.accountId ? null : acc.accountId)}
                    alerts={insights.alerts.filter(a => a.accountId === acc.accountId)} days={days} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, change, invertColor }: { label: string; value: string; change?: string; invertColor?: boolean }) {
  const isNeg = change?.startsWith("-");
  const isGood = invertColor ? isNeg : !isNeg;
  const changeColor = !change ? "#52525b" : isGood ? "#4ade80" : "#f87171";
  return (
    <div style={{ background: "#16161e", borderRadius: 10, border: "1px solid #1c1c28", padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{value}</span>
        {change && <span style={{ fontSize: 12, fontWeight: 500, color: changeColor }}>{change}</span>}
      </div>
    </div>
  );
}

function AccountRow({ acc, expanded, onToggle, alerts, days }: { acc: any; expanded: boolean; onToggle: () => void; alerts: any[]; days: number }) {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    if (expanded) {
      if (metrics.length === 0) fetch(`/api/metrics/${acc.accountId}?days=${days}`).then(r => r.json()).then(setMetrics);
      fetch(`/api/campaigns/${acc.accountId}?days=${days}`).then(r => r.json()).then(setCampaigns);
    }
  }, [expanded, days]);

  const s = acc.currency === "USD" ? "US$" : "$";
  const fmtV = (v: number) => acc.currency === "USD" ? v.toFixed(2) : Math.round(v).toLocaleString("es-CO");

  const statusColor = acc.score >= 70 ? "#4ade80" : acc.score >= 40 ? "#fbbf24" : "#f87171";
  const tipoLabel: Record<string, string> = { leads: "Leads", whatsapp: "Chats", ventas: "Ventas" };
  const tipoColor: Record<string, string> = { leads: "#3b82f6", whatsapp: "#22c55e", ventas: "#a855f7" };

  const trendText = acc.trend || "";
  const trendUp = trendText.includes("\u2191");
  const trendColor = trendText.includes("sin datos") ? "#52525b" : trendUp ? "#f87171" : "#4ade80";

  return (
    <>
      <div onClick={onToggle} style={{
        display: "grid", gridTemplateColumns: "28px 1fr 80px 80px 80px 60px 80px 70px",
        gap: 0, padding: "12px 20px", borderBottom: "1px solid #1c1c28", cursor: "pointer",
        fontSize: 13, alignItems: "center", background: expanded ? "#1a1a26" : "transparent", transition: "background 0.1s",
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
        <div>
          <span style={{ fontWeight: 500, color: "#e4e4e7" }}>{acc.name}</span>
          <span style={{ fontSize: 9, fontWeight: 600, marginLeft: 8, padding: "2px 6px", borderRadius: 3, background: (tipoColor[acc.tipo] || "#555") + "20", color: tipoColor[acc.tipo] || "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {tipoLabel[acc.tipo] || acc.tipo}
          </span>
        </div>
        <span style={{ textAlign: "right", fontWeight: 600, color: "#e4e4e7" }}>{acc.spend > 0 ? `${s}${fmtV(acc.spend)}` : "—"}</span>
        <span style={{ textAlign: "right", fontWeight: 600, color: acc.conversions > 0 ? "#fff" : "#52525b" }}>{acc.conversions > 0 ? acc.conversions : "—"}</span>
        <span style={{ textAlign: "right", color: "#a1a1aa" }}>{acc.conversions > 0 ? `${s}${fmtV(acc.costPerConv)}` : "—"}</span>
        <span style={{ textAlign: "right", color: "#a1a1aa" }}>{acc.ctr > 0 ? `${acc.ctr.toFixed(1)}%` : "—"}</span>
        <span style={{ textAlign: "right", fontSize: 11, fontWeight: 500, color: trendColor }}>
          {trendText.replace("CPL ", "").replace("\u2191", "\u25B2 ").replace("\u2193", "\u25BC ")}
        </span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: "#27272a", overflow: "hidden" }}>
            <div style={{ width: `${acc.score}%`, height: "100%", borderRadius: 3, background: statusColor }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, minWidth: 20, textAlign: "right" }}>{acc.score}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderBottom: "1px solid #1c1c28", background: "#12121a" }}>
          {/* Chart + Diagnostics */}
          <div style={{ padding: "16px 20px 12px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8, fontWeight: 600 }}>GASTO DIARIO</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 50 }}>
                {metrics.map((m, i) => {
                  const maxSpend = Math.max(...metrics.map(x => Number(x.spend)), 1);
                  const h = (Number(m.spend) / maxSpend) * 50;
                  return <div key={i} title={`${m.date}: ${s}${fmtV(Number(m.spend))}`} style={{
                    flex: 1, height: Math.max(h, 2), background: tipoColor[acc.tipo] || "#3b82f6",
                    borderRadius: "2px 2px 0 0", opacity: 0.7,
                  }} />;
                })}
              </div>
              {metrics.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#52525b", marginTop: 4 }}>
                  <span>{metrics[0]?.date?.slice(5)}</span>
                  <span>{metrics[metrics.length - 1]?.date?.slice(5)}</span>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8, fontWeight: 600 }}>DIAGNOSTICO</div>
              {alerts.length > 0 ? alerts.map((a, i) => (
                <div key={i} style={{ fontSize: 12, marginBottom: 8 }}>
                  <div style={{ color: a.severity === "critical" ? "#ef4444" : a.severity === "high" ? "#f97316" : "#eab308" }}>● {a.message}</div>
                  <div style={{ color: "#71717a", fontSize: 11, marginTop: 2 }}>→ {a.suggestion}</div>
                </div>
              )) : (
                <div style={{ fontSize: 12, color: "#4ade80" }}>✓ Cuenta funcionando bien</div>
              )}
            </div>
          </div>

          {/* Campaigns table */}
          {campaigns.length > 0 && (
            <div style={{ padding: "0 20px 16px 48px" }}>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8, fontWeight: 600 }}>CAMPAÑAS ({campaigns.length})</div>
              <div style={{ border: "1px solid #1c1c28", borderRadius: 8, overflow: "hidden" }}>
                {/* Campaign header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 55px 70px 50px", gap: 0, padding: "6px 12px", background: "#16161e", fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  <span>Campaña</span>
                  <span style={{ textAlign: "right" }}>Gasto</span>
                  <span style={{ textAlign: "right" }}>Conv.</span>
                  <span style={{ textAlign: "right" }}>Costo</span>
                  <span style={{ textAlign: "right" }}>CTR</span>
                </div>
                {campaigns.map((camp, i) => {
                  const cSpend = Number(camp.spend);
                  const cConv = Number(camp.conversions);
                  const cCost = Number(camp.cost_per_conv);
                  const cCtr = Number(camp.ctr);
                  // Color code cost per conv
                  const threshold = acc.tipo === "whatsapp" ? 12000 : acc.tipo === "ventas" ? 50000 : 25000;
                  const thresholdUSD = acc.tipo === "whatsapp" ? 5 : 8;
                  const limit = acc.currency === "USD" ? thresholdUSD : threshold;
                  const costColor = cConv === 0 ? "#52525b" : cCost > limit ? "#f87171" : cCost > limit * 0.7 ? "#fbbf24" : "#4ade80";

                  return (
                    <div key={i} style={{
                      display: "grid", gridTemplateColumns: "1fr 70px 55px 70px 50px",
                      gap: 0, padding: "8px 12px", borderTop: "1px solid #1c1c28", fontSize: 12, alignItems: "center",
                    }}>
                      <span style={{ color: "#c0c0d0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }} title={camp.campaign_name}>
                        {camp.campaign_name}
                      </span>
                      <span style={{ textAlign: "right", fontWeight: 500, color: "#e4e4e7" }}>{s}{fmtV(cSpend)}</span>
                      <span style={{ textAlign: "right", fontWeight: 600, color: cConv > 0 ? "#fff" : "#52525b" }}>{cConv || "—"}</span>
                      <span style={{ textAlign: "right", color: costColor, fontWeight: 500 }}>{cConv > 0 ? `${s}${fmtV(cCost)}` : "—"}</span>
                      <span style={{ textAlign: "right", color: "#71717a" }}>{cCtr > 0 ? `${cCtr.toFixed(1)}%` : "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

const S = {
  center: { minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, color: "#71717a", gap: 12 },
  spinner: { width: 28, height: 28, border: "3px solid #27272a", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
};
