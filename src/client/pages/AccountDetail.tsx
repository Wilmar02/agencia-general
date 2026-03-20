import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { C, tipoLabel, tipoColor } from "../lib/theme.js";
import { fmtK, fmtMoney, fmtReach } from "../lib/format.js";
import { api } from "../lib/api.js";
import KpiCard from "../components/KpiCard.js";

type Tab = "campaigns" | "adsets" | "ads";

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const accountId = Number(id);
  const [account, setAccount] = useState<any>(null);
  const [days, setDays] = useState(7);
  const [tab, setTab] = useState<Tab>("campaigns");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adsets, setAdsets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedAdset, setSelectedAdset] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load account info
  useEffect(() => {
    fetch("/api/accounts").then(r => r.json()).then((accs: any[]) => {
      const acc = accs.find(a => a.id === accountId);
      if (acc) setAccount(acc);
    });
  }, [accountId]);

  // Load metrics
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.metrics(accountId, days),
      api.campaigns(accountId, days),
    ]).then(([m, c]) => {
      setMetrics(m);
      setCampaigns(c);
      setLoading(false);
    });
  }, [accountId, days]);

  // Load adsets when selecting a campaign
  useEffect(() => {
    if (selectedCampaign) {
      api.adsets(accountId, days, selectedCampaign).then(setAdsets);
      setTab("adsets");
      setSelectedAdset(null);
      setAds([]);
    }
  }, [selectedCampaign, days]);

  // Load ads when selecting an adset
  useEffect(() => {
    if (selectedAdset) {
      api.ads(accountId, days, selectedAdset).then(setAds);
      setTab("ads");
    }
  }, [selectedAdset, days]);

  // Load all adsets/ads when switching tabs without selection
  useEffect(() => {
    if (tab === "adsets" && !selectedCampaign) {
      api.adsets(accountId, days).then(setAdsets);
    }
    if (tab === "ads" && !selectedAdset) {
      api.ads(accountId, days).then(setAds);
    }
  }, [tab, days]);

  if (!account || loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: C.textSec }}>
      <div style={{ width: 28, height: 28, border: "3px solid #27272a", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const s = account.currency === "USD" ? "US$" : "$";
  const fmtV = (v: number) => fmtMoney(v, account.currency);

  // Aggregate account KPIs from metrics
  const totalSpend = metrics.reduce((a, m) => a + Number(m.spend), 0);
  const totalConv = metrics.reduce((a, m) => a + Number(m.conversions), 0);
  const totalImpressions = metrics.reduce((a, m) => a + Number(m.impressions), 0);
  const totalClicks = metrics.reduce((a, m) => a + Number(m.clicks), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpl = totalConv > 0 ? totalSpend / totalConv : 0;

  const getCostColor = (cost: number, conv: number) => {
    if (conv === 0) return C.textMuted;
    const threshold = account.tipo === "whatsapp" ? (account.currency === "COP" ? 12000 : 5) :
                      account.tipo === "ventas" ? (account.currency === "COP" ? 50000 : 20) :
                      (account.currency === "COP" ? 25000 : 8);
    if (cost > threshold) return C.red;
    if (cost > threshold * 0.7) return "#fbbf24";
    return C.green;
  };

  const getFreqColor = (f: number) => f > 3 ? C.red : f > 2 ? "#fbbf24" : C.textSec;

  // Breadcrumb
  const breadcrumb: { label: string; onClick?: () => void }[] = [
    { label: account.name, onClick: () => { setTab("campaigns"); setSelectedCampaign(null); setSelectedAdset(null); } },
  ];
  if (selectedCampaign) {
    const camp = campaigns.find(c => c.campaign_id === selectedCampaign);
    breadcrumb.push({ label: camp?.campaign_name || selectedCampaign, onClick: () => { setTab("adsets"); setSelectedAdset(null); } });
  }
  if (selectedAdset) {
    const as = adsets.find(a => a.adset_id === selectedAdset);
    breadcrumb.push({ label: as?.adset_name || selectedAdset });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/")} style={{
            padding: "6px 12px", borderRadius: 6, fontSize: 12, background: "transparent",
            color: C.textSec, border: `1px solid ${C.border}`,
          }}>{"\u2190"} Volver</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <span style={{ color: C.textMuted }}>/</span>}
                <span
                  onClick={b.onClick}
                  style={{
                    fontSize: i === 0 ? 18 : 14,
                    fontWeight: i === 0 ? 700 : 500,
                    color: b.onClick ? C.blueLight : C.text,
                    cursor: b.onClick ? "pointer" : "default",
                  }}
                >{b.label}</span>
              </span>
            ))}
            <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: (tipoColor[account.tipo] || "#555") + "20", color: tipoColor[account.tipo] || "#888", textTransform: "uppercase" }}>
              {tipoLabel[account.tipo] || account.tipo}
            </span>
            <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: account.platform === "meta" ? "#3b82f620" : "#eab30820", color: account.platform === "meta" ? "#3b82f6" : "#eab308", textTransform: "uppercase" }}>
              {account.platform}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, background: "#1a1a26", borderRadius: 8, padding: 3 }}>
          {[{v:3,l:"3d"},{v:7,l:"7d"},{v:14,l:"14d"},{v:30,l:"30d"}].map(d => (
            <button key={d.v} onClick={() => setDays(d.v)} style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none",
              background: days === d.v ? "#27272a" : "transparent",
              color: days === d.v ? C.white : C.textSec,
            }}>{d.l}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Gasto" value={fmtK(totalSpend, account.currency)} />
        <KpiCard label={tipoLabel[account.tipo] || "Conv."} value={String(totalConv)} />
        <KpiCard label={`Costo/${(tipoLabel[account.tipo] || "Conv").slice(0, -1) || "Conv"}`} value={totalConv > 0 ? fmtV(avgCpl) : "\u2014"} />
        <KpiCard label="CTR" value={`${avgCtr.toFixed(2)}%`} />
        <KpiCard label="Impresiones" value={fmtReach(totalImpressions)} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, background: "#1a1a26", borderRadius: 8, padding: 3, width: "fit-content" }}>
        {([["campaigns", "Campanas"], ["adsets", "Ad Sets"], ["ads", "Anuncios"]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); if (key === "campaigns") { setSelectedCampaign(null); setSelectedAdset(null); } }} style={{
            padding: "7px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, border: "none",
            background: tab === key ? C.blue : "transparent",
            color: tab === key ? C.white : C.textSec,
          }}>{label}</button>
        ))}
      </div>

      {/* Campaign Table */}
      {tab === "campaigns" && (
        <DataTable
          headers={["Campana", "Gasto", "Conv.", "Costo/Conv", "CTR", "Alcance", "CPM", "Freq."]}
          columns="1fr 80px 60px 80px 55px 70px 60px 55px"
          rows={campaigns}
          renderRow={(camp) => {
            const spend = Number(camp.spend);
            const conv = Number(camp.conversions);
            const cost = Number(camp.cost_per_conv);
            const ctr = Number(camp.ctr);
            const reach = Number(camp.reach) || 0;
            const cpm = Number(camp.cpm) || 0;
            const freq = Number(camp.frequency) || 0;
            return {
              onClick: () => setSelectedCampaign(camp.campaign_id),
              cells: [
                <span style={{ color: "#c0c0d0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={camp.campaign_name}>{camp.campaign_name}</span>,
                <span style={{ textAlign: "right", fontWeight: 500 }}>{fmtV(spend)}</span>,
                <span style={{ textAlign: "right", fontWeight: 600, color: conv > 0 ? C.white : C.textMuted }}>{conv || "\u2014"}</span>,
                <span style={{ textAlign: "right", color: getCostColor(cost, conv), fontWeight: 500 }}>{conv > 0 ? fmtV(cost) : "\u2014"}</span>,
                <span style={{ textAlign: "right", color: C.textSec }}>{ctr > 0 ? `${ctr.toFixed(1)}%` : "\u2014"}</span>,
                <span style={{ textAlign: "right", color: C.textSec, fontSize: 11 }}>{reach > 0 ? fmtReach(reach) : "\u2014"}</span>,
                <span style={{ textAlign: "right", color: C.textSec, fontSize: 11 }}>{cpm > 0 ? fmtV(cpm) : "\u2014"}</span>,
                <span style={{ textAlign: "right", color: getFreqColor(freq), fontSize: 11 }}>{freq > 0 ? freq.toFixed(1) : "\u2014"}</span>,
              ],
            };
          }}
        />
      )}

      {/* Ad Sets Table */}
      {tab === "adsets" && (
        <DataTable
          headers={["Ad Set", "Gasto", "Conv.", "Costo/Conv", "CTR", "Alcance", "Freq.", "Budget"]}
          columns="1fr 80px 60px 80px 55px 70px 55px 80px"
          rows={adsets}
          renderRow={(as) => {
            const spend = Number(as.spend);
            const conv = Number(as.conversions);
            const cost = Number(as.cost_per_conv);
            const ctr = Number(as.ctr);
            const reach = Number(as.reach) || 0;
            const freq = Number(as.frequency) || 0;
            const budget = Number(as.daily_budget) || Number(as.lifetime_budget) || 0;
            return {
              onClick: () => setSelectedAdset(as.adset_id),
              cells: [
                <span style={{ color: "#c0c0d0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={as.adset_name}>{as.adset_name}</span>,
                <span style={{ textAlign: "right", fontWeight: 500 }}>{fmtV(spend)}</span>,
                <span style={{ textAlign: "right", fontWeight: 600, color: conv > 0 ? C.white : C.textMuted }}>{conv || "\u2014"}</span>,
                <span style={{ textAlign: "right", color: getCostColor(cost, conv), fontWeight: 500 }}>{conv > 0 ? fmtV(cost) : "\u2014"}</span>,
                <span style={{ textAlign: "right", color: C.textSec }}>{ctr > 0 ? `${ctr.toFixed(1)}%` : "\u2014"}</span>,
                <span style={{ textAlign: "right", color: C.textSec, fontSize: 11 }}>{reach > 0 ? fmtReach(reach) : "\u2014"}</span>,
                <span style={{ textAlign: "right", color: getFreqColor(freq), fontSize: 11 }}>{freq > 0 ? freq.toFixed(1) : "\u2014"}</span>,
                <span style={{ textAlign: "right", color: C.textSec, fontSize: 11 }}>{budget > 0 ? fmtV(budget) + "/d" : "\u2014"}</span>,
              ],
            };
          }}
        />
      )}

      {/* Ads Table */}
      {tab === "ads" && (
        <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
            {ads.length} anuncio{ads.length !== 1 ? "s" : ""}
          </div>
          {ads.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: C.textSec, fontSize: 13 }}>Sin anuncios en este periodo</div>
          ) : (
            ads.map((ad, i) => {
              const spend = Number(ad.spend);
              const conv = Number(ad.conversions);
              const cost = Number(ad.cost_per_conv);
              const ctr = Number(ad.ctr);
              const freq = Number(ad.frequency) || 0;
              const costColor = getCostColor(cost, conv);
              const perfBadge = conv > 0 && cost < (account.tipo === "whatsapp" ? (account.currency === "COP" ? 12000 : 5) : (account.currency === "COP" ? 25000 : 8)) * 0.7
                ? { label: "Top", color: C.green }
                : freq > 3 ? { label: "Fatiga", color: C.red }
                : ctr < 0.5 && spend > 0 ? { label: "Bajo CTR", color: C.yellow }
                : null;

              return (
                <div key={i} style={{
                  display: "flex", gap: 14, padding: "14px 16px", borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                  alignItems: "flex-start",
                }}>
                  {/* Thumbnail */}
                  <div style={{ width: 64, height: 64, borderRadius: 8, background: "#27272a", flexShrink: 0, overflow: "hidden" }}>
                    {ad.thumbnail_url ? (
                      <img src={ad.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.textMuted }}>
                        Sin imagen
                      </div>
                    )}
                  </div>

                  {/* Ad info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ad.ad_name}
                      </span>
                      {perfBadge && (
                        <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 3, background: perfBadge.color + "20", color: perfBadge.color, textTransform: "uppercase" }}>
                          {perfBadge.label}
                        </span>
                      )}
                      {ad.creative_type && (
                        <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: C.border, color: C.textSec }}>
                          {ad.creative_type}
                        </span>
                      )}
                    </div>
                    {(ad.title || ad.body_text) && (
                      <div style={{ fontSize: 11, color: C.textSec, marginBottom: 6, lineHeight: 1.4 }}>
                        {ad.title && <span style={{ fontWeight: 600 }}>{ad.title}</span>}
                        {ad.title && ad.body_text && <span> — </span>}
                        {ad.body_text && <span>{ad.body_text.slice(0, 100)}{ad.body_text.length > 100 ? "..." : ""}</span>}
                      </div>
                    )}
                    {ad.call_to_action && (
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.blue + "20", color: C.blueLight }}>
                        {ad.call_to_action.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>

                  {/* Metrics */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, flexShrink: 0, minWidth: 350 }}>
                    <MetricCell label="Gasto" value={fmtV(spend)} />
                    <MetricCell label="Conv." value={String(conv)} color={conv > 0 ? C.white : C.textMuted} />
                    <MetricCell label="Costo" value={conv > 0 ? fmtV(cost) : "\u2014"} color={costColor} />
                    <MetricCell label="CTR" value={ctr > 0 ? `${ctr.toFixed(1)}%` : "\u2014"} />
                    <MetricCell label="Freq." value={freq > 0 ? freq.toFixed(1) : "\u2014"} color={getFreqColor(freq)} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: color || C.text }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

function DataTable({ headers, columns, rows, renderRow }: {
  headers: string[];
  columns: string;
  rows: any[];
  renderRow: (row: any) => { onClick?: () => void; cells: React.ReactNode[] };
}) {
  return (
    <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: columns, gap: 0, padding: "8px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
        {headers.map((h, i) => (
          <span key={i} style={{ textAlign: i === 0 ? "left" : "right" }}>{h}</span>
        ))}
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: C.textSec, fontSize: 13 }}>Sin datos en este periodo</div>
      ) : (
        rows.map((row, i) => {
          const { onClick, cells } = renderRow(row);
          return (
            <div key={i} onClick={onClick} style={{
              display: "grid", gridTemplateColumns: columns, gap: 0,
              padding: "10px 16px", borderTop: i > 0 ? `1px solid ${C.border}` : "none",
              fontSize: 12, alignItems: "center",
              cursor: onClick ? "pointer" : "default",
              transition: "background 0.1s",
            }}
              onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = C.cardHover; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {cells.map((cell, j) => (
                <div key={j}>{cell}</div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
