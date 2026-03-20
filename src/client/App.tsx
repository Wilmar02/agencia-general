import { useState, useEffect } from "react";
import { DollarSign, Users, MessageCircle, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import SpendChart from "./components/SpendChart.js";
import AccountCard from "./components/AccountCard.js";

interface DashboardData {
  totalSpendCOP: number;
  totalSpendUSD: number;
  totalLeads: number;
  totalChats: number;
  totalVentas: number;
  accounts: any[];
}

function fmt(val: number, currency: string) {
  if (currency === "USD") return `US$${val.toFixed(2)}`;
  return `$${Math.round(val).toLocaleString("es-CO")}`;
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?days=${days}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Cargando...</div>;
  if (!data) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400">Error cargando datos</div>;

  const metaAccounts = data.accounts.filter(a => a.platform === "meta");
  const googleAccounts = data.accounts.filter(a => a.platform === "google");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-bold">Agencia General</h1>
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-sm ${days === d ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard icon={<DollarSign size={20} />} label="Gasto COP" value={fmt(data.totalSpendCOP, "COP")} color="red" />
          <KPICard icon={<DollarSign size={20} />} label="Gasto USD" value={fmt(data.totalSpendUSD, "USD")} color="orange" />
          <KPICard icon={<Users size={20} />} label="Leads" value={String(data.totalLeads)} color="blue" />
          <KPICard icon={<MessageCircle size={20} />} label="Chats WA" value={String(data.totalChats)} color="green" />
          <KPICard icon={<ShoppingCart size={20} />} label="Ventas" value={String(data.totalVentas)} color="purple" />
        </div>

        {/* Accounts Grid */}
        {metaAccounts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Meta Ads
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metaAccounts.map(acc => <AccountCard key={acc.id} account={acc} days={days} />)}
            </div>
          </section>
        )}

        {googleAccounts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" /> Google Ads
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {googleAccounts.map(acc => <AccountCard key={acc.id} account={acc} days={days} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    red: "text-red-400 bg-red-400/10",
    orange: "text-orange-400 bg-orange-400/10",
    blue: "text-blue-400 bg-blue-400/10",
    green: "text-green-400 bg-green-400/10",
    purple: "text-purple-400 bg-purple-400/10",
  };
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex items-center gap-2 mb-2">
        <span className={`p-1.5 rounded ${colors[color]}`}>{icon}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
