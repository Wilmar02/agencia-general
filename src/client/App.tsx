import { useState, useEffect } from "react";
import { DollarSign, Users, MessageCircle, ShoppingCart, BarChart3, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";
import AccountCard from "./components/AccountCard.js";
import AlertBanner from "./components/AlertBanner.js";
import AccountsTable from "./components/AccountsTable.js";
import Billing from "./pages/Billing.js";

interface DashboardData {
  totalSpendCOP: number;
  totalSpendUSD: number;
  totalLeads: number;
  totalChats: number;
  totalVentas: number;
  accounts: any[];
}

interface InsightsData {
  alerts: any[];
  performanceScores: any[];
  weekOverWeek: {
    spendChange: string;
    leadsChange: string;
    cplChange: string;
    direction: "better" | "worse" | "stable";
    currentSpend: number;
    previousSpend: number;
    currentConversions: number;
    previousConversions: number;
  };
  topPerformers: any[];
  needsAttention: any[];
}

function fmt(val: number, currency: string) {
  if (currency === "USD") return `US$${val.toFixed(2)}`;
  return `$${Math.round(val).toLocaleString("es-CO")}`;
}

function parsePctStr(s: string): number {
  return parseInt(s.replace(/[^-\d]/g, "")) || 0;
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
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/dashboard?days=${days}`).then(r => r.json()),
      fetch(`/api/insights?days=${days}`).then(r => r.json()),
    ])
      .then(([dashData, insData]) => {
        setData(dashData);
        setInsights(insData);
      })
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

  // Week over week data for KPI trends
  const wow = insights?.weekOverWeek;

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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Week over week direction badge */}
              {wow && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: wow.direction === "better" ? "#22c55e18" : wow.direction === "worse" ? "#ef444418" : "#8888a018",
                  color: wow.direction === "better" ? C.green : wow.direction === "worse" ? C.red : C.textSec,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  {wow.direction === "better" ? <TrendingUp size={12} /> : wow.direction === "worse" ? <TrendingDown size={12} /> : <Minus size={12} />}
                  {wow.direction === "better" ? "Mejorando" : wow.direction === "worse" ? "Empeorando" : "Estable"}
                </span>
              )}
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
                      cursor: "pointer",
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 48px" }}>
        {page === "billing" && <Billing />}

        {page === "dashboard" && <>
          {/* Section 1: Alert Banner */}
          {insights && insights.alerts.length > 0 && (
            <AlertBanner alerts={insights.alerts} />
          )}

          {/* Section 2: KPI Cards with Trends */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}>
            <KPICard
              icon={<DollarSign size={18} />}
              label="Gasto COP"
              value={fmt(data.totalSpendCOP, "COP")}
              accent={C.red}
              trend={wow?.spendChange}
              trendGoodWhenDown={true}
            />
            <KPICard
              icon={<DollarSign size={18} />}
              label="Gasto USD"
              value={fmt(data.totalSpendUSD, "USD")}
              accent={C.orange}
              trend={wow?.spendChange}
              trendGoodWhenDown={true}
            />
            <KPICard
              icon={<Users size={18} />}
              label="Leads"
              value={String(data.totalLeads)}
              accent={C.blue}
              trend={wow?.leadsChange}
              trendGoodWhenDown={false}
            />
            <KPICard
              icon={<MessageCircle size={18} />}
              label="Chats WA"
              value={String(data.totalChats)}
              accent={C.green}
              trend={wow?.leadsChange}
              trendGoodWhenDown={false}
            />
            <KPICard
              icon={<ShoppingCart size={18} />}
              label="Ventas"
              value={String(data.totalVentas)}
              accent={C.purple}
              trend={wow?.leadsChange}
              trendGoodWhenDown={false}
            />
          </div>

          {/* Section 3: Performance Overview - Accounts Table */}
          {insights && insights.performanceScores.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  Performance Overview
                  <span style={{ fontSize: 12, color: C.textSec, fontWeight: 400 }}>
                    ({insights.performanceScores.length} cuentas)
                  </span>
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: C.textSec }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, display: "inline-block" }} /> Bien ({insights.topPerformers.length})
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.yellow, display: "inline-block" }} /> Atencion ({insights.performanceScores.filter(p => p.status === "warning").length})
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, display: "inline-block" }} /> Critico ({insights.performanceScores.filter(p => p.status === "bad").length})
                  </span>
                </div>
              </div>
              <AccountsTable
                accounts={insights.performanceScores}
                alerts={insights.alerts}
                days={days}
              />
            </section>
          )}

          {/* Section 4: Account Detail Cards (smaller, 4 columns) */}
          {metaAccounts.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, color: C.textSec }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue, display: "inline-block" }} />
                Meta Ads
                <span style={{ fontSize: 11, fontWeight: 400 }}>({metaAccounts.length})</span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {metaAccounts.map(acc => <AccountCard key={acc.id} account={acc} days={days} />)}
              </div>
            </section>
          )}

          {googleAccounts.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, color: C.textSec }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.yellow, display: "inline-block" }} />
                Google Ads
                <span style={{ fontSize: 11, fontWeight: 400 }}>({googleAccounts.length})</span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
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
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function KPICard({
  icon,
  label,
  value,
  accent,
  trend,
  trendGoodWhenDown,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  trend?: string;
  trendGoodWhenDown?: boolean;
}) {
  const trendNum = trend ? parsePctStr(trend) : 0;
  const isPositive = trendNum > 0;
  const isGood = trendGoodWhenDown ? !isPositive : isPositive;
  const trendColor = trendNum === 0 ? C.textSec : isGood ? C.green : C.red;

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
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</p>
        {trend && trendNum !== 0 && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            fontSize: 12,
            fontWeight: 600,
            color: trendColor,
            padding: "2px 6px",
            borderRadius: 4,
            background: trendColor + "15",
          }}>
            {isPositive ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
