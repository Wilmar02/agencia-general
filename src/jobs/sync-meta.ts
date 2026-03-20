import sql from "../db/index.js";
import "dotenv/config";

const META_TOKEN = process.env.META_ACCESS_TOKEN!;
const API_VERSION = "v21.0";
const FIELDS = "account_name,spend,impressions,clicks,reach,actions,action_values,cost_per_action_type,cpm,cpc,ctr,frequency";
const CAMP_FIELDS = "campaign_name,campaign_id,spend,impressions,clicks,reach,actions,action_values,cpm,cpc,ctr,frequency,objective";

function toDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function extractConversions(actions: any[] | undefined, tipo: string) {
  if (!actions) return 0;
  // Messaging: include both onsite_conversion.* prefixed and non-prefixed variants
  const chatTypes = [
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection",
    "onsite_conversion.messaging_first_reply",
    "messaging_conversation_started_7d",
    "total_messaging_connection",
    "messaging_first_reply",
    "onsite_conversion.messaging_welcome_message_view",
  ];
  const purchaseTypes = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"];
  const leadTypes = ["lead", "onsite_conversion.lead_grouped", ...chatTypes];
  const types = tipo === "whatsapp" ? chatTypes : tipo === "ventas" ? purchaseTypes : leadTypes;
  let conv = 0;
  for (const a of actions) {
    if (types.includes(a.action_type)) conv += parseInt(a.value) || 0;
  }
  return conv;
}

function extractConvValue(actionValues: any[] | undefined) {
  if (!actionValues) return 0;
  let total = 0;
  for (const av of actionValues) {
    if (["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"].includes(av.action_type)) {
      total += parseFloat(av.value) || 0;
    }
  }
  return total;
}

async function fetchAllPages(url: string): Promise<any[]> {
  const all: any[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const res = await fetch(nextUrl, { signal: AbortSignal.timeout(20000) });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    if (json.data) all.push(...json.data);
    nextUrl = json.paging?.next || null;
  }
  return all;
}

async function syncMeta(daysBack = 30) {
  const accounts = await sql`SELECT * FROM ad_accounts WHERE platform = 'meta' AND active = true`;
  const now = new Date();
  const since = toDate(new Date(now.getTime() - daysBack * 86400000));
  const until = toDate(now);

  console.log(`Sincronizando ${accounts.length} cuentas Meta [${since} → ${until}]...`);

  // ── ACCOUNT LEVEL ──
  for (const acc of accounts) {
    try {
      const url = `https://graph.facebook.com/${API_VERSION}/${acc.account_id}/insights?fields=${FIELDS}&time_range={"since":"${since}","until":"${until}"}&time_increment=1&access_token=${META_TOKEN}`;
      const data = await fetchAllPages(url);

      if (!data.length) { console.log(`  ⏭ ${acc.name}: sin datos`); continue; }

      for (const day of data) {
        const spend = parseFloat(day.spend) || 0;
        const impressions = parseInt(day.impressions) || 0;
        const clicks = parseInt(day.clicks) || 0;
        const reach = parseInt(day.reach) || 0;
        const ctr = parseFloat(day.ctr) || 0;
        const cpm = parseFloat(day.cpm) || 0;
        const cpc = parseFloat(day.cpc) || 0;
        const conversions = extractConversions(day.actions, acc.tipo);
        const convValue = extractConvValue(day.action_values);
        const costPerConv = conversions > 0 ? spend / conversions : 0;
        const roas = spend > 0 && convValue > 0 ? convValue / spend : 0;

        await sql`
          INSERT INTO metrics_daily (ad_account_id, date, spend, impressions, clicks, reach, ctr, cpm, cpc, conversions, cost_per_conv, roas, conv_value, raw_data)
          VALUES (${acc.id}, ${day.date_start}, ${spend}, ${impressions}, ${clicks}, ${reach}, ${ctr}, ${cpm}, ${cpc}, ${conversions}, ${costPerConv}, ${roas}, ${convValue}, ${JSON.stringify(day)})
          ON CONFLICT (ad_account_id, date)
          DO UPDATE SET spend=${spend}, impressions=${impressions}, clicks=${clicks}, reach=${reach}, ctr=${ctr}, cpm=${cpm}, cpc=${cpc}, conversions=${conversions}, cost_per_conv=${costPerConv}, roas=${roas}, conv_value=${convValue}, raw_data=${JSON.stringify(day)}, synced_at=now()
        `;
      }
      console.log(`  ✓ ${acc.name}: ${data.length} días`);
    } catch (err: any) {
      console.error(`  ✗ ${acc.name}: ${err.message}`);
    }
  }

  // ── CAMPAIGN LEVEL ──
  console.log(`\nSincronizando campañas [${since} → ${until}]...`);
  for (const acc of accounts) {
    try {
      const url = `https://graph.facebook.com/${API_VERSION}/${acc.account_id}/insights?fields=${CAMP_FIELDS}&time_range={"since":"${since}","until":"${until}"}&time_increment=1&level=campaign&limit=500&access_token=${META_TOKEN}`;
      const data = await fetchAllPages(url);

      if (!data.length) continue;

      let count = 0;
      for (const row of data) {
        const spend = parseFloat(row.spend) || 0;
        if (spend === 0) continue;
        const imp = parseInt(row.impressions) || 0;
        const clicks = parseInt(row.clicks) || 0;
        const reach = parseInt(row.reach) || 0;
        const ctr = parseFloat(row.ctr) || 0;
        const cpm = parseFloat(row.cpm) || 0;
        const cpc = parseFloat(row.cpc) || 0;
        const frequency = parseFloat(row.frequency) || 0;
        const conversions = extractConversions(row.actions, acc.tipo);
        const convValue = extractConvValue(row.action_values);
        const costPerConv = conversions > 0 ? spend / conversions : 0;
        const roas = spend > 0 && convValue > 0 ? convValue / spend : 0;
        const objective = row.objective || null;

        await sql`
          INSERT INTO campaigns_daily (ad_account_id, campaign_id, campaign_name, date, spend, impressions, clicks, reach, ctr, cpm, cpc, frequency, conversions, cost_per_conv, conv_value, roas, objective, status, raw_data)
          VALUES (${acc.id}, ${row.campaign_id}, ${row.campaign_name}, ${row.date_start}, ${spend}, ${imp}, ${clicks}, ${reach}, ${ctr}, ${cpm}, ${cpc}, ${frequency}, ${conversions}, ${costPerConv}, ${convValue}, ${roas}, ${objective}, 'ACTIVE', ${JSON.stringify(row)})
          ON CONFLICT (ad_account_id, campaign_id, date)
          DO UPDATE SET spend=${spend}, impressions=${imp}, clicks=${clicks}, reach=${reach}, ctr=${ctr}, cpm=${cpm}, cpc=${cpc}, frequency=${frequency}, conversions=${conversions}, cost_per_conv=${costPerConv}, conv_value=${convValue}, roas=${roas}, objective=${objective}, campaign_name=${row.campaign_name}, raw_data=${JSON.stringify(row)}, synced_at=now()
        `;
        count++;
      }
      if (count > 0) console.log(`  ✓ ${acc.name}: ${count} filas de campañas`);
    } catch (err: any) {
      console.error(`  ✗ ${acc.name} campañas: ${err.message}`);
    }
  }

  console.log("Sync Meta completado");
}

// If run directly: full 30-day sync
// If imported: export for cron use
const isDirectRun = process.argv[1]?.includes("sync-meta");
if (isDirectRun) {
  const days = parseInt(process.argv[2] || "30");
  syncMeta(days).then(() => sql.end()).catch(console.error);
}

export { syncMeta };
