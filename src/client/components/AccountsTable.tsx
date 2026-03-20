import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, ArrowUpDown, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";

const C = {
  bg: "#0a0a0f",
  card: "#12121a",
  cardHover: "#1a1a2e",
  border: "#1e1e2e",
  text: "#e2e2e2",
  textSec: "#8888a0",
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f97316",
  purple: "#a855f7",
  yellow: "#eab308",
} as const;

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

interface Alert {
  account: string;
  accountId: number;
  type: string;
  message: string;
  severity: "critical" | "high" | "medium" | "info";
  suggestion: string;
}

type SortKey = "name" | "platform" | "spend" | "conversions" | "costPerConv" | "ctr" | "score";

const statusColors = { good: C.green, warning: C.yellow, bad: C.red };

const tipoBadge: Record<string, { label: string; color: string }> = {
  leads: { label: "Leads", color: C.blue },
  whatsapp: { label: "Chats", color: C.green },
  ventas: { label: "Ventas", color: C.purple },
};

const platformBadge: Record<string, { label: string; color: string }> = {
  meta: { label: "Meta", color: C.blue },
  google: { label: "Google", color: C.yellow },
};

function fmtMoney(val: number, currency: string): string {
  const s = currency === "USD" ? "US$" : "$";
  return currency === "USD" ? `${s}${val.toFixed(2)}` : `${s}${Math.round(val).toLocaleString("es-CO")}`;
}

function ExpandedRow({ accountId, days, alerts }: { accountId: number; days: number; alerts: Alert[] }) {
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/metrics/${accountId}?days=${days}`)
      .then(r => r.json())
      .then(setMetrics);
  }, [accountId, days]);

  const chartData = metrics.map(m => ({
    date: m.date?.slice(5),
    spend: Number(m.spend),
    conv: Number(m.conversions),
  }));

  const accountAlerts = alerts.filter(a => a.accountId === accountId);

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0 }}>
        <div style={{
          padding: "16px 20px",
          background: C.cardHover,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
        }}>
          {/* Mini Chart */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 11, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Gasto diario</p>
            {chartData.length > 0 ? (
              <div style={{ height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="15%">
                    <Bar dataKey="spend" fill={C.blue} radius={[2, 2, 0, 0]} opacity={0.8} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      contentStyle={{
                        background: "#1e1e2e",
                        border: "1px solid #2a2a3e",
                        borderRadius: 8,
                        fontSize: 12,
                        color: C.text,
                        padding: "6px 10px",
                      }}
                      labelStyle={{ display: "none" }}
                      formatter={(v: number) => [`$${Math.round(v as number).toLocaleString("es-CO")}`, "Gasto"]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: C.textSec }}>Sin datos</p>
            )}
          </div>

          {/* Conversions Chart */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 11, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Conversiones diarias</p>
            {chartData.length > 0 ? (
              <div style={{ height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="15%">
                    <Bar dataKey="conv" fill={C.green} radius={[2, 2, 0, 0]} opacity={0.8} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      contentStyle={{
                        background: "#1e1e2e",
                        border: "1px solid #2a2a3e",
                        borderRadius: 8,
                        fontSize: 12,
                        color: C.text,
                        padding: "6px 10px",
                      }}
                      labelStyle={{ display: "none" }}
                      formatter={(v: number) => [String(v), "Conv"]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: C.textSec }}>Sin datos</p>
            )}
          </div>

          {/* Alerts/Suggestions */}
          {accountAlerts.length > 0 && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 11, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Sugerencias</p>
              {accountAlerts.map((alert, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
                  <Lightbulb size={13} style={{ color: C.yellow, flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: C.textSec, lineHeight: 1.4 }}>
                    {alert.suggestion}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AccountsTable({
  accounts,
  alerts,
  days,
}: {
  accounts: PerformanceScore[];
  alerts: Alert[];
  days: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "name" || key === "platform");
    }
  };

  const sorted = [...accounts].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "platform") cmp = a.platform.localeCompare(b.platform);
    else cmp = (a[sortKey] as number) - (b[sortKey] as number);
    return sortAsc ? cmp : -cmp;
  });

  const SortHeader = ({ label, sortKeyName, width }: { label: string; sortKeyName: SortKey; width?: string }) => (
    <th
      onClick={() => handleSort(sortKeyName)}
      style={{
        padding: "10px 12px",
        textAlign: "left",
        fontSize: 11,
        fontWeight: 600,
        color: C.textSec,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        cursor: "pointer",
        userSelect: "none",
        borderBottom: `1px solid ${C.border}`,
        width: width || "auto",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        {sortKey === sortKeyName ? (
          sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ArrowUpDown size={10} style={{ opacity: 0.3 }} />
        )}
      </span>
    </th>
  );

  return (
    <div style={{
      background: C.card,
      borderRadius: 10,
      border: `1px solid ${C.border}`,
      overflow: "hidden",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{
              padding: "10px 12px",
              textAlign: "left",
              fontSize: 11,
              fontWeight: 600,
              color: C.textSec,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderBottom: `1px solid ${C.border}`,
              width: 40,
            }} />
            <SortHeader label="Cuenta" sortKeyName="name" />
            <SortHeader label="Plataforma" sortKeyName="platform" width="100px" />
            <SortHeader label="Gasto" sortKeyName="spend" width="110px" />
            <SortHeader label="Conv." sortKeyName="conversions" width="80px" />
            <SortHeader label="Costo/Conv" sortKeyName="costPerConv" width="110px" />
            <SortHeader label="CTR" sortKeyName="ctr" width="80px" />
            <SortHeader label="Tendencia" sortKeyName="score" width="130px" />
            <SortHeader label="Score" sortKeyName="score" width="100px" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(acc => {
            const isExpanded = expandedId === acc.accountId;
            const dotColor = statusColors[acc.status];
            const tipo = tipoBadge[acc.tipo] || { label: acc.tipo, color: C.textSec };
            const plat = platformBadge[acc.platform] || { label: acc.platform, color: C.textSec };

            // Parse trend for coloring
            const trendImproving = acc.trend.includes("↓CPL") || acc.trend.includes("↑Conv");
            const trendColor = trendImproving ? C.green : acc.trend.includes("↑CPL") || acc.trend.includes("↓Conv") ? C.red : C.textSec;
            const TrendIcon = trendImproving ? TrendingDown : TrendingUp;

            // Score bar color
            const scoreColor = acc.score > 70 ? C.green : acc.score > 40 ? C.yellow : C.red;

            return (
              <>
                <tr
                  key={acc.accountId}
                  onClick={() => setExpandedId(isExpanded ? null : acc.accountId)}
                  style={{
                    cursor: "pointer",
                    background: isExpanded ? C.cardHover : "transparent",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = C.cardHover; }}
                  onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* Status Dot */}
                  <td style={{ padding: "10px 12px", borderBottom: isExpanded ? "none" : `1px solid ${C.border}` }}>
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: dotColor,
                      boxShadow: `0 0 6px ${dotColor}60`,
                    }} />
                  </td>

                  {/* Name + Tipo */}
                  <td style={{ padding: "10px 12px", borderBottom: isExpanded ? "none" : `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{acc.name}</span>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 3,
                        background: tipo.color + "18",
                        color: tipo.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}>
                        {tipo.label}
                      </span>
                    </div>
                  </td>

                  {/* Platform */}
                  <td style={{ padding: "10px 12px", borderBottom: isExpanded ? "none" : `1px solid ${C.border}` }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: plat.color + "18",
                      color: plat.color,
                    }}>
                      {plat.label}
                    </span>
                  </td>

                  {/* Spend */}
                  <td style={{ padding: "10px 12px", borderBottom: isExpanded ? "none" : `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.text }}>
                    {fmtMoney(acc.spend, acc.currency)}
                  </td>

                  {/* Conversions */}
                  <td style={{ padding: "10px 12px", borderBottom: isExpanded ? "none" : `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: acc.conversions > 0 ? C.text : C.red }}>
                    {acc.conversions}
                  </td>

                  {/* Cost per Conv */}
                  <td style={{ padding: "10px 12px", borderBottom: isExpanded ? "none" : `1px solid ${C.border}`, fontSize: 13, color: C.text }}>
                    {acc.conversions > 0 ? fmtMoney(acc.costPerConv, acc.currency) : "-"}
                  </td>

                  {/* CTR */}
                  <td style={{ padding: "10px 12px", borderBottom: isExpanded ? "none" : `1px solid ${C.border}`, fontSize: 13, color: acc.ctr >= 1 ? C.text : C.yellow }}>
                    {acc.ctr.toFixed(2)}%
                  </td>

                  {/* Trend */}
                  <td style={{ padding: "10px 12px", borderBottom: isExpanded ? "none" : `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <TrendIcon size={13} style={{ color: trendColor }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: trendColor }}>
                        {acc.trend}
                      </span>
                    </div>
                  </td>

                  {/* Score */}
                  <td style={{ padding: "10px 12px", borderBottom: isExpanded ? "none" : `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 48,
                        height: 6,
                        borderRadius: 3,
                        background: C.border,
                        overflow: "hidden",
                      }}>
                        <div style={{
                          width: `${acc.score}%`,
                          height: "100%",
                          borderRadius: 3,
                          background: scoreColor,
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor, minWidth: 24 }}>
                        {acc.score}
                      </span>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <ExpandedRow
                    key={`expanded-${acc.accountId}`}
                    accountId={acc.accountId}
                    days={days}
                    alerts={alerts}
                  />
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
