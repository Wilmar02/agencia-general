import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { C, tipoLabel, tipoColor } from "../lib/theme.js";
import { fmtK, fmtMoney, fmtReach } from "../lib/format.js";
import { api } from "../lib/api.js";
import KpiCard from "../components/KpiCard.js";
import { ArrowLeft, ChevronRight, Image, MousePointerClick } from "lucide-react";

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
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: string; name: string } | null>(null);
  const [selectedAdset, setSelectedAdset] = useState<{ id: string; name: string } | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounts").then(r => r.json()).then((accs: any[]) => {
      const acc = accs.find(a => a.id === accountId);
      if (acc) setAccount(acc);
    });
  }, [accountId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.metrics(accountId, days), api.campaigns(accountId, days)])
      .then(([m, c]) => { setMetrics(m); setCampaigns(c); setLoading(false); });
  }, [accountId, days]);

  useEffect(() => {
    if (selectedCampaign) {
      api.adsets(accountId, days, selectedCampaign.id).then(setAdsets);
      setTab("adsets");
      setSelectedAdset(null);
      setAds([]);
    }
  }, [selectedCampaign, days]);

  useEffect(() => {
    if (selectedAdset) {
      api.ads(accountId, days, selectedAdset.id).then(setAds);
      setTab("ads");
    }
  }, [selectedAdset, days]);

  useEffect(() => {
    if (tab === "adsets" && !selectedCampaign) api.adsets(accountId, days).then(setAdsets);
    if (tab === "ads" && !selectedAdset) api.ads(accountId, days).then(setAds);
  }, [tab, days]);

  if (!account || loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ width: 28, height: 28, border: "3px solid #27272a", borderTopColor: C.blue, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const fmtV = (v: number) => fmtMoney(v, account.currency);
  const totalSpend = metrics.reduce((a, m) => a + Number(m.spend), 0);
  const totalConv = metrics.reduce((a, m) => a + Number(m.conversions), 0);
  const totalImpressions = metrics.reduce((a, m) => a + Number(m.impressions), 0);
  const totalClicks = metrics.reduce((a, m) => a + Number(m.clicks), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpl = totalConv > 0 ? totalSpend / totalConv : 0;

  const getCostColor = (cost: number, conv: number) => {
    if (conv === 0) return C.textMuted;
    const t = account.tipo === "whatsapp" ? (account.currency === "COP" ? 12000 : 5) :
              account.tipo === "ventas" ? (account.currency === "COP" ? 50000 : 20) :
              (account.currency === "COP" ? 25000 : 8);
    return cost > t ? C.red : cost > t * 0.7 ? "#fbbf24" : C.green;
  };

  const getFreqColor = (f: number) => f > 3 ? C.red : f > 2 ? "#fbbf24" : C.textSec;

  // Reset drill-down
  const goToCampaigns = () => { setTab("campaigns"); setSelectedCampaign(null); setSelectedAdset(null); };
  const goToAdsets = () => { setTab("adsets"); setSelectedAdset(null); };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      {/* Back + Account name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={() => navigate("/")} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: C.textSec,
        }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.white }}>{account.name}</h1>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: (tipoColor[account.tipo] || "#555") + "20", color: tipoColor[account.tipo] || "#888", textTransform: "uppercase" }}>
              {tipoLabel[account.tipo] || account.tipo}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: account.platform === "meta" ? "#3b82f620" : "#eab30820", color: account.platform === "meta" ? "#3b82f6" : "#eab308", textTransform: "uppercase" }}>
              {account.platform}
            </span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: C.border, color: C.textSec }}>{account.currency}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 2, background: "#1a1a26", borderRadius: 8, padding: 3 }}>
          {[{v:3,l:"3d"},{v:7,l:"7d"},{v:14,l:"14d"},{v:30,l:"30d"}].map(d => (
            <button key={d.v} onClick={() => setDays(d.v)} style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "none",
              background: days === d.v ? C.blue : "transparent",
              color: days === d.v ? C.white : C.textSec,
            }}>{d.l}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 20, marginBottom: 24 }}>
        <KpiCard label="Gasto" value={fmtK(totalSpend, account.currency)} />
        <KpiCard label={tipoLabel[account.tipo] || "Conv."} value={String(totalConv)} />
        <KpiCard label="Costo/Conv" value={totalConv > 0 ? fmtV(avgCpl) : "\u2014"} />
        <KpiCard label="CTR" value={`${avgCtr.toFixed(2)}%`} />
        <KpiCard label="Impresiones" value={fmtReach(totalImpressions)} />
      </div>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 13 }}>
        <span onClick={goToCampaigns} style={{ color: selectedCampaign ? C.blue : C.white, cursor: selectedCampaign ? "pointer" : "default", fontWeight: 600 }}>
          Campanas ({campaigns.length})
        </span>
        {selectedCampaign && (
          <>
            <ChevronRight size={14} style={{ color: C.textMuted }} />
            <span onClick={goToAdsets} style={{ color: selectedAdset ? C.blue : C.white, cursor: selectedAdset ? "pointer" : "default", fontWeight: 600, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedCampaign.name}
            </span>
          </>
        )}
        {selectedAdset && (
          <>
            <ChevronRight size={14} style={{ color: C.textMuted }} />
            <span style={{ color: C.white, fontWeight: 600, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedAdset.name}
            </span>
          </>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "#1a1a26", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {([["campaigns", `Campanas (${campaigns.length})`], ["adsets", `Ad Sets (${adsets.length})`], ["ads", `Anuncios (${ads.length})`]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => {
            setTab(key);
            if (key === "campaigns") goToCampaigns();
            if (key === "adsets") { setSelectedAdset(null); }
          }} style={{
            padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none",
            background: tab === key ? C.blue : "transparent",
            color: tab === key ? C.white : C.textSec,
          }}>{label}</button>
        ))}
      </div>

      {/* Campaigns */}
      {tab === "campaigns" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {campaigns.length === 0 ? <Empty /> : campaigns.map((camp, i) => {
            const spend = Number(camp.spend);
            const conv = Number(camp.conversions);
            const cost = Number(camp.cost_per_conv);
            const ctr = Number(camp.ctr);
            const freq = Number(camp.frequency) || 0;
            return (
              <div key={i} onClick={() => setSelectedCampaign({ id: camp.campaign_id, name: camp.campaign_name })}
                style={{
                  background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
                  padding: "16px 20px", cursor: "pointer", transition: "border-color 0.15s ease",
                  display: "flex", alignItems: "center", gap: 20,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue + "50")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {camp.campaign_name}
                  </div>
                  {camp.objective && <div style={{ fontSize: 10, color: C.textSec, textTransform: "uppercase" }}>{camp.objective}</div>}
                </div>
                <Metric label="Gasto" value={fmtV(spend)} />
                <Metric label={tipoLabel[account.tipo] || "Conv."} value={String(conv)} color={conv > 0 ? C.white : C.textMuted} />
                <Metric label="Costo" value={conv > 0 ? fmtV(cost) : "\u2014"} color={getCostColor(cost, conv)} />
                <Metric label="CTR" value={ctr > 0 ? `${ctr.toFixed(1)}%` : "\u2014"} />
                <Metric label="Freq." value={freq > 0 ? freq.toFixed(1) : "\u2014"} color={getFreqColor(freq)} />
                <ChevronRight size={16} style={{ color: C.textMuted, flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Ad Sets */}
      {tab === "adsets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {adsets.length === 0 ? <Empty /> : adsets.map((as, i) => {
            const spend = Number(as.spend);
            const conv = Number(as.conversions);
            const cost = Number(as.cost_per_conv);
            const ctr = Number(as.ctr);
            const freq = Number(as.frequency) || 0;
            const budget = Number(as.daily_budget) || 0;
            return (
              <div key={i} onClick={() => setSelectedAdset({ id: as.adset_id, name: as.adset_name })}
                style={{
                  background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
                  padding: "16px 20px", cursor: "pointer", transition: "border-color 0.15s ease",
                  display: "flex", alignItems: "center", gap: 20,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue + "50")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {as.adset_name}
                  </div>
                  {budget > 0 && <div style={{ fontSize: 10, color: C.textSec }}>{fmtV(budget)}/dia</div>}
                </div>
                <Metric label="Gasto" value={fmtV(spend)} />
                <Metric label="Conv." value={String(conv)} color={conv > 0 ? C.white : C.textMuted} />
                <Metric label="Costo" value={conv > 0 ? fmtV(cost) : "\u2014"} color={getCostColor(cost, conv)} />
                <Metric label="CTR" value={ctr > 0 ? `${ctr.toFixed(1)}%` : "\u2014"} />
                <Metric label="Freq." value={freq > 0 ? freq.toFixed(1) : "\u2014"} color={getFreqColor(freq)} />
                <ChevronRight size={16} style={{ color: C.textMuted, flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Ads */}
      {tab === "ads" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {ads.length === 0 ? <Empty /> : ads.map((ad, i) => {
            const spend = Number(ad.spend);
            const conv = Number(ad.conversions);
            const cost = Number(ad.cost_per_conv);
            const ctr = Number(ad.ctr);
            const freq = Number(ad.frequency) || 0;
            const costColor = getCostColor(cost, conv);

            // Performance badge
            const threshold = account.tipo === "whatsapp" ? (account.currency === "COP" ? 12000 : 5) : (account.currency === "COP" ? 25000 : 8);
            const perfBadge = conv > 0 && cost < threshold * 0.7
              ? { label: "Top Performer", color: C.green, bg: C.green + "15" }
              : freq > 3 ? { label: "Fatiga creativa", color: C.red, bg: C.red + "15" }
              : spend > 0 && conv === 0 ? { label: "Sin conversiones", color: C.orange, bg: C.orange + "15" }
              : ctr < 0.5 && spend > 0 ? { label: "Bajo CTR", color: "#fbbf24", bg: "#fbbf2415" }
              : null;

            return (
              <div key={i} style={{
                background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
                overflow: "hidden",
              }}>
                {/* Thumbnail */}
                <div style={{ height: 140, background: "#1a1a26", position: "relative" }}>
                  {ad.thumbnail_url ? (
                    <img src={ad.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                      <Image size={28} style={{ color: C.textMuted }} />
                      <span style={{ fontSize: 11, color: C.textMuted }}>Sin preview</span>
                    </div>
                  )}
                  {/* Performance badge overlay */}
                  {perfBadge && (
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      padding: "4px 10px", borderRadius: 6,
                      background: perfBadge.bg, backdropFilter: "blur(8px)",
                      fontSize: 10, fontWeight: 700, color: perfBadge.color,
                      textTransform: "uppercase", letterSpacing: "0.03em",
                    }}>
                      {perfBadge.label}
                    </div>
                  )}
                  {/* Creative type badge */}
                  {ad.creative_type && (
                    <div style={{
                      position: "absolute", bottom: 10, left: 10,
                      padding: "3px 8px", borderRadius: 4,
                      background: "#00000080", backdropFilter: "blur(4px)",
                      fontSize: 9, color: "#ddd", textTransform: "uppercase",
                    }}>
                      {ad.creative_type}
                    </div>
                  )}
                </div>

                {/* Ad info */}
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ad.ad_name}
                  </div>
                  {ad.title && <div style={{ fontSize: 11, fontWeight: 600, color: "#c0c0d0", marginBottom: 2 }}>{ad.title}</div>}
                  {ad.body_text && <div style={{ fontSize: 11, color: C.textSec, marginBottom: 8, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ad.body_text}</div>}

                  {ad.call_to_action && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
                      <MousePointerClick size={11} style={{ color: C.blue }} />
                      <span style={{ fontSize: 10, color: C.blue, fontWeight: 600 }}>{ad.call_to_action.replace(/_/g, " ")}</span>
                    </div>
                  )}

                  {/* Metrics row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{fmtV(spend)}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase" }}>Gasto</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: conv > 0 ? C.white : C.textMuted }}>{conv || "\u2014"}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase" }}>Conv.</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: costColor }}>{conv > 0 ? fmtV(cost) : "\u2014"}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase" }}>Costo</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{ctr > 0 ? `${ctr.toFixed(1)}%` : "\u2014"}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase" }}>CTR</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: "right", minWidth: 55 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: color || C.text }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function Empty() {
  return <div style={{ padding: 40, textAlign: "center", color: C.textSec, fontSize: 13, background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>Sin datos en este periodo</div>;
}
