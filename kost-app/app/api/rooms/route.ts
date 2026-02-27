import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/db";
import { Room } from "@/lib/types";

// GET /api/rooms — ambil semua data kamar
export async function GET() {
  try {
    const data = readData();
    return NextResponse.json(data.rooms);
  } catch {
    return NextResponse.json(
      { error: "Gagal membaca data kamar" },
      { status: 500 }
    );
  }
}

// POST /api/rooms — tambah kamar baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room_name, tenant_name, base_price, monthly_fee, price_per_kwh } =
      body;

    if (!room_name || !tenant_name || base_price == null || monthly_fee == null || price_per_kwh == null) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    const data = readData();

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      room_name,
      tenant_name,
      base_price: Number(base_price),
      monthly_fee: Number(monthly_fee),
      price_per_kwh: Number(price_per_kwh),
    };

    data.rooms.push(newRoom);
    writeData(data);

    return NextResponse.json(newRoom, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal menambah kamar" },
      { status: 500 }
    );
  }
}
