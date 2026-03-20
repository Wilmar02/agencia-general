import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, tipoLabel, tipoColor } from "../lib/theme.js";
import { api } from "../lib/api.js";

interface Props {
  acc: any;
  alerts: any[];
  days: number;
}

export default function AccountRow({ acc, alerts, days }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    if (expanded) {
      if (metrics.length === 0) api.metrics(acc.accountId, days).then(setMetrics);
      api.campaigns(acc.accountId, days).then(setCampaigns);
    }
  }, [expanded, days]);

  const s = acc.currency === "USD" ? "US$" : "$";
  const fmtV = (v: number) => acc.currency === "USD" ? v.toFixed(2) : Math.round(v).toLocaleString("es-CO");

  const statusColor = acc.score >= 70 ? C.green : acc.score >= 40 ? "#fbbf24" : C.red;
  const trendText = acc.trend || "";
  const trendUp = trendText.includes("\u2191");
  const trendColor = trendText.includes("sin datos") ? C.textMuted : trendUp ? C.red : C.green;

  const accountAlerts = alerts.filter(a => a.accountId === acc.accountId);

  return (
    <>
      <div onClick={() => setExpanded(!expanded)} style={{
        display: "grid", gridTemplateColumns: "28px 1fr 80px 80px 80px 60px 80px 70px",
        gap: 0, padding: "12px 20px", borderBottom: `1px solid ${C.border}`, cursor: "pointer",
        fontSize: 13, alignItems: "center", background: expanded ? C.cardHover : "transparent", transition: "background 0.1s",
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
        <div>
          <span style={{ fontWeight: 500, color: C.text }}>{acc.name}</span>
          <span style={{ fontSize: 9, fontWeight: 600, marginLeft: 8, padding: "2px 6px", borderRadius: 3, background: (tipoColor[acc.tipo] || "#555") + "20", color: tipoColor[acc.tipo] || "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {tipoLabel[acc.tipo] || acc.tipo}
          </span>
        </div>
        <span style={{ textAlign: "right", fontWeight: 600, color: C.text }}>{acc.spend > 0 ? `${s}${fmtV(acc.spend)}` : "\u2014"}</span>
        <span style={{ textAlign: "right", fontWeight: 600, color: acc.conversions > 0 ? C.white : C.textMuted }}>{acc.conversions > 0 ? acc.conversions : "\u2014"}</span>
        <span style={{ textAlign: "right", color: "#a1a1aa" }}>{acc.conversions > 0 ? `${s}${fmtV(acc.costPerConv)}` : "\u2014"}</span>
        <span style={{ textAlign: "right", color: "#a1a1aa" }}>{acc.ctr > 0 ? `${acc.ctr.toFixed(1)}%` : "\u2014"}</span>
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
        <div style={{ borderBottom: `1px solid ${C.border}`, background: "#12121a" }}>
          {/* Chart + Diagnostics */}
          <div style={{ padding: "16px 20px 12px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: C.textSec, marginBottom: 8, fontWeight: 600 }}>GASTO DIARIO</div>
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
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textMuted, marginTop: 4 }}>
                  <span>{metrics[0]?.date?.slice(5)}</span>
                  <span>{metrics[metrics.length - 1]?.date?.slice(5)}</span>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.textSec, marginBottom: 8, fontWeight: 600 }}>DIAGNOSTICO</div>
              {accountAlerts.length > 0 ? accountAlerts.map((a, i) => (
                <div key={i} style={{ fontSize: 12, marginBottom: 8 }}>
                  <div style={{ color: a.severity === "critical" ? C.redSolid : a.severity === "high" ? C.orange : C.yellow }}>
                    \u25CF {a.message}
                  </div>
                  <div style={{ color: C.textSec, fontSize: 11, marginTop: 2 }}>\u2192 {a.suggestion}</div>
                </div>
              )) : (
                <div style={{ fontSize: 12, color: C.green }}>\u2713 Cuenta funcionando bien</div>
              )}
            </div>
          </div>

          {/* Campaigns table */}
          {campaigns.length > 0 && (
            <div style={{ padding: "0 20px 16px 48px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: C.textSec, fontWeight: 600 }}>CAMPANAS ({campaigns.length})</div>
                <button onClick={(e) => { e.stopPropagation(); navigate(`/account/${acc.accountId}`); }} style={{
                  padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                  background: C.blue, color: C.white,
                }}>
                  Ver detalle completo \u2192
                </button>
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 55px 70px 50px 60px 55px 55px", gap: 0, padding: "6px 12px", background: C.card, fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  <span>Campana</span>
                  <span style={{ textAlign: "right" }}>Gasto</span>
                  <span style={{ textAlign: "right" }}>Conv.</span>
                  <span style={{ textAlign: "right" }}>Costo</span>
                  <span style={{ textAlign: "right" }}>CTR</span>
                  <span style={{ textAlign: "right" }}>Alcance</span>
                  <span style={{ textAlign: "right" }}>CPM</span>
                  <span style={{ textAlign: "right" }}>Freq.</span>
                </div>
                {campaigns.slice(0, 8).map((camp, i) => {
                  const cSpend = Number(camp.spend);
                  const cConv = Number(camp.conversions);
                  const cCost = Number(camp.cost_per_conv);
                  const cCtr = Number(camp.ctr);
                  const cReach = Number(camp.reach) || 0;
                  const cCpm = Number(camp.cpm) || 0;
                  const cFreq = Number(camp.frequency) || 0;
                  const threshold = acc.tipo === "whatsapp" ? 12000 : acc.tipo === "ventas" ? 50000 : 25000;
                  const thresholdUSD = acc.tipo === "whatsapp" ? 5 : 8;
                  const limit = acc.currency === "USD" ? thresholdUSD : threshold;
                  const costColor = cConv === 0 ? C.textMuted : cCost > limit ? C.red : cCost > limit * 0.7 ? "#fbbf24" : C.green;
                  const freqColor = cFreq > 3 ? C.red : cFreq > 2 ? "#fbbf24" : C.textSec;

                  return (
                    <div key={i} style={{
                      display: "grid", gridTemplateColumns: "1fr 70px 55px 70px 50px 60px 55px 55px",
                      gap: 0, padding: "8px 12px", borderTop: `1px solid ${C.border}`, fontSize: 12, alignItems: "center",
                    }}>
                      <span style={{ color: "#c0c0d0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }} title={camp.campaign_name}>
                        {camp.campaign_name}
                      </span>
                      <span style={{ textAlign: "right", fontWeight: 500, color: C.text }}>{s}{fmtV(cSpend)}</span>
                      <span style={{ textAlign: "right", fontWeight: 600, color: cConv > 0 ? C.white : C.textMuted }}>{cConv || "\u2014"}</span>
                      <span style={{ textAlign: "right", color: costColor, fontWeight: 500 }}>{cConv > 0 ? `${s}${fmtV(cCost)}` : "\u2014"}</span>
                      <span style={{ textAlign: "right", color: C.textSec }}>{cCtr > 0 ? `${cCtr.toFixed(1)}%` : "\u2014"}</span>
                      <span style={{ textAlign: "right", color: C.textSec, fontSize: 11 }}>{cReach > 0 ? (cReach >= 1000 ? `${(cReach / 1000).toFixed(1)}K` : cReach) : "\u2014"}</span>
                      <span style={{ textAlign: "right", color: C.textSec, fontSize: 11 }}>{cCpm > 0 ? `${s}${fmtV(cCpm)}` : "\u2014"}</span>
                      <span style={{ textAlign: "right", color: freqColor, fontSize: 11 }}>{cFreq > 0 ? cFreq.toFixed(1) : "\u2014"}</span>
                    </div>
                  );
                })}
                {campaigns.length > 8 && (
                  <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textSec, textAlign: "center" }}>
                    +{campaigns.length - 8} campanas mas — ver detalle completo
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
