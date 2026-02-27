import { NextRequest, NextResponse } from "next/server";
import { updateRoom, deleteRoom } from "@/lib/db";

// PUT /api/rooms/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { room_name, tenant_name, base_price, monthly_fee, price_per_kwh } = body;

    const updated = await updateRoom(id, {
      ...(room_name != null && { room_name }),
      ...(tenant_name != null && { tenant_name }),
      ...(base_price != null && { base_price: Number(base_price) }),
      ...(monthly_fee != null && { monthly_fee: Number(monthly_fee) }),
      ...(price_per_kwh != null && { price_per_kwh: Number(price_per_kwh) }),
    });

    if (!updated) {
      return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/rooms/[id] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gagal mengupdate kamar: ${message}` }, { status: 500 });
  }
}

// DELETE /api/rooms/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteRoom(id);

    if (!deleted) {
      return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Kamar berhasil dihapus" });
  } catch (err) {
    console.error("DELETE /api/rooms/[id] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gagal menghapus kamar: ${message}` }, { status: 500 });
  }
}
