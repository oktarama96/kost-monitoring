-- Schema untuk aplikasi KostManager
-- Jalankan di Vercel Postgres Query Editor atau psql

CREATE TABLE IF NOT EXISTS rooms (
  id            VARCHAR(64) PRIMARY KEY,
  room_name     VARCHAR(128) NOT NULL,
  tenant_name   VARCHAR(128) NOT NULL,
  base_price    INTEGER NOT NULL,
  monthly_fee   INTEGER NOT NULL,
  price_per_kwh INTEGER NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bills (
  id            VARCHAR(64) PRIMARY KEY,
  room_id       VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year          SMALLINT NOT NULL,
  meter_start   INTEGER NOT NULL DEFAULT 0,
  meter_end     INTEGER NOT NULL DEFAULT 0,
  kwh_used      INTEGER NOT NULL DEFAULT 0,
  total_amount  INTEGER NOT NULL DEFAULT 0,
  is_paid       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (room_id, month, year)
);
