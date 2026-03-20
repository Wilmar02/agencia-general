import { useState, useEffect } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface Props {
  account: any;
  days: number;
}

export default function AccountCard({ account, days }: Props) {
  const [metrics, setMetrics] = useState<any[]>([]);

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

  const tipoLabel: Record<string, string> = { leads: "Leads", whatsapp: "Chats", ventas: "Ventas" };
  const tipoColor: Record<string, string> = { leads: "bg-blue-500", whatsapp: "bg-green-500", ventas: "bg-purple-500" };

  const chartData = metrics.map(m => ({
    date: m.date.slice(5),
    spend: Number(m.spend),
    conv: Number(m.conversions),
  }));

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">{account.name}</h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${tipoColor[account.tipo]} text-white`}>
            {tipoLabel[account.tipo] || account.tipo}
          </span>
        </div>
        <span className="text-lg font-bold">{s}{fmt(spend)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-3">
        <div>
          <p className="text-white font-medium">{conv}</p>
          <p>{tipoLabel[account.tipo]}</p>
        </div>
        <div>
          <p className="text-white font-medium">{conv > 0 ? `${s}${fmt(cpc)}` : "-"}</p>
          <p>Costo/{tipoLabel[account.tipo]?.slice(0, -1) || "conv"}</p>
        </div>
        <div>
          <p className="text-white font-medium">{ctr.toFixed(2)}%</p>
          <p>CTR</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Bar dataKey="spend" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Tooltip
                contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${s}${fmt(v)}`, "Gasto"]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
