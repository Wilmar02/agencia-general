import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, tipoLabel, tipoColor } from "../lib/theme.js";
import { fmtK, fmt, fmtMoney } from "../lib/format.js";
import { api } from "../lib/api.js";
import KpiCard from "../components/KpiCard.js";
import { RefreshCw, ExternalLink, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface Insight {
  alerts: any[];
  performanceScores: any[];
  weekOverWeek: any;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insight | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState("");
  const [syncing, setSyncing] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.insights(days), api.syncStatus()])
      .then(([d, s]) => {
        setInsights(d);
        if (s.lastSync) {
          const ago = Math.round((Date.now() - new Date(s.lastSync).getTime()) / 60000);
          setLastSync(ago < 1 ? "ahora" : ago < 60 ? `hace ${ago}m` : `hace ${Math.round(ago / 60)}h`);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(loadData, [days]);

  const forceSync = () => {
    setSyncing(true);
    api.syncNow().then(() => setTimeout(() => { setSyncing(false); loadData(); }, 15000));
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12 }}>
      <div style={{ width: 28, height: 28, border: "3px solid #27272a", borderTopColor: C.blue, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!insights) return <div style={{ padding: 40, textAlign: "center", color: C.textSec }}>Error cargando datos</div>;

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
  const totalConversions = totalLeads + totalChats + totalVentas;
  const avgCPL = totalConversions > 0 ? totalSpendCOP / totalConversions : 0;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: C.textSec }}>
            {days === 1 ? "Hoy" : days === -1 ? "Ayer" : `Ultimos ${days} dias`} — {scores.length} cuentas activas
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Period selector */}
          <div style={{ display: "flex", gap: 2, background: "#1a1a26", borderRadius: 8, padding: 3 }}>
            {[{v:1,l:"Hoy"},{v:-1,l:"Ayer"},{v:3,l:"3d"},{v:7,l:"7d"},{v:14,l:"14d"},{v:30,l:"30d"}].map(d => (
              <button key={d.v} onClick={() => setDays(d.v)} style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none",
                background: days === d.v ? C.blue : "transparent",
                color: days === d.v ? C.white : C.textSec,
              }}>{d.l}</button>
            ))}
          </div>
          {/* Sync */}
          <button onClick={forceSync} disabled={syncing} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            border: `1px solid ${C.border}`, background: "transparent", color: C.textSec,
          }}>
            <RefreshCw size={14} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
            {syncing ? "Sincronizando..." : `Sync ${lastSync}`}
          </button>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #1a1015, #1a1520)",
          border: "1px solid #3b202080",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}>
          <AlertTriangle size={18} style={{ color: C.red, flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.red, marginBottom: 8 }}>
              {alerts.length} alerta{alerts.length > 1 ? "s" : ""} activa{alerts.length > 1 ? "s" : ""}
            </div>
            {alerts.slice(0, 3).map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: "#ccc", marginBottom: 4 }}>
                <span style={{ color: a.severity === "critical" ? C.redSolid : C.orange, marginRight: 6 }}>{"\u25CF"}</span>
                <strong>{a.account}:</strong> {a.message}
              </div>
            ))}
            {alerts.length > 3 && <div style={{ fontSize: 11, color: C.textSec, marginTop: 4 }}>+{alerts.length - 3} mas</div>}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 28 }}>
        <KpiCard label="Gasto COP" value={fmtK(totalSpendCOP)} change={wow.spendChange} invertColor />
        <KpiCard label="Gasto USD" value={fmt(totalSpendUSD, "USD")} />
        <KpiCard label="Leads" value={String(totalLeads)} change={wow.leadsChange} />
        <KpiCard label="Chats WA" value={String(totalChats)} />
        <KpiCard label="Ventas" value={String(totalVentas)} />
        <KpiCard label="CPL Prom." value={fmtK(avgCPL)} change={wow.cplChange} invertColor />
      </div>

      {/* Account Cards */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Cuentas Meta</h2>
        <span style={{ fontSize: 11, color: C.textSec }}>{metaScores.length} cuentas — click para ver detalle</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320, 1fr))", gap: 14, marginBottom: 28 }}>
        {metaScores.sort((a, b) => b.spend - a.spend).map(acc => (
          <AccountCard key={acc.accountId} acc={acc} alerts={alerts.filter(a => a.accountId === acc.accountId)} onClick={() => navigate(`/account/${acc.accountId}`)} />
        ))}
      </div>

      {/* Google */}
      {googleScores.length > 0 && (
        <>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Cuentas Google</h2>
            <span style={{ fontSize: 11, color: C.textSec }}>{googleScores.length} cuentas</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {googleScores.map(acc => (
              <AccountCard key={acc.accountId} acc={acc} alerts={alerts.filter(a => a.accountId === acc.accountId)} onClick={() => navigate(`/account/${acc.accountId}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AccountCard({ acc, alerts, onClick }: { acc: any; alerts: any[]; onClick: () => void }) {
  const statusColor = acc.score >= 70 ? C.green : acc.score >= 40 ? "#fbbf24" : C.red;
  const statusLabel = acc.score >= 70 ? "Bien" : acc.score >= 40 ? "Regular" : "Mal";
  const s = acc.currency === "USD" ? "US$" : "$";
  const fmtV = (v: number) => acc.currency === "USD" ? v.toFixed(2) : Math.round(v).toLocaleString("es-CO");

  const trendText = acc.trend || "";
  const trendDown = trendText.includes("\u2193");
  const isCPL = trendText.includes("CPL");
  // For CPL: down is good. For Conv/Gasto: up is good
  const trendGood = isCPL ? trendDown : !trendDown;
  const trendColor = trendText.includes("sin datos") ? C.textMuted : trendGood ? C.green : C.red;
  const TrendIcon = trendGood ? TrendingDown : TrendingUp;

  return (
    <div onClick={onClick} style={{
      background: C.card,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
      padding: "18px 20px",
      cursor: "pointer",
      transition: "all 0.15s ease",
      position: "relative",
      overflow: "hidden",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.blue + "60"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.transform = "none"; }}
    >
      {/* Status bar top */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: statusColor, opacity: 0.6 }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{acc.name}</h3>
            <ExternalLink size={12} style={{ color: C.textMuted }} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: (tipoColor[acc.tipo] || "#555") + "20", color: tipoColor[acc.tipo] || "#888", textTransform: "uppercase" }}>
              {tipoLabel[acc.tipo] || acc.tipo}
            </span>
          </div>
        </div>
        {/* Score badge */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: statusColor + "15",
            border: `2px solid ${statusColor}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: statusColor,
          }}>
            {acc.score}
          </div>
          <div style={{ fontSize: 9, color: statusColor, marginTop: 3, fontWeight: 600 }}>{statusLabel}</div>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>{acc.spend > 0 ? `${s}${fmtV(acc.spend)}` : "\u2014"}</div>
          <div style={{ fontSize: 10, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.04em" }}>Gasto</div>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: acc.conversions > 0 ? C.white : C.textMuted }}>{acc.conversions > 0 ? acc.conversions : "\u2014"}</div>
          <div style={{ fontSize: 10, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.04em" }}>{tipoLabel[acc.tipo] || "Conv."}</div>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: acc.conversions > 0 ? C.white : C.textMuted }}>{acc.conversions > 0 ? `${s}${fmtV(acc.costPerConv)}` : "\u2014"}</div>
          <div style={{ fontSize: 10, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.04em" }}>Costo</div>
        </div>
      </div>

      {/* Bottom: trend + alerts */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!trendText.includes("sin datos") && <TrendIcon size={14} style={{ color: trendColor }} />}
          <span style={{ fontSize: 12, fontWeight: 500, color: trendColor }}>
            {trendText.replace("CPL ", "").replace("\u2191", "\u25B2 ").replace("\u2193", "\u25BC ")}
          </span>
        </div>
        {alerts.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={12} style={{ color: alerts[0].severity === "critical" ? C.red : C.orange }} />
            <span style={{ fontSize: 11, color: C.orange }}>{alerts.length} alerta{alerts.length > 1 ? "s" : ""}</span>
          </div>
        )}
        {acc.ctr > 0 && (
          <span style={{ fontSize: 11, color: C.textSec }}>CTR {acc.ctr.toFixed(1)}%</span>
        )}
      </div>
    </div>
  );
}
