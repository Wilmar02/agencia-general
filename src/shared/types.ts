export interface AdAccount {
  id: number;
  platform: "meta" | "google";
  account_id: string;
  name: string;
  currency: string;
  tipo: string;
  active: boolean;
}

export interface MetricDaily {
  id: number;
  ad_account_id: number;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpm: number;
  cpc: number;
  conversions: number;
  cost_per_conv: number;
  roas: number;
  conv_value: number;
}

export interface DashboardSummary {
  totalSpendCOP: number;
  totalSpendUSD: number;
  totalLeads: number;
  totalChats: number;
  totalVentas: number;
  accounts: AccountSummary[];
}

export interface AccountSummary {
  id: number;
  name: string;
  platform: string;
  currency: string;
  tipo: string;
  spend: number;
  conversions: number;
  costPerConv: number;
  roas: number;
  ctr: number;
  trend: number; // % vs yesterday
  alert?: string;
}
