import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { C } from "../lib/theme.js";
import { fmtK, fmt } from "../lib/format.js";
import { api } from "../lib/api.js";
import KpiCard from "../components/KpiCard.js";
import AccountRow from "../components/AccountRow.js";

interface Insight {
  alerts: any[];
  performanceScores: any[];
  weekOverWeek: any;
  topPerformers: any[];
  needsAttention: any[];
}

export default function Dashboard() {
  const [insights, setInsights] = useState<Insight | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState("");
  const [syncing, setSyncing] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.insights(days),
      api.syncStatus(),
    ]).then(([d, s]) => {
      setInsights(d);
      if (s.lastSync) {
        const ago = Math.round((Date.now() - new Date(s.lastSync).getTime()) / 60000);
        setLastSync(ago < 1 ? "ahora" : ago < 60 ? `hace ${ago}m` : `hace ${Math.round(ago / 60)}h`);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(loadData, [days]);

  const forceSync = () => {
    setSyncing(true);
    api.syncNow().then(() => {
      setTimeout(() => { setSyncing(false); loadData(); }, 15000);
    });
  };

  // Render nav-right controls via portal
  const navRight = document.getElementById("nav-right");

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
  const totalConversions = totalLeads + totalChats + totalVentas;
  const avgCPL = totalConversions > 0 ? totalSpendCOP / totalConversions : 0;

  return (
    <>
      {/* Nav right controls via portal */}
      {navRight && createPortal(
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 2, background: "#1a1a26", borderRadius: 8, padding: 3 }}>
            {[{v:1,l:"Hoy"},{v:-1,l:"Ayer"},{v:3,l:"3d"},{v:7,l:"7d"},{v:14,l:"14d"},{v:30,l:"30d"}].map(d => (
              <button key={d.v} onClick={() => setDays(d.v)} style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none",
                background: days === d.v ? "#27272a" : "transparent",
                color: days === d.v ? C.white : C.textSec,
              }}>{d.l}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: C.textMuted }}>Sync: {lastSync}</span>
            <button onClick={forceSync} disabled={syncing} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, border: `1px solid #27272a`,
              background: syncing ? "#1a1a26" : "transparent", color: syncing ? C.textMuted : C.textSec,
            }}>{syncing ? "Sincronizando..." : "\u21BB Sync"}</button>
          </div>
        </div>,
        navRight
      )}

      {/* ALERTAS */}
      {alerts.length > 0 && (
        <div style={{ background: "#1a1520", border: "1px solid #3b2020", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.red, marginBottom: 10 }}>
            {alerts.length} cuenta{alerts.length > 1 ? "s" : ""} necesita{alerts.length > 1 ? "n" : ""} atencion
          </div>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderTop: i > 0 ? "1px solid #2a1a1a" : "none" }}>
              <span style={{ fontSize: 12, marginTop: 2, color: a.severity === "critical" ? C.redSolid : a.severity === "high" ? C.orange : C.yellow }}>{"\u25CF"}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.pink }}>{a.account}</span>
                <span style={{ fontSize: 12, color: "#a8a8b3", marginLeft: 8 }}>{a.message}</span>
                <div style={{ fontSize: 11, color: C.textSec, marginTop: 3 }}>{"\u2192"} {a.suggestion}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Gasto COP" value={fmtK(totalSpendCOP)} change={wow.spendChange} invertColor />
        <KpiCard label="Gasto USD" value={fmt(totalSpendUSD, "USD")} />
        <KpiCard label="Leads" value={String(totalLeads)} change={wow.leadsChange} />
        <KpiCard label="Chats WA" value={String(totalChats)} />
        <KpiCard label="Ventas" value={String(totalVentas)} />
        <KpiCard label="CPL Prom." value={fmtK(avgCPL)} change={wow.cplChange} invertColor />
      </div>

      {/* TABLA PRINCIPAL */}
      <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Rendimiento por cuenta</span>
          <span style={{ fontSize: 11, color: C.textSec }}>{days === 1 ? "Hoy" : days === -1 ? "Ayer" : `Ultimos ${days} dias`} — click para expandir, boton para detalle</span>
        </div>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 80px 80px 80px 60px 80px 70px", gap: 0, padding: "10px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
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
          <AccountRow key={acc.accountId} acc={acc} alerts={insights.alerts} days={days} />
        ))}

        {/* Google section */}
        {googleScores.length > 0 && (
          <>
            <div style={{ padding: "10px 20px", fontSize: 11, color: C.textMuted, borderTop: `1px solid ${C.border}`, background: "#12121a", fontWeight: 600, letterSpacing: "0.05em" }}>
              GOOGLE ADS
            </div>
            {googleScores.map(acc => (
              <AccountRow key={acc.accountId} acc={acc} alerts={insights.alerts} days={days} />
            ))}
          </>
        )}
      </div>
    </>
  );
}

const S = {
  center: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, color: "#71717a", gap: 12 },
  spinner: { width: 28, height: 28, border: "3px solid #27272a", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
};
