import { sql } from "@vercel/postgres";
import { Room, Bill, DatabaseData } from "./types";

// ─── Rooms ───────────────────────────────────────────────────────────────────

export async function getRooms(): Promise<Room[]> {
  const { rows } = await sql<Room>`
    SELECT id, room_name, tenant_name, base_price, monthly_fee, price_per_kwh
    FROM rooms
    ORDER BY room_name
  `;
  return rows;
}

export async function getRoomById(id: string): Promise<Room | null> {
  const { rows } = await sql<Room>`
    SELECT id, room_name, tenant_name, base_price, monthly_fee, price_per_kwh
    FROM rooms WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function createRoom(
  room: Omit<Room, "id"> & { id: string }
): Promise<Room> {
  const { rows } = await sql<Room>`
    INSERT INTO rooms (id, room_name, tenant_name, base_price, monthly_fee, price_per_kwh)
    VALUES (${room.id}, ${room.room_name}, ${room.tenant_name}, ${room.base_price}, ${room.monthly_fee}, ${room.price_per_kwh})
    RETURNING id, room_name, tenant_name, base_price, monthly_fee, price_per_kwh
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
      tenant_name   = COALESCE(${data.tenant_name ?? null}, tenant_name),
      base_price    = COALESCE(${data.base_price ?? null}, base_price),
      monthly_fee   = COALESCE(${data.monthly_fee ?? null}, monthly_fee),
      price_per_kwh = COALESCE(${data.price_per_kwh ?? null}, price_per_kwh)
    WHERE id = ${id}
    RETURNING id, room_name, tenant_name, base_price, monthly_fee, price_per_kwh
  `;
  return rows[0] ?? null;
}

export async function deleteRoom(id: string): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM rooms WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

// ─── Bills ───────────────────────────────────────────────────────────────────

// Raw flat row dari JOIN query
type BillJoinRow = Bill & {
  room_name: string;
  tenant_name: string;
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
    is_paid: row.is_paid,
    room: {
      id: row.room_id,
      room_name: row.room_name,
      tenant_name: row.tenant_name,
      base_price: Number(row.base_price),
      monthly_fee: Number(row.monthly_fee),
      price_per_kwh: Number(row.price_per_kwh),
    },
  };
}

export async function getBills(filters?: {
  month?: number;
  year?: number;
}): Promise<(Bill & { room: Room })[]> {
  let rows: BillJoinRow[];

  if (filters?.month && filters?.year) {
    ({ rows } = await sql<BillJoinRow>`
      SELECT
        b.id, b.room_id, b.month, b.year,
        b.meter_start, b.meter_end, b.kwh_used, b.total_amount, b.is_paid,
        r.room_name, r.tenant_name, r.base_price, r.monthly_fee, r.price_per_kwh
      FROM bills b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.month = ${filters.month} AND b.year = ${filters.year}
      ORDER BY r.room_name
    `);
  } else if (filters?.year) {
    ({ rows } = await sql<BillJoinRow>`
      SELECT
        b.id, b.room_id, b.month, b.year,
        b.meter_start, b.meter_end, b.kwh_used, b.total_amount, b.is_paid,
        r.room_name, r.tenant_name, r.base_price, r.monthly_fee, r.price_per_kwh
      FROM bills b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.year = ${filters.year}
      ORDER BY b.year DESC, b.month DESC, r.room_name
    `);
  } else {
    ({ rows } = await sql<BillJoinRow>`
      SELECT
        b.id, b.room_id, b.month, b.year,
        b.meter_start, b.meter_end, b.kwh_used, b.total_amount, b.is_paid,
        r.room_name, r.tenant_name, r.base_price, r.monthly_fee, r.price_per_kwh
      FROM bills b
      JOIN rooms r ON r.id = b.room_id
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
    INSERT INTO bills (id, room_id, month, year, meter_start, meter_end, kwh_used, total_amount, is_paid)
    VALUES (${bill.id}, ${bill.room_id}, ${bill.month}, ${bill.year}, ${bill.meter_start}, ${bill.meter_end}, ${bill.kwh_used}, ${bill.total_amount}, ${bill.is_paid})
    ON CONFLICT (room_id, month, year) DO UPDATE SET
      id           = EXCLUDED.id,
      meter_start  = EXCLUDED.meter_start,
      meter_end    = EXCLUDED.meter_end,
      kwh_used     = EXCLUDED.kwh_used,
      total_amount = EXCLUDED.total_amount
    RETURNING id, room_id, month, year, meter_start, meter_end, kwh_used, total_amount, is_paid
  `;
  return rows[0];
}

export async function updateBillPaidStatus(
  id: string,
  isPaid: boolean
): Promise<Bill | null> {
  const { rows } = await sql<Bill>`
    UPDATE bills SET is_paid = ${isPaid}
    WHERE id = ${id}
    RETURNING id, room_id, month, year, meter_start, meter_end, kwh_used, total_amount, is_paid
  `;
  return rows[0] ?? null;
}

export async function deleteBill(id: string): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM bills WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

// ─── Legacy: untuk kompatibilitas dengan Dashboard (server component) ─────────

export async function readData(): Promise<DatabaseData> {
  const [rooms, billRows] = await Promise.all([getRooms(), getBills()]);
  return {
    rooms,
    bills: billRows.map(({ room: _room, ...bill }) => bill),
  };
}
