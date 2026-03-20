import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sql from "../db/index.js";
import billingRouter from "./billing.js";
import cron from "node-cron";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3001");

app.use(express.json());
app.use(express.static(path.join(__dirname, "../../dist")));
app.use("/api/billing", billingRouter);

// GET /api/accounts — todas las cuentas
app.get("/api/accounts", async (_req, res) => {
  const accounts = await sql`SELECT * FROM ad_accounts WHERE active = true ORDER BY name`;
  res.json(accounts);
});

// GET /api/dashboard?days=7 — resumen general
app.get("/api/dashboard", async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const rows = await sql`
    SELECT
      a.id, a.name, a.platform, a.currency, a.tipo,
      COALESCE(SUM(m.spend), 0) as spend,
      COALESCE(SUM(m.impressions), 0) as impressions,
      COALESCE(SUM(m.clicks), 0) as clicks,
      COALESCE(SUM(m.conversions), 0) as conversions,
      CASE WHEN SUM(m.conversions) > 0 THEN SUM(m.spend) / SUM(m.conversions) ELSE 0 END as cost_per_conv,
      CASE WHEN SUM(m.spend) > 0 AND SUM(m.conv_value) > 0 THEN SUM(m.conv_value) / SUM(m.spend) ELSE 0 END as roas,
      CASE WHEN SUM(m.impressions) > 0 THEN (SUM(m.clicks)::numeric / SUM(m.impressions) * 100) ELSE 0 END as ctr
    FROM ad_accounts a
    LEFT JOIN metrics_daily m ON m.ad_account_id = a.id AND m.date >= CURRENT_DATE - ${days}
    WHERE a.active = true
    GROUP BY a.id, a.name, a.platform, a.currency, a.tipo
    ORDER BY spend DESC
  `;

  const totalSpendCOP = rows.filter(r => r.currency === "COP").reduce((s, r) => s + Number(r.spend), 0);
  const totalSpendUSD = rows.filter(r => r.currency === "USD").reduce((s, r) => s + Number(r.spend), 0);
  const totalLeads = rows.filter(r => r.tipo === "leads").reduce((s, r) => s + Number(r.conversions), 0);
  const totalChats = rows.filter(r => r.tipo === "whatsapp").reduce((s, r) => s + Number(r.conversions), 0);
  const totalVentas = rows.filter(r => r.tipo === "ventas").reduce((s, r) => s + Number(r.conversions), 0);

  res.json({ totalSpendCOP, totalSpendUSD, totalLeads, totalChats, totalVentas, accounts: rows });
});

// GET /api/metrics/:accountId?days=30 — métricas por cuenta
app.get("/api/metrics/:accountId", async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const rows = await sql`
    SELECT * FROM metrics_daily
    WHERE ad_account_id = ${req.params.accountId}
    AND date >= CURRENT_DATE - ${days}
    ORDER BY date ASC
  `;
  res.json(rows);
});

// GET /api/campaigns/:accountId?days=7 — campañas por cuenta
app.get("/api/campaigns/:accountId", async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const rows = await sql`
    SELECT campaign_name, campaign_id,
      SUM(spend) as spend, SUM(impressions) as impressions,
      SUM(clicks) as clicks, SUM(conversions) as conversions,
      CASE WHEN SUM(conversions) > 0 THEN SUM(spend)/SUM(conversions) ELSE 0 END as cost_per_conv
    FROM campaigns_daily
    WHERE ad_account_id = ${req.params.accountId}
    AND date >= CURRENT_DATE - ${days}
    GROUP BY campaign_name, campaign_id
    ORDER BY spend DESC
  `;
  res.json(rows);
});

// GET /api/alerts — alertas recientes
app.get("/api/alerts", async (_req, res) => {
  const rows = await sql`
    SELECT al.*, a.name as account_name
    FROM alerts al JOIN ad_accounts a ON al.account_id = a.id
    ORDER BY al.created_at DESC LIMIT 50
  `;
  res.json(rows);
});

// SPA fallback
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "../../dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
