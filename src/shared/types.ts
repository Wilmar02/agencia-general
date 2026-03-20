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

export interface CampaignDaily {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpm: number;
  cpc: number;
  frequency: number;
  conversions: number;
  cost_per_conv: number;
  conv_value: number;
  roas: number;
  objective: string | null;
  status: string | null;
}

export interface AdsetDaily {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpm: number;
  cpc: number;
  frequency: number;
  conversions: number;
  cost_per_conv: number;
  conv_value: number;
  roas: number;
  daily_budget: number;
  lifetime_budget: number;
  status: string | null;
}

export interface AdDaily {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  campaign_id: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpm: number;
  cpc: number;
  frequency: number;
  conversions: number;
  cost_per_conv: number;
  conv_value: number;
  roas: number;
  thumbnail_url: string | null;
  body_text: string | null;
  title: string | null;
  creative_type: string | null;
  call_to_action: string | null;
  status: string | null;
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
  trend: number;
  alert?: string;
}

export interface PerformanceScore {
  accountId: number;
  name: string;
  platform: string;
  currency: string;
  tipo: string;
  score: number;
  trend: string;
  status: "good" | "warning" | "bad";
  spend: number;
  conversions: number;
  costPerConv: number;
  ctr: number;
  roas: number;
}

export interface Alert {
  account: string;
  accountId: number;
  type: string;
  message: string;
  severity: "critical" | "high" | "medium" | "info";
  suggestion: string;
}
