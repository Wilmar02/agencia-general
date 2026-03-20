import { useState, useEffect } from "react";
import { FileText, Send, CheckCircle, Clock, Plus, Calendar, AlertTriangle, X } from "lucide-react";
import { C } from "../lib/theme.js";
import { api } from "../lib/api.js";

interface Invoice {
  id: number;
  number: number;
  client_name: string;
  client_email: string;
  issue_date: string;
  total: number;
  currency: string;
  status: string;
  items: { description: string; amount: number }[];
}

interface CalendarItem {
  client_name: string;
  description: string;
  amount: number;
  billing_day: number;
  category: string;
  date: string;
  invoiced: boolean;
  invoiceStatus: string | null;
  client_id: number;
}

interface BillingSummary {
  drafts: number;
  sent: number;
  paid: number;
  overdue: number;
  total_paid: number;
  total_pending: number;
  total_month: number;
  expected_monthly: number;
}

interface BillingClient {
  id: number;
  name: string;
  services: { id: number; description: string; amount: number; billing_day: number; category: string }[];
}

const fmt = (v: number) => `$${Math.round(v).toLocaleString("es-CO")}`;

const statusConfig: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  draft: { label: "Borrador", color: C.textSec, bg: "#8888a018", Icon: FileText },
  sent: { label: "Enviada", color: C.blueLight, bg: "#3b82f618", Icon: Send },
  paid: { label: "Pagada", color: C.greenSolid, bg: "#22c55e18", Icon: CheckCircle },
  overdue: { label: "Vencida", color: C.redSolid, bg: "#ef444418", Icon: AlertTriangle },
};

const catColors: Record<string, string> = {
  meta: C.blueLight,
  google: C.yellow,
  crm: C.purple,
  asesoria: "#14b8a6",
};

export default function Billing() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = now.getDate();

  useEffect(() => {
    api.billingSummary().then(setSummary);
    api.billingCalendar(month).then(setCalendar);
    api.billingInvoices(month).then(data => {
      setInvoices(data.map((inv: any) => ({
        ...inv,
        items: typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items,
      })));
    });
    api.billingClients().then(setClients);
  }, []);

  async function createInvoice(clientId: number, items: { description: string; amount: number }[]) {
    const inv = await api.createInvoice({ client_id: clientId, items });
    inv.items = typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items;
    setInvoices(prev => [{ ...inv, client_name: clients.find(c => c.id === clientId)?.name || "" }, ...prev]);
    setShowCreate(false);
    api.billingSummary().then(setSummary);
    api.billingCalendar(month).then(setCalendar);
  }

  async function updateStatus(id: number, status: string) {
    await api.updateInvoice(id, { status });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    api.billingSummary().then(setSummary);
  }

  const calendarByDay = new Map<number, CalendarItem[]>();
  for (const item of calendar) {
    const day = item.billing_day;
    if (!calendarByDay.has(day)) calendarByDay.set(day, []);
    calendarByDay.get(day)!.push(item);
  }

  const monthName = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(now);

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          <SummaryCard label="Esperado mensual" value={fmt(Number(summary.expected_monthly))} accent={C.text} icon={<Calendar size={18} />} />
          <SummaryCard label="Cobrado" value={fmt(Number(summary.total_paid))} accent={C.greenSolid} icon={<CheckCircle size={18} />} />
          <SummaryCard label="Pendiente" value={fmt(Number(summary.total_pending))} accent={C.yellow} icon={<Clock size={18} />} />
          <SummaryCard label="Vencidas" value={String(summary.overdue)} accent={C.redSolid} icon={<AlertTriangle size={18} />} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
        {/* Calendar Column */}
        <div style={{
          background: C.card,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          padding: 20,
          alignSelf: "start",
        }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <Calendar size={16} style={{ color: C.textSec }} /> Calendario de cobros
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from(calendarByDay.entries())
              .sort(([a], [b]) => a - b)
              .map(([day, items]) => {
                const isPast = day < today;
                const isToday = day === today;
                return (
                  <div key={day} style={{
                    borderRadius: 8,
                    padding: "10px 12px",
                    border: `1px solid ${isToday ? C.yellow + "60" : C.border}`,
                    background: isToday ? C.yellow + "08" : "transparent",
                    opacity: isPast ? 0.5 : 1,
                    transition: "opacity 0.15s ease",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? C.yellow : "#c0c0d0" }}>
                        Dia {day} {isToday && <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>HOY</span>}
                      </span>
                    </div>
                    {items.map((item, i) => {
                      const sc = statusConfig[item.invoiceStatus || "draft"] || statusConfig.draft;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: catColors[item.category] || C.textSec,
                              display: "inline-block", flexShrink: 0,
                            }} />
                            <span style={{ color: C.textSec }}>{item.client_name}</span>
                            {item.invoiced && (
                              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: sc.bg, color: sc.color, fontWeight: 600 }}>
                                {sc.label}
                              </span>
                            )}
                          </div>
                          <span style={{ fontWeight: 600, color: C.text, fontSize: 11 }}>{fmt(item.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Invoices Column */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, fontSize: 15 }}>
              Cuentas de cobro <span style={{ color: C.textSec, fontWeight: 400, textTransform: "capitalize" }}>— {monthName}</span>
            </h3>
            <button
              onClick={() => setShowCreate(!showCreate)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", background: C.blueLight, color: "#ffffff",
                borderRadius: 6, fontSize: 13, fontWeight: 500,
              }}
            >
              {showCreate ? <X size={14} /> : <Plus size={14} />}
              {showCreate ? "Cerrar" : "Nueva"}
            </button>
          </div>

          {/* Quick Create Panel */}
          {showCreate && (
            <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.blueLight}40`, padding: 18, marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: C.textSec, marginBottom: 14 }}>Selecciona cliente para generar cuenta de cobro:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {clients.map(client => (
                  <div key={client.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: C.border, borderRadius: 8, padding: "12px 14px",
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{client.name}</p>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {client.services.map(svc => (
                          <span key={svc.id} style={{ fontSize: 10, color: C.textSec, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: catColors[svc.category] || C.textSec, display: "inline-block" }} />
                            {svc.description} — {fmt(svc.amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => createInvoice(client.id, client.services.map(s => ({ description: s.description, amount: s.amount })))}
                      style={{
                        padding: "6px 14px", background: C.greenSolid, color: "#ffffff",
                        borderRadius: 6, fontSize: 12, fontWeight: 600, flexShrink: 0,
                      }}
                    >
                      Generar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice Cards */}
          {invoices.length === 0 ? (
            <div style={{
              background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
              padding: "48px 24px", textAlign: "center", color: C.textSec, fontSize: 14,
            }}>
              No hay cuentas de cobro este mes
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {invoices.map(inv => {
                const sc = statusConfig[inv.status] || statusConfig.draft;
                const Icon = sc.Icon;
                return (
                  <div key={inv.id} style={{
                    background: C.card, borderRadius: 10, border: `1px solid ${C.border}`,
                    padding: "14px 18px", transition: "border-color 0.15s ease",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 32, height: 32, borderRadius: 8, background: sc.bg, color: sc.color,
                        }}>
                          <Icon size={16} />
                        </span>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14 }}>Cuenta No. {inv.number}</p>
                          <p style={{ fontSize: 12, color: C.textSec }}>{inv.client_name}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontWeight: 700, fontSize: 16 }}>{fmt(Number(inv.total))}</p>
                        <p style={{ fontSize: 11, color: C.textSec }}>{new Date(inv.issue_date).toLocaleDateString("es-CO")}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                      {inv.items.map((item: any, i: number) => (
                        <span key={i} style={{ background: C.border, padding: "3px 8px", borderRadius: 4, color: "#c0c0d0" }}>
                          {item.description}
                        </span>
                      ))}
                      <div style={{ flex: 1 }} />
                      {inv.status === "draft" && (
                        <button onClick={() => updateStatus(inv.id, "sent")} style={{
                          padding: "4px 12px", background: C.blueLight, color: "#ffffff",
                          borderRadius: 5, fontSize: 11, fontWeight: 600,
                        }}>
                          Marcar enviada
                        </button>
                      )}
                      {inv.status === "sent" && (
                        <button onClick={() => updateStatus(inv.id, "paid")} style={{
                          padding: "4px 12px", background: C.greenSolid, color: "#ffffff",
                          borderRadius: 5, fontSize: 11, fontWeight: 600,
                        }}>
                          Marcar pagada
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ color: accent, opacity: 0.7 }}>{icon}</span>
        <span style={{ fontSize: 11, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: 22, fontWeight: 700, color: accent, letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}
