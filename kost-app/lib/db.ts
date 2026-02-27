import { sql } from "@vercel/postgres";
import { Room, Bill, Tenant, Kost, User, DatabaseData, BillStatus } from "./types";

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<User | null> {
  const { rows } = await sql<User>`
    SELECT id, name, email, password_hash FROM users WHERE email = ${email}
  `;
  return rows[0] ?? null;
}

export async function createUser(user: Omit<User, "created_at">): Promise<User> {
  const { rows } = await sql<User>`
    INSERT INTO users (id, name, email, password_hash)
    VALUES (${user.id}, ${user.name}, ${user.email}, ${user.password_hash})
    RETURNING id, name, email, password_hash
  `;
  return rows[0];
}

// ─── Kosts ───────────────────────────────────────────────────────────────────

export async function getKostByUserId(userId: string): Promise<Kost | null> {
  const { rows } = await sql<Kost>`
    SELECT id, user_id, name, address FROM kosts WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createKost(kost: Omit<Kost, "created_at">): Promise<Kost> {
  const { rows } = await sql<Kost>`
    INSERT INTO kosts (id, user_id, name, address)
    VALUES (${kost.id}, ${kost.user_id}, ${kost.name}, ${kost.address ?? null})
    RETURNING id, user_id, name, address
  `;
  return rows[0];
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export async function getRooms(kostId: string): Promise<Room[]> {
  const { rows } = await sql<Room>`
    SELECT id, room_name, kost_id, base_price, monthly_fee, price_per_kwh
    FROM rooms
    WHERE kost_id = ${kostId}
    ORDER BY room_name
  `;
  return rows;
}

export async function getRoomById(id: string): Promise<Room | null> {
  const { rows } = await sql<Room>`
    SELECT id, room_name, kost_id, base_price, monthly_fee, price_per_kwh
    FROM rooms WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function createRoom(
  room: Omit<Room, "id"> & { id: string }
): Promise<Room> {
  const { rows } = await sql<Room>`
    INSERT INTO rooms (id, room_name, kost_id, base_price, monthly_fee, price_per_kwh)
    VALUES (${room.id}, ${room.room_name}, ${room.kost_id}, ${room.base_price}, ${room.monthly_fee}, ${room.price_per_kwh})
    RETURNING id, room_name, kost_id, base_price, monthly_fee, price_per_kwh
  `;
  return rows[0];
}

export async function updateRoom(
  id: string,
  data: Partial<Omit<Room, "id">>
): Promise<Room | null> {
  const { rows } = await sql<Room>`
    UPDATE rooms SET
      room_name     = COALESCE(${data.room_name ?? null}, room_name),
      base_price    = COALESCE(${data.base_price ?? null}, base_price),
      monthly_fee   = COALESCE(${data.monthly_fee ?? null}, monthly_fee),
      price_per_kwh = COALESCE(${data.price_per_kwh ?? null}, price_per_kwh)
    WHERE id = ${id}
    RETURNING id, room_name, kost_id, base_price, monthly_fee, price_per_kwh
  `;
  return rows[0] ?? null;
}

export async function deleteRoom(id: string): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM rooms WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

// ─── Tenants ─────────────────────────────────────────────────────────────────

export async function getActiveTenant(roomId: string): Promise<Tenant | null> {
  const { rows } = await sql<Tenant>`
    SELECT id, room_id, name, phone, check_in_date, check_out_date, notes
    FROM tenants
    WHERE room_id = ${roomId} AND check_out_date IS NULL
    ORDER BY check_in_date DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getTenantHistory(roomId: string): Promise<Tenant[]> {
  const { rows } = await sql<Tenant>`
    SELECT id, room_id, name, phone, check_in_date, check_out_date, notes
    FROM tenants
    WHERE room_id = ${roomId}
    ORDER BY check_in_date DESC
  `;
  return rows;
}

export async function checkinTenant(
  roomId: string,
  name: string,
  phone: string | null,
  checkInDate: string
): Promise<Tenant> {
  const id = `tenant-${Date.now()}`;
  const { rows } = await sql<Tenant>`
    INSERT INTO tenants (id, room_id, name, phone, check_in_date)
    VALUES (${id}, ${roomId}, ${name}, ${phone ?? null}, ${checkInDate})
    RETURNING id, room_id, name, phone, check_in_date, check_out_date, notes
  `;
  return rows[0];
}

export async function checkoutTenant(
  tenantId: string,
  roomId: string,
  notes: string | null,
  checkOutDate?: string | null
): Promise<Tenant | null> {
  const dateValue = checkOutDate ?? new Date().toISOString().split("T")[0];
  // 1. Set check_out_date
  const { rows } = await sql<Tenant>`
    UPDATE tenants
    SET check_out_date = ${dateValue},
        notes = COALESCE(${notes ?? null}, notes)
    WHERE id = ${tenantId} AND check_out_date IS NULL
    RETURNING id, room_id, name, phone, check_in_date, check_out_date, notes
  `;
  if (!rows[0]) return null;

  // 2. Expire semua tagihan unpaid milik kamar ini
  await sql`
    UPDATE bills SET status = 'expired'
    WHERE room_id = ${roomId} AND status = 'unpaid'
  `;

  return rows[0];
}

// ─── Bills ───────────────────────────────────────────────────────────────────

type BillJoinRow = Bill & {
  room_name: string;
  kost_id: string;
  base_price: number;
  monthly_fee: number;
  price_per_kwh: number;
};

function reshapeBillRow(row: BillJoinRow): Bill & { room: Room } {
  return {
    id: row.id,
    room_id: row.room_id,
    month: Number(row.month),
    year: Number(row.year),
    meter_start: Number(row.meter_start),
    meter_end: Number(row.meter_end),
    kwh_used: Number(row.kwh_used),
    total_amount: Number(row.total_amount),
    status: row.status as BillStatus,
    tenant_snapshot_name: row.tenant_snapshot_name,
    room: {
      id: row.room_id,
      room_name: row.room_name,
      kost_id: row.kost_id,
      base_price: Number(row.base_price),
      monthly_fee: Number(row.monthly_fee),
      price_per_kwh: Number(row.price_per_kwh),
    },
  };
}

export async function getBills(
  kostId: string,
  filters?: { month?: number; year?: number }
): Promise<(Bill & { room: Room })[]> {
  let rows: BillJoinRow[];

  if (filters?.month && filters?.year) {
    ({ rows } = await sql<BillJoinRow>`
      SELECT
        b.id, b.room_id, b.month, b.year,
        b.meter_start, b.meter_end, b.kwh_used, b.total_amount, b.status, b.tenant_snapshot_name,
        r.room_name, r.kost_id, r.base_price, r.monthly_fee, r.price_per_kwh
      FROM bills b
      JOIN rooms r ON r.id = b.room_id
      WHERE r.kost_id = ${kostId}
        AND b.month = ${filters.month} AND b.year = ${filters.year}
      ORDER BY r.room_name
    `);
  } else if (filters?.year) {
    ({ rows } = await sql<BillJoinRow>`
      SELECT
        b.id, b.room_id, b.month, b.year,
        b.meter_start, b.meter_end, b.kwh_used, b.total_amount, b.status, b.tenant_snapshot_name,
        r.room_name, r.kost_id, r.base_price, r.monthly_fee, r.price_per_kwh
      FROM bills b
      JOIN rooms r ON r.id = b.room_id
      WHERE r.kost_id = ${kostId} AND b.year = ${filters.year}
      ORDER BY b.year DESC, b.month DESC, r.room_name
    `);
  } else {
    ({ rows } = await sql<BillJoinRow>`
      SELECT
        b.id, b.room_id, b.month, b.year,
        b.meter_start, b.meter_end, b.kwh_used, b.total_amount, b.status, b.tenant_snapshot_name,
        r.room_name, r.kost_id, r.base_price, r.monthly_fee, r.price_per_kwh
      FROM bills b
      JOIN rooms r ON r.id = b.room_id
      WHERE r.kost_id = ${kostId}
      ORDER BY b.year DESC, b.month DESC, r.room_name
    `);
  }

  return rows.map(reshapeBillRow);
}

export async function getPrevMonthMeterEnd(
  roomId: string,
  month: number,
  year: number
): Promise<number | null> {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const { rows } = await sql<{ meter_end: number }>`
    SELECT meter_end FROM bills
    WHERE room_id = ${roomId} AND month = ${prevMonth} AND year = ${prevYear}
  `;
  return rows[0]?.meter_end ?? null;
}

export async function upsertBill(bill: Bill): Promise<Bill> {
  const { rows } = await sql<Bill>`
    INSERT INTO bills (id, room_id, month, year, meter_start, meter_end, kwh_used, total_amount, status, tenant_snapshot_name)
    VALUES (${bill.id}, ${bill.room_id}, ${bill.month}, ${bill.year}, ${bill.meter_start}, ${bill.meter_end}, ${bill.kwh_used}, ${bill.total_amount}, ${bill.status}, ${bill.tenant_snapshot_name ?? null})
    ON CONFLICT (room_id, month, year) DO UPDATE SET
      id                   = EXCLUDED.id,
      meter_start          = EXCLUDED.meter_start,
      meter_end            = EXCLUDED.meter_end,
      kwh_used             = EXCLUDED.kwh_used,
      total_amount         = EXCLUDED.total_amount,
      tenant_snapshot_name = EXCLUDED.tenant_snapshot_name
    RETURNING id, room_id, month, year, meter_start, meter_end, kwh_used, total_amount, status, tenant_snapshot_name
  `;
  return rows[0];
}

export async function updateBillStatus(
  id: string,
  status: "paid" | "unpaid"
): Promise<Bill | null> {
  const { rows } = await sql<Bill>`
    UPDATE bills SET status = ${status}
    WHERE id = ${id} AND status != 'expired'
    RETURNING id, room_id, month, year, meter_start, meter_end, kwh_used, total_amount, status, tenant_snapshot_name
  `;
  return rows[0] ?? null;
}

export async function deleteBill(id: string): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM bills WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

// ─── Legacy: untuk kompatibilitas dengan Dashboard (server component) ─────────

export async function readData(kostId: string): Promise<DatabaseData> {
  const [rooms, billRows] = await Promise.all([getRooms(kostId), getBills(kostId)]);
  return {
    rooms,
    bills: billRows.map(({ room: _room, ...bill }) => bill),
  };
}
