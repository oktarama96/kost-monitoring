import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// GET /api/seed — jalankan SEKALI untuk setup tabel dan data awal
// Dilindungi dengan SEED_SECRET agar tidak bisa diakses sembarangan
// Cara akses: /api/seed?secret=YOUR_SEED_SECRET
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Buat tabel rooms
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

    // 2. Buat tabel bills
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

    // 3. Insert data rooms awal
    await sql`
      INSERT INTO rooms (id, room_name, tenant_name, base_price, monthly_fee, price_per_kwh)
      VALUES
        ('room-01', 'Kamar A1', 'Bli Wayan', 1500000, 50000, 2000),
        ('room-02', 'Kamar A2', 'Mbak Ayu',  1200000, 50000, 2500),
        ('room-03', 'Kamar B1', 'Kosong',     1500000, 50000, 2000)
      ON CONFLICT (id) DO NOTHING
    `;

    // 4. Insert data bills awal
    await sql`
      INSERT INTO bills (id, room_id, month, year, meter_start, meter_end, kwh_used, total_amount, is_paid)
      VALUES
        ('bill-022026-room01', 'room-01', 2, 2026, 1230, 1275, 45, 1640000, FALSE),
        ('bill-022026-room02', 'room-02', 2, 2026, 870,  900,  30, 1325000, TRUE)
      ON CONFLICT (id) DO NOTHING
    `;

    // Cek hasil
    const { rows: roomRows } = await sql`SELECT COUNT(*) as count FROM rooms`;
    const { rows: billRows } = await sql`SELECT COUNT(*) as count FROM bills`;

    return NextResponse.json({
      success: true,
      message: "Database berhasil di-setup!",
      rooms: roomRows[0].count,
      bills: billRows[0].count,
    });
  } catch (err) {
    console.error("Seed error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
