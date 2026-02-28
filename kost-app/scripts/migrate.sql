-- =============================================================================
-- KostManager — Migration Script
-- Jalankan SEKALI di Vercel Postgres Query Editor (atau psql)
-- Urutan penting: tabel parent dibuat sebelum tabel child
-- =============================================================================

-- ─── 1. Tabel users (pengelola kost) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)  PRIMARY KEY,
  name          VARCHAR(128) NOT NULL,
  email         VARCHAR(256) UNIQUE NOT NULL,
  password_hash VARCHAR(256) NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── 2. Tabel kosts (properti yang dimiliki user) ───────────────────────────
CREATE TABLE IF NOT EXISTS kosts (
  id         VARCHAR(64)  PRIMARY KEY,
  user_id    VARCHAR(64)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(128) NOT NULL,
  address    TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── 3. Tambahkan kost_id ke rooms & hapus tenant_name ──────────────────────
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS kost_id VARCHAR(64) REFERENCES kosts(id) ON DELETE CASCADE;

ALTER TABLE rooms
  DROP COLUMN IF EXISTS tenant_name;

-- ─── 4. Tabel tenants (histori penghuni per kamar) ──────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id             VARCHAR(64)  PRIMARY KEY,
  room_id        VARCHAR(64)  NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name           VARCHAR(128) NOT NULL,
  phone          VARCHAR(32),
  check_in_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
  check_out_date DATE,                    -- NULL = masih aktif
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── 5. Update tabel bills: is_paid → status + snapshot penghuni ─────────────
ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS status               VARCHAR(16) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS tenant_snapshot_name VARCHAR(128);

-- Migrasi data lama: konversi is_paid (boolean) ke status (varchar)
UPDATE bills
SET status = CASE WHEN is_paid = TRUE THEN 'paid' ELSE 'unpaid' END
WHERE status = 'unpaid';  -- hanya baris yang belum tersentuh

ALTER TABLE bills
  DROP COLUMN IF EXISTS is_paid;

-- ─── 6. Tambah kolom role ke users ──────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'owner';

-- ─── 7. Tambah kolom bank details ke kosts ──────────────────────────────────
ALTER TABLE kosts
  ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(128),
  ADD COLUMN IF NOT EXISTS bank_name           VARCHAR(128),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(64);

