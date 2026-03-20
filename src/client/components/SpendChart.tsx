import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props {
  data: { date: string; spend: number }[];
  currency: string;
}

export default function SpendChart({ data, currency }: Props) {
  const s = currency === "USD" ? "US$" : "$";
  const fmt = (v: number) => currency === "USD" ? v.toFixed(2) : Math.round(v).toLocaleString("es-CO");

  return (
    <div className="h-64 bg-gray-900 rounded-lg border border-gray-800 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8 }}
            formatter={(v: number) => [`${s}${fmt(v)}`, "Gasto"]}
          />
          <Line type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
