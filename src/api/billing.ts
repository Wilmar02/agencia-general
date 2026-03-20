import { Router } from "express";
import sql from "../db/index.js";

const router = Router();

// GET /api/billing/clients — clientes con sus servicios
router.get("/clients", async (_req, res) => {
  const clients = await sql`
    SELECT c.*,
      COALESCE(json_agg(json_build_object(
        'id', s.id, 'description', s.description, 'amount', s.amount,
        'billing_day', s.billing_day, 'category', s.category, 'active', s.active
      )) FILTER (WHERE s.id IS NOT NULL), '[]') as services
    FROM billing_clients c
    LEFT JOIN billing_services s ON s.client_id = c.id AND s.active = true
    WHERE c.active = true
    GROUP BY c.id
    ORDER BY c.name
  `;
  res.json(clients);
});

// GET /api/billing/invoices?month=2026-03&status=sent
router.get("/invoices", async (req, res) => {
  const { month, status, client_id } = req.query;
  let query = sql`
    SELECT i.*, bc.name as client_name, bc.email as client_email
    FROM invoices i
    JOIN billing_clients bc ON i.client_id = bc.id
    WHERE 1=1
  `;
  // Build dynamic query
  const conditions: any[] = [];
  if (month) {
    const [y, m] = (month as string).split("-");
    query = sql`
      SELECT i.*, bc.name as client_name, bc.email as client_email
      FROM invoices i JOIN billing_clients bc ON i.client_id = bc.id
      WHERE EXTRACT(YEAR FROM i.issue_date) = ${parseInt(y)}
      AND EXTRACT(MONTH FROM i.issue_date) = ${parseInt(m)}
      ${status ? sql`AND i.status = ${status}` : sql``}
      ${client_id ? sql`AND i.client_id = ${parseInt(client_id as string)}` : sql``}
      ORDER BY i.issue_date DESC
    `;
  } else {
    query = sql`
      SELECT i.*, bc.name as client_name, bc.email as client_email
      FROM invoices i JOIN billing_clients bc ON i.client_id = bc.id
      WHERE 1=1
      ${status ? sql`AND i.status = ${status}` : sql``}
      ${client_id ? sql`AND i.client_id = ${parseInt(client_id as string)}` : sql``}
      ORDER BY i.issue_date DESC LIMIT 50
    `;
  }
  const rows = await query;
  res.json(rows);
});

// GET /api/billing/calendar?month=2026-03 — cobros del mes
router.get("/calendar", async (req, res) => {
  const now = new Date();
  const month = (req.query.month as string) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = month.split("-").map(Number);

  // Get all active services with their billing days
  const services = await sql`
    SELECT s.*, c.name as client_name, c.email as client_email
    FROM billing_services s
    JOIN billing_clients c ON s.client_id = c.id
    WHERE s.active = true AND c.active = true
    ORDER BY s.billing_day, c.name
  `;

  // Check which have been invoiced this month
  const invoiced = await sql`
    SELECT client_id, status, items FROM invoices
    WHERE EXTRACT(YEAR FROM issue_date) = ${y}
    AND EXTRACT(MONTH FROM issue_date) = ${m}
  `;

  const invoicedMap = new Map<number, string>();
  for (const inv of invoiced) {
    invoicedMap.set(inv.client_id, inv.status);
  }

  const calendar = services.map((s: any) => ({
    ...s,
    date: `${month}-${String(s.billing_day).padStart(2, "0")}`,
    invoiced: invoicedMap.has(s.client_id),
    invoiceStatus: invoicedMap.get(s.client_id) || null,
  }));

  res.json(calendar);
});

// POST /api/billing/invoices — generar cuenta de cobro
router.post("/invoices", async (req, res) => {
  const { client_id, items, due_date } = req.body;

  // Get next number
  const [config] = await sql`SELECT value FROM billing_config WHERE key = 'last_invoice_number'`;
  const nextNum = parseInt(config.value) + 1;

  const total = items.reduce((s: number, i: any) => s + i.amount, 0);

  const [client] = await sql`SELECT * FROM billing_clients WHERE id = ${client_id}`;
  if (!client) return res.status(404).json({ error: "Cliente no encontrado" });

  const [invoice] = await sql`
    INSERT INTO invoices (number, client_id, issue_date, due_date, items, subtotal, total, currency, status)
    VALUES (${nextNum}, ${client_id}, CURRENT_DATE, ${due_date || null}, ${JSON.stringify(items)}, ${total}, ${total}, ${client.currency}, 'draft')
    RETURNING *
  `;

  await sql`UPDATE billing_config SET value = ${String(nextNum)} WHERE key = 'last_invoice_number'`;

  res.json(invoice);
});

// PATCH /api/billing/invoices/:id — actualizar status
router.patch("/invoices/:id", async (req, res) => {
  const { status } = req.body;
  const updates: any = { status };
  if (status === "sent") updates.sent_at = new Date();
  if (status === "paid") updates.paid_at = new Date();

  const [invoice] = await sql`
    UPDATE invoices SET
      status = ${status},
      sent_at = ${status === "sent" ? sql`now()` : sql`sent_at`},
      paid_at = ${status === "paid" ? sql`now()` : sql`paid_at`}
    WHERE id = ${req.params.id}
    RETURNING *
  `;
  res.json(invoice);
});

// GET /api/billing/summary — resumen facturación
router.get("/summary", async (_req, res) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  const [monthTotal] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'draft') as drafts,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'paid') as paid,
      COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
      COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as total_paid,
      COALESCE(SUM(total) FILTER (WHERE status IN ('draft', 'sent')), 0) as total_pending,
      COALESCE(SUM(total), 0) as total_month
    FROM invoices
    WHERE EXTRACT(YEAR FROM issue_date) = ${y}
    AND EXTRACT(MONTH FROM issue_date) = ${m}
  `;

  // Expected revenue from active services
  const [expected] = await sql`
    SELECT COALESCE(SUM(amount), 0) as expected_monthly
    FROM billing_services WHERE active = true
  `;

  res.json({ ...monthTotal, expected_monthly: expected.expected_monthly });
});

export default router;
