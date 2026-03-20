import { useState, useEffect } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  account: any;
  days: number;
}

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

const tipoBadge: Record<string, { label: string; color: string; bg: string }> = {
  leads: { label: "Leads", color: "#3b82f6", bg: "#3b82f618" },
  whatsapp: { label: "Chats", color: "#22c55e", bg: "#22c55e18" },
  ventas: { label: "Ventas", color: "#a855f7", bg: "#a855f718" },
};

const tipoChartColor: Record<string, string> = {
  leads: "#3b82f6",
  whatsapp: "#22c55e",
  ventas: "#a855f7",
};

export default function AccountCard({ account, days }: Props) {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    fetch(`/api/metrics/${account.id}?days=${days}`)
      .then(r => r.json())
      .then(setMetrics);
  }, [account.id, days]);

  const spend = Number(account.spend);
  const conv = Number(account.conversions);
  const cpc = conv > 0 ? spend / conv : 0;
  const ctr = Number(account.ctr);
  const s = account.currency === "USD" ? "US$" : "$";
  const fmt = (v: number) => account.currency === "USD" ? v.toFixed(2) : Math.round(v).toLocaleString("es-CO");

  const badge = tipoBadge[account.tipo] || { label: account.tipo, color: C.textSec, bg: C.border };
  const barColor = tipoChartColor[account.tipo] || C.blue;
  const tipoLabel = tipoBadge[account.tipo]?.label || account.tipo;

  const chartData = metrics.map(m => ({
    date: m.date?.slice(5),
    spend: Number(m.spend),
    conv: Number(m.conversions),
  }));

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.cardHover : C.card,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        padding: 18,
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
    >
      {/* Header: name, badge, spend */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, lineHeight: 1.2 }}>{account.name}</h3>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 4,
            background: badge.bg,
            color: badge.color,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}>
            {badge.label}
          </span>
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>{s}{fmt(spend)}</span>
      </div>

      {/* 3 Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <MetricCell value={String(conv)} label={tipoLabel} />
        <MetricCell value={conv > 0 ? `${s}${fmt(cpc)}` : "-"} label={`Costo/${tipoLabel.slice(0, -1) || "conv"}`} />
        <MetricCell value={`${ctr.toFixed(2)}%`} label="CTR" />
      </div>

      {/* Mini Chart */}
      {chartData.length > 0 && (
        <div style={{ height: 48, marginTop: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <Bar dataKey="spend" fill={barColor} radius={[2, 2, 0, 0]} opacity={0.8} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                contentStyle={{
                  background: "#1e1e2e",
                  border: `1px solid #2a2a3e`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: C.text,
                  padding: "6px 10px",
                }}
                labelStyle={{ display: "none" }}
                formatter={(v: number) => [`${s}${fmt(v)}`, "Gasto"]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function MetricCell({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: 10, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
    </div>
  );
}
