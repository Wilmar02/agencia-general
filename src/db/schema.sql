-- Cuentas publicitarias (Meta + Google)
CREATE TABLE IF NOT EXISTS ad_accounts (
  id            SERIAL PRIMARY KEY,
  platform      TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  account_id    TEXT NOT NULL,
  name          TEXT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'COP',
  tipo          TEXT NOT NULL DEFAULT 'leads',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (platform, account_id)
);

-- Métricas diarias por cuenta
CREATE TABLE IF NOT EXISTS metrics_daily (
  id              SERIAL PRIMARY KEY,
  ad_account_id   INTEGER REFERENCES ad_accounts(id),
  date            DATE NOT NULL,
  spend           NUMERIC(12,2) DEFAULT 0,
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  reach           INTEGER DEFAULT 0,
  ctr             NUMERIC(6,4) DEFAULT 0,
  cpm             NUMERIC(10,2) DEFAULT 0,
  cpc             NUMERIC(10,2) DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  cost_per_conv   NUMERIC(10,2) DEFAULT 0,
  roas            NUMERIC(8,2) DEFAULT 0,
  conv_value      NUMERIC(12,2) DEFAULT 0,
  raw_data        JSONB,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ad_account_id, date)
);

-- Métricas diarias por campaña
CREATE TABLE IF NOT EXISTS campaigns_daily (
  id              SERIAL PRIMARY KEY,
  ad_account_id   INTEGER REFERENCES ad_accounts(id),
  campaign_id     TEXT NOT NULL,
  campaign_name   TEXT,
  date            DATE NOT NULL,
  spend           NUMERIC(12,2) DEFAULT 0,
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  reach           INTEGER DEFAULT 0,
  ctr             NUMERIC(6,4) DEFAULT 0,
  cpm             NUMERIC(10,2) DEFAULT 0,
  cpc             NUMERIC(10,2) DEFAULT 0,
  frequency       NUMERIC(6,2) DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  cost_per_conv   NUMERIC(10,2) DEFAULT 0,
  conv_value      NUMERIC(12,2) DEFAULT 0,
  roas            NUMERIC(8,2) DEFAULT 0,
  objective       TEXT,
  status          TEXT,
  raw_data        JSONB,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ad_account_id, campaign_id, date)
);

-- Alertas generadas
CREATE TABLE IF NOT EXISTS alerts (
  id          SERIAL PRIMARY KEY,
  account_id  INTEGER REFERENCES ad_accounts(id),
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'media',
  notified    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics_daily(date);
CREATE INDEX IF NOT EXISTS idx_metrics_account ON metrics_daily(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_date ON campaigns_daily(date);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
