import sql from "../db/index.js";
import "dotenv/config";

const META_TOKEN = process.env.META_ACCESS_TOKEN!;
const API_VERSION = "v21.0";
const FIELDS = "account_name,spend,impressions,clicks,reach,actions,action_values,cost_per_action_type,cpm,cpc,ctr,frequency";
const CAMP_FIELDS = "campaign_name,campaign_id,spend,impressions,clicks,reach,actions,action_values,cpm,cpc,ctr,frequency,objective";
const ADSET_FIELDS = "adset_name,adset_id,campaign_id,spend,impressions,clicks,reach,actions,action_values,cpm,cpc,ctr,frequency";
const AD_FIELDS = "ad_name,ad_id,adset_id,campaign_id,spend,impressions,clicks,reach,actions,action_values,cpm,cpc,ctr,frequency";

function toDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function extractConversions(actions: any[] | undefined, tipo: string) {
  if (!actions) return 0;
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
    const res: Response = await fetch(nextUrl, { signal: AbortSignal.timeout(30000) });
    const json: any = await res.json();
    if (json.error) {
      // Rate limit handling: error code 17
      if (json.error.code === 17) {
        console.log("  ⏳ Rate limit alcanzado, esperando 60s...");
        await new Promise(r => setTimeout(r, 60000));
        continue; // retry same URL
      }
      throw new Error(json.error.message);
    }
    if (json.data) all.push(...json.data);
    nextUrl = json.paging?.next || null;
  }
  return all;
}

async function fetchCreativeData(adIds: string[]): Promise<Map<string, any>> {
  const creatives = new Map<string, any>();
  // Batch in groups of 50 to avoid rate limits
  for (let i = 0; i < adIds.length; i += 50) {
    const batch = adIds.slice(i, i + 50);
    const promises = batch.map(async (adId) => {
      try {
        const url = `https://graph.facebook.com/${API_VERSION}/${adId}?fields=creative{thumbnail_url,body,title,call_to_action_type,object_type}&access_token=${META_TOKEN}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const json = await res.json();
        if (json.creative) {
          creatives.set(adId, {
            thumbnail_url: json.creative.thumbnail_url || null,
            body: json.creative.body || null,
            title: json.creative.title || null,
            call_to_action: json.creative.call_to_action_type || null,
            creative_type: json.creative.object_type || null,
          });
        }
      } catch {
        // Skip individual creative fetch errors
      }
    });
    await Promise.all(promises);
    // Small delay between batches
    if (i + 50 < adIds.length) await new Promise(r => setTimeout(r, 2000));
  }
  return creatives;
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

  // ── ADSET LEVEL ──
  console.log(`\nSincronizando ad sets [${since} → ${until}]...`);
  for (const acc of accounts) {
    try {
      const url = `https://graph.facebook.com/${API_VERSION}/${acc.account_id}/insights?fields=${ADSET_FIELDS}&time_range={"since":"${since}","until":"${until}"}&time_increment=1&level=adset&limit=500&access_token=${META_TOKEN}`;
      const data = await fetchAllPages(url);

      if (!data.length) continue;

      // Fetch adset budgets
      const adsetBudgets = new Map<string, { daily: number; lifetime: number }>();
      try {
        const budgetUrl = `https://graph.facebook.com/${API_VERSION}/${acc.account_id}/adsets?fields=id,daily_budget,lifetime_budget&limit=500&access_token=${META_TOKEN}`;
        const budgetData = await fetchAllPages(budgetUrl);
        for (const as of budgetData) {
          adsetBudgets.set(as.id, {
            daily: parseFloat(as.daily_budget) || 0,
            lifetime: parseFloat(as.lifetime_budget) || 0,
          });
        }
      } catch { /* budget fetch optional */ }

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
        const budget = adsetBudgets.get(row.adset_id);

        await sql`
          INSERT INTO adsets_daily (ad_account_id, campaign_id, adset_id, adset_name, date, spend, impressions, clicks, reach, ctr, cpm, cpc, frequency, conversions, cost_per_conv, conv_value, roas, daily_budget, lifetime_budget, status, raw_data)
          VALUES (${acc.id}, ${row.campaign_id}, ${row.adset_id}, ${row.adset_name}, ${row.date_start}, ${spend}, ${imp}, ${clicks}, ${reach}, ${ctr}, ${cpm}, ${cpc}, ${frequency}, ${conversions}, ${costPerConv}, ${convValue}, ${roas}, ${budget?.daily || 0}, ${budget?.lifetime || 0}, 'ACTIVE', ${JSON.stringify(row)})
          ON CONFLICT (ad_account_id, adset_id, date)
          DO UPDATE SET spend=${spend}, impressions=${imp}, clicks=${clicks}, reach=${reach}, ctr=${ctr}, cpm=${cpm}, cpc=${cpc}, frequency=${frequency}, conversions=${conversions}, cost_per_conv=${costPerConv}, conv_value=${convValue}, roas=${roas}, daily_budget=${budget?.daily || 0}, lifetime_budget=${budget?.lifetime || 0}, adset_name=${row.adset_name}, raw_data=${JSON.stringify(row)}, synced_at=now()
        `;
        count++;
      }
      if (count > 0) console.log(`  ✓ ${acc.name}: ${count} filas de ad sets`);
    } catch (err: any) {
      console.error(`  ✗ ${acc.name} ad sets: ${err.message}`);
    }
  }

  // ── AD LEVEL ──
  console.log(`\nSincronizando anuncios [${since} → ${until}]...`);
  for (const acc of accounts) {
    try {
      const url = `https://graph.facebook.com/${API_VERSION}/${acc.account_id}/insights?fields=${AD_FIELDS}&time_range={"since":"${since}","until":"${until}"}&time_increment=1&level=ad&limit=500&access_token=${META_TOKEN}`;
      const data = await fetchAllPages(url);

      if (!data.length) continue;

      // Collect unique ad IDs for creative fetch
      const uniqueAdIds = [...new Set(data.map((r: any) => r.ad_id))];
      const creatives = await fetchCreativeData(uniqueAdIds);

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
        const creative = creatives.get(row.ad_id);

        await sql`
          INSERT INTO ads_daily (ad_account_id, campaign_id, adset_id, ad_id, ad_name, date, spend, impressions, clicks, reach, ctr, cpm, cpc, frequency, conversions, cost_per_conv, conv_value, roas, thumbnail_url, body_text, title, creative_type, call_to_action, status, raw_data)
          VALUES (${acc.id}, ${row.campaign_id}, ${row.adset_id}, ${row.ad_id}, ${row.ad_name}, ${row.date_start}, ${spend}, ${imp}, ${clicks}, ${reach}, ${ctr}, ${cpm}, ${cpc}, ${frequency}, ${conversions}, ${costPerConv}, ${convValue}, ${roas}, ${creative?.thumbnail_url || null}, ${creative?.body || null}, ${creative?.title || null}, ${creative?.creative_type || null}, ${creative?.call_to_action || null}, 'ACTIVE', ${JSON.stringify(row)})
          ON CONFLICT (ad_account_id, ad_id, date)
          DO UPDATE SET spend=${spend}, impressions=${imp}, clicks=${clicks}, reach=${reach}, ctr=${ctr}, cpm=${cpm}, cpc=${cpc}, frequency=${frequency}, conversions=${conversions}, cost_per_conv=${costPerConv}, conv_value=${convValue}, roas=${roas}, thumbnail_url=${creative?.thumbnail_url || null}, body_text=${creative?.body || null}, title=${creative?.title || null}, creative_type=${creative?.creative_type || null}, call_to_action=${creative?.call_to_action || null}, ad_name=${row.ad_name}, raw_data=${JSON.stringify(row)}, synced_at=now()
        `;
        count++;
      }
      if (count > 0) console.log(`  ✓ ${acc.name}: ${count} filas de anuncios`);
    } catch (err: any) {
      console.error(`  ✗ ${acc.name} anuncios: ${err.message}`);
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
