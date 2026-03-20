import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, tipoLabel, tipoColor } from "../lib/theme.js";
import { fmtK, fmt, fmtMoney } from "../lib/format.js";
import { api } from "../lib/api.js";
import KpiCard from "../components/KpiCard.js";
import { RefreshCw, ExternalLink, TrendingUp, TrendingDown, AlertTriangle, MessageCircle, Users, ShoppingCart, LayoutGrid, Zap, AlertOctagon } from "lucide-react";

interface Insight {
  alerts: any[];
  performanceScores: any[];
  weekOverWeek: any;
}

type FilterType = "all" | "whatsapp" | "leads" | "ventas";

const filterConfig: { key: FilterType; label: string; icon: any; color: string }[] = [
  { key: "all", label: "Todas", icon: LayoutGrid, color: C.white },
  { key: "leads", label: "Leads", icon: Users, color: "#3b82f6" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#22c55e" },
  { key: "ventas", label: "Ecommerce", icon: ShoppingCart, color: "#a855f7" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insight | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

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

  // Filter scores by tipo
  const filtered = filter === "all" ? scores.filter(s => s.spend > 0) : scores.filter(s => s.tipo === filter && s.spend > 0);
  const metaFiltered = filtered.filter(s => s.platform === "meta");
  const googleFiltered = filtered.filter(s => s.platform === "google");

  // Compute KPIs based on filter
  const totalSpend = filtered.reduce((a, s) => a + s.spend, 0);
  const totalConv = filtered.reduce((a, s) => a + s.conversions, 0);
  const avgCPL = totalConv > 0 ? totalSpend / totalConv : 0;
  const totalSpendCOP = filtered.filter(s => s.currency === "COP").reduce((a, s) => a + s.spend, 0);
  const totalSpendUSD = filtered.filter(s => s.currency === "USD").reduce((a, s) => a + s.spend, 0);

  // Tipo-specific totals for "all" view
  const totalLeads = scores.filter(s => s.tipo === "leads").reduce((a, s) => a + s.conversions, 0);
  const totalChats = scores.filter(s => s.tipo === "whatsapp").reduce((a, s) => a + s.conversions, 0);
  const totalVentas = scores.filter(s => s.tipo === "ventas").reduce((a, s) => a + s.conversions, 0);

  // Top & bottom performers
  const sorted = [...filtered].sort((a, b) => b.score - a.score);
  const topPerformers = sorted.filter(s => s.score >= 70);
  const needsAttention = sorted.filter(s => s.score < 70 || alerts.some(a => a.accountId === s.accountId));

  // Filtered alerts
  const filteredAlerts = filter === "all" ? alerts : alerts.filter(a => {
    const acc = scores.find(s => s.accountId === a.accountId);
    return acc && acc.tipo === filter;
  });

  // Conversion label based on filter
  const convLabel = filter === "whatsapp" ? "Chats" : filter === "ventas" ? "Ventas" : filter === "leads" ? "Leads" : "Conversiones";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: C.textSec }}>
            {days === 1 ? "Hoy" : days === -1 ? "Ayer" : `Ultimos ${days} dias`} — {filtered.length} cuenta{filtered.length !== 1 ? "s" : ""} activa{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 2, background: "#1a1a26", borderRadius: 8, padding: 3 }}>
            {[{v:1,l:"Hoy"},{v:-1,l:"Ayer"},{v:3,l:"3d"},{v:7,l:"7d"},{v:14,l:"14d"},{v:30,l:"30d"}].map(d => (
              <button key={d.v} onClick={() => setDays(d.v)} style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none",
                background: days === d.v ? C.blue : "transparent",
                color: days === d.v ? C.white : C.textSec,
              }}>{d.l}</button>
            ))}
          </div>
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

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {filterConfig.map(f => {
          const Icon = f.icon;
          const active = filter === f.key;
          const count = f.key === "all" ? scores.filter(s => s.spend > 0).length : scores.filter(s => s.tipo === f.key && s.spend > 0).length;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: active ? `2px solid ${f.color}` : `1px solid ${C.border}`,
              background: active ? f.color + "12" : C.card,
              color: active ? f.color : C.textSec,
              transition: "all 0.15s ease",
            }}>
              <Icon size={16} />
              {f.label}
              <span style={{
                fontSize: 11, fontWeight: 700,
                padding: "1px 7px", borderRadius: 10,
                background: active ? f.color + "25" : C.border,
                color: active ? f.color : C.textMuted,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Alerts Banner */}
      {filteredAlerts.length > 0 && (
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
              {filteredAlerts.length} alerta{filteredAlerts.length > 1 ? "s" : ""} activa{filteredAlerts.length > 1 ? "s" : ""}
            </div>
            {filteredAlerts.slice(0, 4).map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: "#ccc", marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span style={{ color: a.severity === "critical" ? C.redSolid : C.orange, marginTop: 2 }}>{"\u25CF"}</span>
                <div>
                  <strong>{a.account}:</strong> {a.message}
                  <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{"\u2192"} {a.suggestion}</div>
                </div>
              </div>
            ))}
            {filteredAlerts.length > 4 && <div style={{ fontSize: 11, color: C.textSec, marginTop: 4 }}>+{filteredAlerts.length - 4} mas</div>}
          </div>
        </div>
      )}

      {/* KPIs - context-aware based on filter */}
      <div style={{ display: "grid", gridTemplateColumns: filter === "all" ? "repeat(6, 1fr)" : "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
        {filter === "all" ? (
          <>
            <KpiCard label="Gasto COP" value={fmtK(totalSpendCOP)} change={wow.spendChange} invertColor />
            <KpiCard label="Gasto USD" value={fmt(totalSpendUSD, "USD")} />
            <KpiCard label="Leads" value={String(totalLeads)} change={wow.leadsChange} />
            <KpiCard label="Chats WA" value={String(totalChats)} />
            <KpiCard label="Ventas" value={String(totalVentas)} />
            <KpiCard label="CPL Prom." value={fmtK(avgCPL)} change={wow.cplChange} invertColor />
          </>
        ) : filter === "ventas" ? (
          <>
            <KpiCard label="Gasto Total" value={fmtK(totalSpend, filtered[0]?.currency)} change={wow.spendChange} invertColor />
            <KpiCard label="Ventas" value={String(totalConv)} />
            <KpiCard label="Costo/Venta" value={totalConv > 0 ? fmtK(avgCPL, filtered[0]?.currency) : "\u2014"} invertColor />
            <KpiCard label="ROAS Prom." value={totalConv > 0 ? `${(filtered.reduce((a, s) => a + s.roas, 0) / filtered.length).toFixed(1)}x` : "\u2014"} />
            <KpiCard label="Inversion" value={`${filtered.length} cuenta${filtered.length > 1 ? "s" : ""}`} />
          </>
        ) : filter === "whatsapp" ? (
          <>
            <KpiCard label="Gasto Total" value={fmtK(totalSpend, filtered[0]?.currency)} change={wow.spendChange} invertColor />
            <KpiCard label="Chats Iniciados" value={String(totalConv)} />
            <KpiCard label="Costo/Chat" value={totalConv > 0 ? fmtK(avgCPL, filtered[0]?.currency) : "\u2014"} invertColor />
            <KpiCard label="CTR Prom." value={`${(filtered.reduce((a, s) => a + s.ctr, 0) / Math.max(filtered.length, 1)).toFixed(1)}%`} />
            <KpiCard label="Cuentas" value={String(filtered.length)} />
          </>
        ) : (
          <>
            <KpiCard label="Gasto Total" value={fmtK(totalSpend, filtered[0]?.currency)} change={wow.spendChange} invertColor />
            <KpiCard label="Leads" value={String(totalConv)} change={wow.leadsChange} />
            <KpiCard label="CPL" value={totalConv > 0 ? fmtK(avgCPL, filtered[0]?.currency) : "\u2014"} change={wow.cplChange} invertColor />
            <KpiCard label="CTR Prom." value={`${(filtered.reduce((a, s) => a + s.ctr, 0) / Math.max(filtered.length, 1)).toFixed(1)}%`} />
            <KpiCard label="Cuentas" value={String(filtered.length)} />
          </>
        )}
      </div>

      {/* Quick Summary: Top vs Needs Attention */}
      {filtered.length > 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          {/* Top Performers */}
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Zap size={16} style={{ color: C.green }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Top Performers</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>Score 70+</span>
            </div>
            {topPerformers.length === 0 ? (
              <div style={{ fontSize: 12, color: C.textSec }}>Ninguna cuenta supera el umbral</div>
            ) : topPerformers.slice(0, 4).map(acc => (
              <div key={acc.accountId} onClick={() => navigate(`/account/${acc.accountId}`)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{acc.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: C.textSec }}>{fmtMoney(acc.costPerConv, acc.currency)}/{convLabel.slice(0, -1) || "conv"}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{acc.score}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Needs Attention */}
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <AlertOctagon size={16} style={{ color: C.orange }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>Necesitan atencion</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>Score &lt;70 o con alertas</span>
            </div>
            {needsAttention.length === 0 ? (
              <div style={{ fontSize: 12, color: C.green }}>Todas las cuentas estan bien</div>
            ) : needsAttention.slice(0, 4).map(acc => {
              const accAlerts = alerts.filter(a => a.accountId === acc.accountId);
              return (
                <div key={acc.accountId} onClick={() => navigate(`/account/${acc.accountId}`)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: acc.score < 40 ? C.red : C.orange }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{acc.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {accAlerts.length > 0 && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.red + "15", color: C.red, fontWeight: 600 }}>
                        {accAlerts.length} alerta{accAlerts.length > 1 ? "s" : ""}
                      </span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: acc.score < 40 ? C.red : C.orange }}>{acc.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account Cards - Meta */}
      {metaFiltered.length > 0 && (
        <>
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
              Meta Ads
            </h2>
            <span style={{ fontSize: 11, color: C.textSec }}>{metaFiltered.length} cuentas</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14, marginBottom: 28 }}>
            {metaFiltered.sort((a, b) => b.spend - a.spend).map(acc => (
              <AccountCard key={acc.accountId} acc={acc} alerts={alerts.filter(a => a.accountId === acc.accountId)} onClick={() => navigate(`/account/${acc.accountId}`)} convLabel={convLabel} />
            ))}
          </div>
        </>
      )}

      {/* Account Cards - Google */}
      {googleFiltered.length > 0 && (
        <>
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#eab308" }} />
              Google Ads
            </h2>
            <span style={{ fontSize: 11, color: C.textSec }}>{googleFiltered.length} cuentas</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14, marginBottom: 28 }}>
            {googleFiltered.map(acc => (
              <AccountCard key={acc.accountId} acc={acc} alerts={alerts.filter(a => a.accountId === acc.accountId)} onClick={() => navigate(`/account/${acc.accountId}`)} convLabel={convLabel} />
            ))}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: C.textSec, fontSize: 14 }}>
          No hay cuentas de tipo "{filterConfig.find(f => f.key === filter)?.label}" con gasto en este periodo
        </div>
      )}
    </div>
  );
}

function AccountCard({ acc, alerts, onClick, convLabel }: { acc: any; alerts: any[]; onClick: () => void; convLabel: string }) {
  const statusColor = acc.score >= 70 ? C.green : acc.score >= 40 ? "#fbbf24" : C.red;
  const statusLabel = acc.score >= 70 ? "Saludable" : acc.score >= 40 ? "Revisar" : "Critico";
  const s = acc.currency === "USD" ? "US$" : "$";
  const fmtV = (v: number) => acc.currency === "USD" ? v.toFixed(2) : Math.round(v).toLocaleString("es-CO");

  const trendText = acc.trend || "";
  const trendDown = trendText.includes("\u2193");
  const isCPL = trendText.includes("CPL");
  const trendGood = isCPL ? trendDown : !trendDown;
  const trendColor = trendText.includes("sin datos") ? C.textMuted : trendGood ? C.green : C.red;
  const TrendIcon = trendGood ? TrendingDown : TrendingUp;

  // Optimization signals
  const signals: { label: string; color: string }[] = [];
  if (acc.ctr < 0.8 && acc.spend > 0) signals.push({ label: "CTR bajo", color: "#fbbf24" });
  if (acc.conversions === 0 && acc.spend > 0) signals.push({ label: "Sin conversiones", color: C.red });

  return (
    <div onClick={onClick} style={{
      background: C.card,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
      padding: 0,
      cursor: "pointer",
      transition: "all 0.15s ease",
      overflow: "hidden",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.blue + "60"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.transform = "none"; }}
    >
      {/* Color bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${statusColor}, ${statusColor}80)` }} />

      <div style={{ padding: "16px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc.name}</h3>
              <ExternalLink size={12} style={{ color: C.textMuted, flexShrink: 0 }} />
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: (tipoColor[acc.tipo] || "#555") + "20", color: tipoColor[acc.tipo] || "#888", textTransform: "uppercase" }}>
                {tipoLabel[acc.tipo] || acc.tipo}
              </span>
              {signals.map((sig, i) => (
                <span key={i} style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: sig.color + "15", color: sig.color, textTransform: "uppercase" }}>
                  {sig.label}
                </span>
              ))}
            </div>
          </div>
          {/* Score */}
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: statusColor + "12",
              border: `2px solid ${statusColor}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, fontWeight: 700, color: statusColor,
            }}>
              {acc.score}
            </div>
            <div style={{ fontSize: 9, color: statusColor, marginTop: 3, fontWeight: 600 }}>{statusLabel}</div>
          </div>
        </div>

        {/* Main metric - big number */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.white, letterSpacing: "-0.02em" }}>
            {acc.spend > 0 ? `${s}${fmtV(acc.spend)}` : "\u2014"}
          </div>
          <div style={{ fontSize: 11, color: C.textSec }}>invertido en el periodo</div>
        </div>

        {/* Secondary metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: acc.conversions > 0 ? C.white : C.textMuted }}>{acc.conversions > 0 ? acc.conversions : "\u2014"}</div>
            <div style={{ fontSize: 10, color: C.textSec }}>{convLabel}</div>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: acc.conversions > 0 ? C.white : C.textMuted }}>{acc.conversions > 0 ? `${s}${fmtV(acc.costPerConv)}` : "\u2014"}</div>
            <div style={{ fontSize: 10, color: C.textSec }}>Costo/{convLabel.slice(0, -1) || "conv"}</div>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>
              {acc.tipo === "ventas" && acc.roas > 0 ? `${acc.roas.toFixed(1)}x` : acc.ctr > 0 ? `${acc.ctr.toFixed(1)}%` : "\u2014"}
            </div>
            <div style={{ fontSize: 10, color: C.textSec }}>{acc.tipo === "ventas" ? "ROAS" : "CTR"}</div>
          </div>
        </div>

        {/* Footer: trend + alerts */}
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
        </div>
      </div>
    </div>
  );
}
