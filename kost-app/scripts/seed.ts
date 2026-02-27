/**
 * Script seed — jalankan sekali untuk mengisi data awal ke Postgres
 * Cara pakai:
 *   1. Pastikan POSTGRES_URL sudah ada di .env.local
 *   2. npx tsx scripts/seed.ts
 */

import { sql } from "@vercel/postgres";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function seed() {
  console.log("🌱 Membuat tabel...");

  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id            VARCHAR(64) PRIMARY KEY,
      room_name     VARCHAR(128) NOT NULL,
      tenant_name   VARCHAR(128) NOT NULL,
      base_price    INTEGER NOT NULL,
      monthly_fee   INTEGER NOT NULL,
      price_per_kwh INTEGER NOT NULL,
      created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`
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
    )
  `;

  console.log("✅ Tabel berhasil dibuat");

  console.log("🌱 Mengisi data rooms...");

  await sql`
    INSERT INTO rooms (id, room_name, tenant_name, base_price, monthly_fee, price_per_kwh)
    VALUES
      ('room-01', 'Kamar A1', 'Bli Wayan',  1500000, 50000, 2000),
      ('room-02', 'Kamar A2', 'Mbak Ayu',   1200000, 50000, 2500),
      ('room-03', 'Kamar B1', 'Kosong',      1500000, 50000, 2000)
    ON CONFLICT (id) DO NOTHING
  `;

  console.log("🌱 Mengisi data bills...");

  await sql`
    INSERT INTO bills (id, room_id, month, year, meter_start, meter_end, kwh_used, total_amount, is_paid)
    VALUES
      ('bill-022026-room01', 'room-01', 2, 2026, 1230, 1275, 45, 1640000, FALSE),
      ('bill-022026-room02', 'room-02', 2, 2026, 870,  900,  30, 1325000, TRUE)
    ON CONFLICT (id) DO NOTHING
  `;

  console.log("✅ Seed selesai!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed gagal:", err);
  process.exit(1);
});
