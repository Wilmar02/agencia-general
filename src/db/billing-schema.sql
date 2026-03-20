-- Clientes de facturación
CREATE TABLE IF NOT EXISTS billing_clients (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  nit         TEXT DEFAULT 'N/A',
  email       TEXT NOT NULL,
  currency    TEXT DEFAULT 'COP',
  bank        TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_number TEXT NOT NULL,
  holder      TEXT NOT NULL,
  holder_doc  TEXT NOT NULL,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Servicios recurrentes por cliente
CREATE TABLE IF NOT EXISTS billing_services (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER REFERENCES billing_clients(id),
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 28),
  category    TEXT NOT NULL DEFAULT 'meta',
  active      BOOLEAN DEFAULT true
);

-- Cuentas de cobro generadas
CREATE TABLE IF NOT EXISTS invoices (
  id            SERIAL PRIMARY KEY,
  number        INTEGER NOT NULL UNIQUE,
  client_id     INTEGER REFERENCES billing_clients(id),
  issue_date    DATE NOT NULL,
  due_date      DATE,
  items         JSONB NOT NULL,
  subtotal      NUMERIC(12,2) NOT NULL,
  total         NUMERIC(12,2) NOT NULL,
  currency      TEXT DEFAULT 'COP',
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  pdf_url       TEXT,
  sent_at       TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Consecutivo
CREATE TABLE IF NOT EXISTS billing_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO billing_config (key, value) VALUES ('last_invoice_number', '100') ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(issue_date);
