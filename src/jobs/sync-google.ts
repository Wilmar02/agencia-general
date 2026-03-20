import sql from "../db/index.js";
import "dotenv/config";

const MCC_ID = "5289162933";
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN!;
const DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  return json.access_token;
}

async function queryGoogleAds(accessToken: string, customerId: string, query: string) {
  const res = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": DEV_TOKEN,
        "login-customer-id": MCC_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json[0]?.results || [];
}

async function syncGoogle() {
  const accounts = await sql`SELECT * FROM ad_accounts WHERE platform = 'google' AND active = true`;
  console.log(`Sincronizando ${accounts.length} cuentas Google Ads...`);

  const accessToken = await getAccessToken();

  const query = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpm,
      metrics.average_cpc,
      campaign.name,
      campaign.id
    FROM campaign
    WHERE segments.date DURING LAST_7_DAYS
    ORDER BY segments.date
  `;

  for (const acc of accounts) {
    try {
      const results = await queryGoogleAds(accessToken, acc.account_id, query);

      // Aggregate by date
      const byDate: Record<string, any> = {};
      for (const row of results) {
        const date = row.segments.date;
        const cost = Number(row.metrics.costMicros || 0) / 1_000_000;
        if (!byDate[date]) {
          byDate[date] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0 };
        }
        byDate[date].spend += cost;
        byDate[date].impressions += Number(row.metrics.impressions || 0);
        byDate[date].clicks += Number(row.metrics.clicks || 0);
        byDate[date].conversions += Number(row.metrics.conversions || 0);
        byDate[date].convValue += Number(row.metrics.conversionsValue || 0);
      }

      for (const [date, d] of Object.entries(byDate) as [string, any][]) {
        const ctr = d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0;
        const cpm = d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0;
        const cpc = d.clicks > 0 ? d.spend / d.clicks : 0;
        const costPerConv = d.conversions > 0 ? d.spend / d.conversions : 0;
        const roas = d.spend > 0 && d.convValue > 0 ? d.convValue / d.spend : 0;

        await sql`
          INSERT INTO metrics_daily (ad_account_id, date, spend, impressions, clicks, reach, ctr, cpm, cpc, conversions, cost_per_conv, roas, conv_value, raw_data)
          VALUES (${acc.id}, ${date}, ${d.spend}, ${d.impressions}, ${d.clicks}, 0, ${ctr}, ${cpm}, ${cpc}, ${d.conversions}, ${costPerConv}, ${roas}, ${d.convValue}, ${JSON.stringify(d)})
          ON CONFLICT (ad_account_id, date)
          DO UPDATE SET spend=${d.spend}, impressions=${d.impressions}, clicks=${d.clicks}, ctr=${ctr}, cpm=${cpm}, cpc=${cpc}, conversions=${d.conversions}, cost_per_conv=${costPerConv}, roas=${roas}, conv_value=${d.convValue}, raw_data=${JSON.stringify(d)}, synced_at=now()
        `;
      }

      // Also save campaign-level data
      for (const row of results) {
        const cost = Number(row.metrics.costMicros || 0) / 1_000_000;
        const conv = Number(row.metrics.conversions || 0);
        const costPerConv = conv > 0 ? cost / conv : 0;
        const roas = cost > 0 ? Number(row.metrics.conversionsValue || 0) / cost : 0;

        await sql`
          INSERT INTO campaigns_daily (ad_account_id, campaign_id, campaign_name, date, spend, impressions, clicks, conversions, cost_per_conv, roas, status, raw_data)
          VALUES (${acc.id}, ${String(row.campaign.id)}, ${row.campaign.name}, ${row.segments.date}, ${cost}, ${Number(row.metrics.impressions)}, ${Number(row.metrics.clicks)}, ${conv}, ${costPerConv}, ${roas}, 'ENABLED', ${JSON.stringify(row)})
          ON CONFLICT (ad_account_id, campaign_id, date)
          DO UPDATE SET spend=${cost}, impressions=${Number(row.metrics.impressions)}, clicks=${Number(row.metrics.clicks)}, conversions=${conv}, cost_per_conv=${costPerConv}, roas=${roas}, raw_data=${JSON.stringify(row)}, synced_at=now()
        `;
      }

      console.log(`  ✓ ${acc.name}: ${Object.keys(byDate).length} días, ${results.length} filas`);
    } catch (err: any) {
      console.error(`  ✗ ${acc.name}: ${err.message}`);
    }
  }

  console.log("Sync Google completado");
  await sql.end();
}

syncGoogle().catch(console.error);
