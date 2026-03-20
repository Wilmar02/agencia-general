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

function buildDateRange(daysBack: number): string {
  const now = new Date();
  const since = new Date(now.getTime() - daysBack * 86400000);
  const sinceStr = since.toISOString().slice(0, 10).replace(/-/g, "");
  const untilStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `segments.date BETWEEN '${sinceStr}' AND '${untilStr}'`;
}

async function syncGoogle(daysBack = 7) {
  // Check if credentials are configured
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.log("⏭ Google Ads sync: credenciales OAuth no configuradas (solo developer token)");
    return;
  }

  const accounts = await sql`SELECT * FROM ad_accounts WHERE platform = 'google' AND active = true`;
  console.log(`Sincronizando ${accounts.length} cuentas Google Ads [${daysBack}d]...`);

  const accessToken = await getAccessToken();
  const dateFilter = buildDateRange(daysBack);

  // ── ACCOUNT + CAMPAIGN LEVEL ──
  const campaignQuery = `
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
    WHERE ${dateFilter}
    ORDER BY segments.date
  `;

  for (const acc of accounts) {
    try {
      const results = await queryGoogleAds(accessToken, acc.account_id, campaignQuery);

      // Aggregate by date for account-level
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

      // Campaign-level with full metrics
      for (const row of results) {
        const cost = Number(row.metrics.costMicros || 0) / 1_000_000;
        const imp = Number(row.metrics.impressions || 0);
        const clicks = Number(row.metrics.clicks || 0);
        const conv = Number(row.metrics.conversions || 0);
        const convValue = Number(row.metrics.conversionsValue || 0);
        const ctr = imp > 0 ? (clicks / imp) * 100 : 0;
        const cpm = imp > 0 ? (cost / imp) * 1000 : 0;
        const cpc = clicks > 0 ? cost / clicks : 0;
        const costPerConv = conv > 0 ? cost / conv : 0;
        const roas = cost > 0 && convValue > 0 ? convValue / cost : 0;

        await sql`
          INSERT INTO campaigns_daily (ad_account_id, campaign_id, campaign_name, date, spend, impressions, clicks, reach, ctr, cpm, cpc, frequency, conversions, cost_per_conv, conv_value, roas, status, raw_data)
          VALUES (${acc.id}, ${String(row.campaign.id)}, ${row.campaign.name}, ${row.segments.date}, ${cost}, ${imp}, ${clicks}, 0, ${ctr}, ${cpm}, ${cpc}, 0, ${conv}, ${costPerConv}, ${convValue}, ${roas}, 'ENABLED', ${JSON.stringify(row)})
          ON CONFLICT (ad_account_id, campaign_id, date)
          DO UPDATE SET spend=${cost}, impressions=${imp}, clicks=${clicks}, ctr=${ctr}, cpm=${cpm}, cpc=${cpc}, conversions=${conv}, cost_per_conv=${costPerConv}, conv_value=${convValue}, roas=${roas}, raw_data=${JSON.stringify(row)}, synced_at=now()
        `;
      }

      console.log(`  ✓ ${acc.name}: ${Object.keys(byDate).length} días, ${results.length} filas`);
    } catch (err: any) {
      console.error(`  ✗ ${acc.name}: ${err.message}`);
    }
  }

  // ── AD GROUP LEVEL ──
  console.log(`\nSincronizando ad groups Google...`);
  const adGroupQuery = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value,
      ad_group.id,
      ad_group.name,
      campaign.id
    FROM ad_group
    WHERE ${dateFilter}
    ORDER BY segments.date
  `;

  for (const acc of accounts) {
    try {
      const results = await queryGoogleAds(accessToken, acc.account_id, adGroupQuery);
      let count = 0;
      for (const row of results) {
        const cost = Number(row.metrics.costMicros || 0) / 1_000_000;
        if (cost === 0) continue;
        const imp = Number(row.metrics.impressions || 0);
        const clicks = Number(row.metrics.clicks || 0);
        const conv = Number(row.metrics.conversions || 0);
        const convValue = Number(row.metrics.conversionsValue || 0);
        const ctr = imp > 0 ? (clicks / imp) * 100 : 0;
        const cpm = imp > 0 ? (cost / imp) * 1000 : 0;
        const cpc = clicks > 0 ? cost / clicks : 0;
        const costPerConv = conv > 0 ? cost / conv : 0;
        const roas = cost > 0 && convValue > 0 ? convValue / cost : 0;

        await sql`
          INSERT INTO adsets_daily (ad_account_id, campaign_id, adset_id, adset_name, date, spend, impressions, clicks, reach, ctr, cpm, cpc, frequency, conversions, cost_per_conv, conv_value, roas, status, raw_data)
          VALUES (${acc.id}, ${String(row.campaign.id)}, ${String(row.adGroup.id)}, ${row.adGroup.name}, ${row.segments.date}, ${cost}, ${imp}, ${clicks}, 0, ${ctr}, ${cpm}, ${cpc}, 0, ${conv}, ${costPerConv}, ${convValue}, ${roas}, 'ENABLED', ${JSON.stringify(row)})
          ON CONFLICT (ad_account_id, adset_id, date)
          DO UPDATE SET spend=${cost}, impressions=${imp}, clicks=${clicks}, ctr=${ctr}, cpm=${cpm}, cpc=${cpc}, conversions=${conv}, cost_per_conv=${costPerConv}, conv_value=${convValue}, roas=${roas}, adset_name=${row.adGroup.name}, raw_data=${JSON.stringify(row)}, synced_at=now()
        `;
        count++;
      }
      if (count > 0) console.log(`  ✓ ${acc.name}: ${count} ad groups`);
    } catch (err: any) {
      console.error(`  ✗ ${acc.name} ad groups: ${err.message}`);
    }
  }

  // ── AD LEVEL ──
  console.log(`\nSincronizando anuncios Google...`);
  const adQuery = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value,
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.ad.type,
      ad_group.id,
      campaign.id
    FROM ad_group_ad
    WHERE ${dateFilter}
    ORDER BY segments.date
  `;

  for (const acc of accounts) {
    try {
      const results = await queryGoogleAds(accessToken, acc.account_id, adQuery);
      let count = 0;
      for (const row of results) {
        const cost = Number(row.metrics.costMicros || 0) / 1_000_000;
        if (cost === 0) continue;
        const imp = Number(row.metrics.impressions || 0);
        const clicks = Number(row.metrics.clicks || 0);
        const conv = Number(row.metrics.conversions || 0);
        const convValue = Number(row.metrics.conversionsValue || 0);
        const ctr = imp > 0 ? (clicks / imp) * 100 : 0;
        const cpm = imp > 0 ? (cost / imp) * 1000 : 0;
        const cpc = clicks > 0 ? cost / clicks : 0;
        const costPerConv = conv > 0 ? cost / conv : 0;
        const roas = cost > 0 && convValue > 0 ? convValue / cost : 0;
        const ad = row.adGroupAd?.ad || {};

        await sql`
          INSERT INTO ads_daily (ad_account_id, campaign_id, adset_id, ad_id, ad_name, date, spend, impressions, clicks, reach, ctr, cpm, cpc, frequency, conversions, cost_per_conv, conv_value, roas, creative_type, status, raw_data)
          VALUES (${acc.id}, ${String(row.campaign.id)}, ${String(row.adGroup.id)}, ${String(ad.id || '')}, ${ad.name || 'Ad'}, ${row.segments.date}, ${cost}, ${imp}, ${clicks}, 0, ${ctr}, ${cpm}, ${cpc}, 0, ${conv}, ${costPerConv}, ${convValue}, ${roas}, ${ad.type || null}, 'ENABLED', ${JSON.stringify(row)})
          ON CONFLICT (ad_account_id, ad_id, date)
          DO UPDATE SET spend=${cost}, impressions=${imp}, clicks=${clicks}, ctr=${ctr}, cpm=${cpm}, cpc=${cpc}, conversions=${conv}, cost_per_conv=${costPerConv}, conv_value=${convValue}, roas=${roas}, raw_data=${JSON.stringify(row)}, synced_at=now()
        `;
        count++;
      }
      if (count > 0) console.log(`  ✓ ${acc.name}: ${count} anuncios`);
    } catch (err: any) {
      console.error(`  ✗ ${acc.name} anuncios: ${err.message}`);
    }
  }

  console.log("Sync Google completado");
}

// If run directly: full sync
const isDirectRun = process.argv[1]?.includes("sync-google");
if (isDirectRun) {
  const days = parseInt(process.argv[2] || "7");
  syncGoogle(days).then(() => sql.end()).catch(console.error);
}

export { syncGoogle };
