import { NextRequest, NextResponse } from "next/server";
import { getRooms, createRoom, checkinTenant, getKostByUserId, getActiveTenant } from "@/lib/db";
import { auth } from "@/auth";

// GET /api/rooms — returns rooms with active_tenant per room
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kost = await getKostByUserId(session.user.id);
    if (!kost) {
      return NextResponse.json({ error: "Kost tidak ditemukan" }, { status: 404 });
    }

    const rooms = await getRooms(kost.id);

    // Fetch active tenant untuk setiap kamar secara paralel
    const activeTenants = await Promise.all(
      rooms.map((room) => getActiveTenant(room.id))
    );

    const result = rooms.map((room, i) => ({
      ...room,
      active_tenant: activeTenants[i] ?? null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/rooms error:", err);
    return NextResponse.json({ error: "Gagal membaca data kamar" }, { status: 500 });
  }
}


// POST /api/rooms
// Body: { room_name, base_price, monthly_fee, price_per_kwh, tenant_name, tenant_phone, tenant_check_in_date? }
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kost = await getKostByUserId(session.user.id);
    if (!kost) {
      return NextResponse.json({ error: "Kost tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const {
      room_name,
      base_price,
      monthly_fee,
      price_per_kwh,
      tenant_name,
      tenant_phone,
      tenant_check_in_date,
    } = body;

    if (!room_name || base_price == null || monthly_fee == null || price_per_kwh == null) {
      return NextResponse.json({ error: "Semua field kamar wajib diisi" }, { status: 400 });
    }

    const roomId = `room-${Date.now()}`;
    const newRoom = await createRoom({
      id: roomId,
      room_name,
      kost_id: kost.id,
      base_price: Number(base_price),
      monthly_fee: Number(monthly_fee),
      price_per_kwh: Number(price_per_kwh),
    });

    // Jika ada data penghuni, langsung checkin
    let tenant = null;
    if (tenant_name) {
      tenant = await checkinTenant(
        roomId,
        tenant_name,
        tenant_phone ?? null,
        tenant_check_in_date ?? new Date().toISOString().split("T")[0]
      );
    }

    return NextResponse.json({ ...newRoom, active_tenant: tenant }, { status: 201 });
  } catch (err) {
    console.error("POST /api/rooms error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gagal menambah kamar: ${message}` }, { status: 500 });
  }
}
