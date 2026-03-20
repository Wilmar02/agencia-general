async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url}: ${res.status}`);
  return res.json();
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${url}: ${res.status}`);
  return res.json();
}

async function patch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${url}: ${res.status}`);
  return res.json();
}

export const api = {
  // Dashboard
  insights: (days: number) => get<any>(`/api/insights?days=${days}`),
  syncStatus: () => get<{ lastSync: string; nextSync: string }>("/api/sync/status"),
  syncNow: () => post<{ ok: boolean }>("/api/sync/now"),

  // Account detail
  metrics: (accountId: number, days: number) => get<any[]>(`/api/metrics/${accountId}?days=${days}`),
  campaigns: (accountId: number, days: number) => get<any[]>(`/api/campaigns/${accountId}?days=${days}`),
  adsets: (accountId: number, days: number, campaignId?: string) => {
    let url = `/api/adsets/${accountId}?days=${days}`;
    if (campaignId) url += `&campaign_id=${campaignId}`;
    return get<any[]>(url);
  },
  ads: (accountId: number, days: number, adsetId?: string) => {
    let url = `/api/ads/${accountId}?days=${days}`;
    if (adsetId) url += `&adset_id=${adsetId}`;
    return get<any[]>(url);
  },

  // Alerts
  alertsHistory: (days: number) => get<any[]>(`/api/alerts/history?days=${days}`),

  // Billing
  billingClients: () => get<any[]>("/api/billing/clients"),
  billingSummary: () => get<any>("/api/billing/summary"),
  billingCalendar: (month: string) => get<any[]>(`/api/billing/calendar?month=${month}`),
  billingInvoices: (month: string) => get<any[]>(`/api/billing/invoices?month=${month}`),
  createInvoice: (data: { client_id: number; items: any[] }) => post<any>("/api/billing/invoices", data),
  updateInvoice: (id: number, data: { status: string }) => patch<any>(`/api/billing/invoices/${id}`, data),
};
