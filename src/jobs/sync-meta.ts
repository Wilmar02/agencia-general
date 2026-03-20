import sql from "../db/index.js";
import "dotenv/config";

const META_TOKEN = process.env.META_ACCESS_TOKEN!;
const API_VERSION = "v21.0";
const FIELDS = "account_name,spend,impressions,clicks,reach,actions,action_values,cost_per_action_type,cpm,cpc,ctr";

interface MetaInsight {
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  ctr: string;
  cpm: string;
  cpc: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  date_start: string;
}

function extractConversions(actions: MetaInsight["actions"], tipo: string) {
  if (!actions) return { conversions: 0, convValue: 0 };
  let conv = 0;
  const leadTypes = ["lead", "onsite_conversion.lead_grouped", "onsite_conversion.total_messaging_connection", "onsite_conversion.messaging_conversation_started_7d"];
  const chatTypes = ["onsite_conversion.messaging_conversation_started_7d", "onsite_conversion.total_messaging_connection", "onsite_conversion.messaging_first_reply"];
  const purchaseTypes = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"];

  const types = tipo === "whatsapp" ? chatTypes : tipo === "ventas" ? purchaseTypes : leadTypes;
  for (const a of actions) {
    if (types.includes(a.action_type)) conv += parseInt(a.value) || 0;
  }
  return { conversions: conv, convValue: 0 };
}

function extractConvValue(actionValues: MetaInsight["action_values"]) {
  if (!actionValues) return 0;
  let total = 0;
  for (const av of actionValues) {
    if (["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"].includes(av.action_type)) {
      total += parseFloat(av.value) || 0;
    }
  }
  return total;
}

async function syncMeta() {
  const accounts = await sql`SELECT * FROM ad_accounts WHERE platform = 'meta' AND active = true`;
  console.log(`Sincronizando ${accounts.length} cuentas Meta...`);

  for (const acc of accounts) {
    try {
      const url = `https://graph.facebook.com/${API_VERSION}/${acc.account_id}/insights?fields=${FIELDS}&date_preset=last_30d&time_increment=1&access_token=${META_TOKEN}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const json = await res.json();

      if (!json.data?.length) {
        console.log(`  ⏭ ${acc.name}: sin datos`);
        continue;
      }

      for (const day of json.data as MetaInsight[]) {
        const spend = parseFloat(day.spend) || 0;
        const impressions = parseInt(day.impressions) || 0;
        const clicks = parseInt(day.clicks) || 0;
        const reach = parseInt(day.reach) || 0;
        const ctr = parseFloat(day.ctr) || 0;
        const cpm = parseFloat(day.cpm) || 0;
        const cpc = parseFloat(day.cpc) || 0;
        const { conversions } = extractConversions(day.actions, acc.tipo);
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
      console.log(`  ✓ ${acc.name}: ${json.data.length} días`);
    } catch (err: any) {
      console.error(`  ✗ ${acc.name}: ${err.message}`);
    }
  }

  // ── CAMPAIGNS ──
  console.log(`\nSincronizando campañas...`);
  const CAMP_FIELDS = "campaign_name,campaign_id,spend,impressions,clicks,reach,actions,action_values,cpm,cpc,ctr";

  for (const acc of accounts) {
    try {
      const url = `https://graph.facebook.com/${API_VERSION}/${acc.account_id}/insights?fields=${CAMP_FIELDS}&date_preset=last_30d&time_increment=1&level=campaign&limit=500&access_token=${META_TOKEN}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const json = await res.json();

      if (!json.data?.length) continue;

      let count = 0;
      for (const row of json.data) {
        const spend = parseFloat(row.spend) || 0;
        if (spend === 0) continue;
        const imp = parseInt(row.impressions) || 0;
        const clicks = parseInt(row.clicks) || 0;
        const { conversions } = extractConversions(row.actions, acc.tipo);
        const convValue = extractConvValue(row.action_values);
        const costPerConv = conversions > 0 ? spend / conversions : 0;
        const roas = spend > 0 && convValue > 0 ? convValue / spend : 0;

        await sql`
          INSERT INTO campaigns_daily (ad_account_id, campaign_id, campaign_name, date, spend, impressions, clicks, conversions, cost_per_conv, roas, status, raw_data)
          VALUES (${acc.id}, ${row.campaign_id}, ${row.campaign_name}, ${row.date_start}, ${spend}, ${imp}, ${clicks}, ${conversions}, ${costPerConv}, ${roas}, 'ACTIVE', ${JSON.stringify(row)})
          ON CONFLICT (ad_account_id, campaign_id, date)
          DO UPDATE SET spend=${spend}, impressions=${imp}, clicks=${clicks}, conversions=${conversions}, cost_per_conv=${costPerConv}, roas=${roas}, campaign_name=${row.campaign_name}, raw_data=${JSON.stringify(row)}, synced_at=now()
        `;
        count++;
      }
      if (count > 0) console.log(`  ✓ ${acc.name}: ${count} filas de campañas`);
    } catch (err: any) {
      console.error(`  ✗ ${acc.name} campañas: ${err.message}`);
    }
  }

  console.log("Sync Meta completado");
  await sql.end();
}

syncMeta().catch(console.error);
