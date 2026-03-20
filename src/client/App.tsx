import { useState, useEffect } from "react";
import { DollarSign, Users, MessageCircle, ShoppingCart, BarChart3, FileText } from "lucide-react";
import AccountCard from "./components/AccountCard.js";
import Billing from "./pages/Billing.js";

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

export default function App() {
  const [page, setPage] = useState<"dashboard" | "billing">("dashboard");
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

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.text }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: C.textSec, fontSize: 14 }}>Cargando datos...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.red }}>
      Error cargando datos
    </div>
  );

  const metaAccounts = data.accounts.filter(a => a.platform === "meta");
  const googleAccounts = data.accounts.filter(a => a.platform === "google");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Agencia General</h1>
            <nav style={{ display: "flex", gap: 4 }}>
              <NavButton active={page === "dashboard"} onClick={() => setPage("dashboard")}>
                <BarChart3 size={14} /> Ads
              </NavButton>
              <NavButton active={page === "billing"} onClick={() => setPage("billing")}>
                <FileText size={14} /> Facturacion
              </NavButton>
            </nav>
          </div>
          {page === "dashboard" && (
            <div style={{ display: "flex", gap: 6 }}>
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    background: days === d ? C.blue : C.card,
                    color: days === d ? "#ffffff" : C.textSec,
                    border: days === d ? "none" : `1px solid ${C.border}`,
                    transition: "all 0.15s ease",
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 48px" }}>
        {page === "billing" && <Billing />}

        {page === "dashboard" && <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}>
            <KPICard icon={<DollarSign size={18} />} label="Gasto COP" value={fmt(data.totalSpendCOP, "COP")} accent={C.red} />
            <KPICard icon={<DollarSign size={18} />} label="Gasto USD" value={fmt(data.totalSpendUSD, "USD")} accent={C.orange} />
            <KPICard icon={<Users size={18} />} label="Leads" value={String(data.totalLeads)} accent={C.blue} />
            <KPICard icon={<MessageCircle size={18} />} label="Chats WA" value={String(data.totalChats)} accent={C.green} />
            <KPICard icon={<ShoppingCart size={18} />} label="Ventas" value={String(data.totalVentas)} accent={C.purple} />
          </div>

          {/* Meta Ads Section */}
          {metaAccounts.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, display: "inline-block" }} />
                Meta Ads
                <span style={{ fontSize: 12, color: C.textSec, fontWeight: 400, marginLeft: 4 }}>({metaAccounts.length} cuentas)</span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {metaAccounts.map(acc => <AccountCard key={acc.id} account={acc} days={days} />)}
              </div>
            </section>
          )}

          {/* Google Ads Section */}
          {googleAccounts.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.yellow, display: "inline-block" }} />
                Google Ads
                <span style={{ fontSize: 12, color: C.textSec, fontWeight: 400, marginLeft: 4 }}>({googleAccounts.length} cuentas)</span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {googleAccounts.map(acc => <AccountCard key={acc.id} account={acc} days={days} />)}
              </div>
            </section>
          )}
        </>}
      </main>
    </div>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        background: active ? C.blue : "transparent",
        color: active ? "#ffffff" : C.textSec,
        border: "none",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: C.card,
      borderRadius: 10,
      padding: "18px 20px",
      border: `1px solid ${C.border}`,
      transition: "border-color 0.15s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          background: accent + "18",
          color: accent,
        }}>
          {icon}
        </span>
        <span style={{ fontSize: 11, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}
