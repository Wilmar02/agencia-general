-- Metricas diarias por ad set
CREATE TABLE IF NOT EXISTS adsets_daily (
  id              SERIAL PRIMARY KEY,
  ad_account_id   INTEGER REFERENCES ad_accounts(id),
  campaign_id     TEXT NOT NULL,
  adset_id        TEXT NOT NULL,
  adset_name      TEXT,
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
  daily_budget    NUMERIC(12,2) DEFAULT 0,
  lifetime_budget NUMERIC(12,2) DEFAULT 0,
  status          TEXT,
  raw_data        JSONB,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ad_account_id, adset_id, date)
);

-- Metricas diarias por anuncio
CREATE TABLE IF NOT EXISTS ads_daily (
  id              SERIAL PRIMARY KEY,
  ad_account_id   INTEGER REFERENCES ad_accounts(id),
  campaign_id     TEXT NOT NULL,
  adset_id        TEXT NOT NULL,
  ad_id           TEXT NOT NULL,
  ad_name         TEXT,
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
  thumbnail_url   TEXT,
  body_text       TEXT,
  title           TEXT,
  creative_type   TEXT,
  call_to_action  TEXT,
  status          TEXT,
  raw_data        JSONB,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ad_account_id, ad_id, date)
);

-- Agregar columnas a alerts
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS suggestion TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_type TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS period_days INTEGER;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS ad_id TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS metric_value NUMERIC(10,2);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS threshold_value NUMERIC(10,2);

-- Indices
CREATE INDEX IF NOT EXISTS idx_adsets_date ON adsets_daily(date);
CREATE INDEX IF NOT EXISTS idx_adsets_account ON adsets_daily(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_adsets_campaign ON adsets_daily(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_date ON ads_daily(date);
CREATE INDEX IF NOT EXISTS idx_ads_account ON ads_daily(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ads_adset ON ads_daily(adset_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
