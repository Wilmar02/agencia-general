import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props {
  data: { date: string; spend: number }[];
  currency: string;
}

export default function SpendChart({ data, currency }: Props) {
  const s = currency === "USD" ? "US$" : "$";
  const fmt = (v: number) => currency === "USD" ? v.toFixed(2) : Math.round(v).toLocaleString("es-CO");

  return (
    <div style={{
      height: 256,
      background: "#12121a",
      borderRadius: 10,
      border: "1px solid #1e1e2e",
      padding: 16,
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis dataKey="date" tick={{ fill: "#8888a0", fontSize: 11 }} />
          <YAxis tick={{ fill: "#8888a0", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#1e1e2e",
              border: "1px solid #2a2a3e",
              borderRadius: 8,
              color: "#e2e2e2",
            }}
            formatter={(v: number) => [`${s}${fmt(v)}`, "Gasto"]}
          />
          <Line type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
