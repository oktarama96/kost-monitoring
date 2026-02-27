import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/db";

export const runtime = "nodejs";

// PUT /api/rooms/[id] — update data kamar
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { room_name, tenant_name, base_price, monthly_fee, price_per_kwh } =
      body;

    const data = readData();
    const roomIndex = data.rooms.findIndex((r) => r.id === id);

    if (roomIndex === -1) {
      return NextResponse.json(
        { error: "Kamar tidak ditemukan" },
        { status: 404 }
      );
    }

    data.rooms[roomIndex] = {
      ...data.rooms[roomIndex],
      room_name: room_name ?? data.rooms[roomIndex].room_name,
      tenant_name: tenant_name ?? data.rooms[roomIndex].tenant_name,
      base_price:
        base_price != null ? Number(base_price) : data.rooms[roomIndex].base_price,
      monthly_fee:
        monthly_fee != null
          ? Number(monthly_fee)
          : data.rooms[roomIndex].monthly_fee,
      price_per_kwh:
        price_per_kwh != null
          ? Number(price_per_kwh)
          : data.rooms[roomIndex].price_per_kwh,
    };

    writeData(data);
    return NextResponse.json(data.rooms[roomIndex]);
  } catch {
    return NextResponse.json(
      { error: "Gagal mengupdate kamar" },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[id] — hapus kamar
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = readData();
    const roomIndex = data.rooms.findIndex((r) => r.id === id);

    if (roomIndex === -1) {
      return NextResponse.json(
        { error: "Kamar tidak ditemukan" },
        { status: 404 }
      );
    }

    data.rooms.splice(roomIndex, 1);
    writeData(data);

    return NextResponse.json({ message: "Kamar berhasil dihapus" });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus kamar" },
      { status: 500 }
    );
  }
}
