import { useState, useEffect } from "react";
import { FileText, Send, CheckCircle, Clock, Plus, Calendar, DollarSign, AlertTriangle } from "lucide-react";

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
const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: "Borrador", color: "text-gray-400", bg: "bg-gray-400/10", icon: FileText },
  sent: { label: "Enviada", color: "text-blue-400", bg: "bg-blue-400/10", icon: Send },
  paid: { label: "Pagada", color: "text-green-400", bg: "bg-green-400/10", icon: CheckCircle },
  overdue: { label: "Vencida", color: "text-red-400", bg: "bg-red-400/10", icon: AlertTriangle },
};
const catColors: Record<string, string> = {
  meta: "bg-blue-500",
  google: "bg-yellow-500",
  crm: "bg-purple-500",
  asesoria: "bg-teal-500",
};

export default function Billing() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = now.getDate();

  useEffect(() => {
    fetch("/api/billing/summary").then(r => r.json()).then(setSummary);
    fetch(`/api/billing/calendar?month=${month}`).then(r => r.json()).then(setCalendar);
    fetch(`/api/billing/invoices?month=${month}`).then(r => r.json()).then(setInvoices);
    fetch("/api/billing/clients").then(r => r.json()).then(setClients);
  }, []);

  async function createInvoice(clientId: number, items: { description: string; amount: number }[]) {
    const res = await fetch("/api/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, items }),
    });
    const inv = await res.json();
    setInvoices(prev => [{ ...inv, client_name: clients.find(c => c.id === clientId)?.name || "" }, ...prev]);
    setShowCreate(false);
    // Refresh
    fetch("/api/billing/summary").then(r => r.json()).then(setSummary);
    fetch(`/api/billing/calendar?month=${month}`).then(r => r.json()).then(setCalendar);
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/billing/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    fetch("/api/billing/summary").then(r => r.json()).then(setSummary);
  }

  // Group calendar by day
  const calendarByDay = new Map<number, CalendarItem[]>();
  for (const item of calendar) {
    const day = item.billing_day;
    if (!calendarByDay.has(day)) calendarByDay.set(day, []);
    calendarByDay.get(day)!.push(item);
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Esperado mensual" value={fmt(Number(summary.expected_monthly))} color="text-white" icon={<Calendar size={18} />} />
          <SummaryCard label="Cobrado" value={fmt(Number(summary.total_paid))} color="text-green-400" icon={<CheckCircle size={18} />} />
          <SummaryCard label="Pendiente" value={fmt(Number(summary.total_pending))} color="text-yellow-400" icon={<Clock size={18} />} />
          <SummaryCard label="Vencidas" value={String(summary.overdue)} color="text-red-400" icon={<AlertTriangle size={18} />} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1 bg-gray-900 rounded-lg border border-gray-800 p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar size={16} /> Calendario de cobros
          </h3>
          <div className="space-y-2">
            {Array.from(calendarByDay.entries())
              .sort(([a], [b]) => a - b)
              .map(([day, items]) => (
                <div key={day} className={`rounded-lg p-3 border ${day < today ? "border-gray-800 opacity-60" : day === today ? "border-yellow-500 bg-yellow-500/5" : "border-gray-800"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${day === today ? "text-yellow-400" : "text-gray-300"}`}>
                      Día {day} {day === today && "← HOY"}
                    </span>
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs mt-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${catColors[item.category] || "bg-gray-500"}`} />
                        <span className="text-gray-400">{item.client_name}</span>
                        {item.invoiced && (
                          <span className={`px-1 rounded text-[10px] ${statusConfig[item.invoiceStatus || "draft"]?.bg} ${statusConfig[item.invoiceStatus || "draft"]?.color}`}>
                            {statusConfig[item.invoiceStatus || "draft"]?.label}
                          </span>
                        )}
                      </div>
                      <span className="text-white font-medium">{fmt(item.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>

        {/* Invoices List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Cuentas de cobro — {new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(now)}</h3>
            <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm">
              <Plus size={14} /> Nueva
            </button>
          </div>

          {/* Quick Create */}
          {showCreate && (
            <div className="bg-gray-900 rounded-lg border border-blue-500/50 p-4 space-y-3">
              <p className="text-sm text-gray-400">Selecciona cliente para generar cuenta de cobro:</p>
              {clients.map(client => (
                <div key={client.id} className="flex items-center justify-between bg-gray-800 rounded p-3">
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <div className="flex gap-2 mt-1">
                      {client.services.map(s => (
                        <span key={s.id} className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${catColors[s.category]}`} />
                          {s.description} — {fmt(s.amount)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => createInvoice(client.id, client.services.map(s => ({ description: s.description, amount: s.amount })))}
                    className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs"
                  >
                    Generar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Invoice Cards */}
          {invoices.length === 0 ? (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center text-gray-500">
              No hay cuentas de cobro este mes
            </div>
          ) : (
            invoices.map(inv => {
              const sc = statusConfig[inv.status] || statusConfig.draft;
              const Icon = sc.icon;
              return (
                <div key={inv.id} className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`p-1.5 rounded ${sc.bg} ${sc.color}`}><Icon size={16} /></span>
                      <div>
                        <p className="font-medium text-sm">Cuenta No. {inv.number}</p>
                        <p className="text-xs text-gray-400">{inv.client_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{fmt(Number(inv.total))}</p>
                      <p className="text-xs text-gray-400">{new Date(inv.issue_date).toLocaleDateString("es-CO")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {inv.items.map((item: any, i: number) => (
                      <span key={i} className="bg-gray-800 px-2 py-0.5 rounded text-gray-300">{item.description}</span>
                    ))}
                    <div className="flex-1" />
                    {inv.status === "draft" && (
                      <button onClick={() => updateStatus(inv.id, "sent")} className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded">Marcar enviada</button>
                    )}
                    {inv.status === "sent" && (
                      <button onClick={() => updateStatus(inv.id, "paid")} className="px-2 py-0.5 bg-green-600 hover:bg-green-500 rounded">Marcar pagada</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`${color} opacity-70`}>{icon}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
