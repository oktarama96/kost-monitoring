import { NextRequest, NextResponse } from "next/server";
import { getRooms, createRoom } from "@/lib/db";

// GET /api/rooms
export async function GET() {
  try {
    const rooms = await getRooms();
    return NextResponse.json(rooms);
  } catch (err) {
    console.error("GET /api/rooms error:", err);
    return NextResponse.json({ error: "Gagal membaca data kamar" }, { status: 500 });
  }
}

// POST /api/rooms
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room_name, tenant_name, base_price, monthly_fee, price_per_kwh } = body;

    if (!room_name || !tenant_name || base_price == null || monthly_fee == null || price_per_kwh == null) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    const newRoom = await createRoom({
      id: `room-${Date.now()}`,
      room_name,
      tenant_name,
      base_price: Number(base_price),
      monthly_fee: Number(monthly_fee),
      price_per_kwh: Number(price_per_kwh),
    });

    return NextResponse.json(newRoom, { status: 201 });
  } catch (err) {
    console.error("POST /api/rooms error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gagal menambah kamar: ${message}` }, { status: 500 });
  }
}
