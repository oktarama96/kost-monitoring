import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/db";

// PATCH /api/bills/[id] — toggle status pembayaran is_paid
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data = readData();
    const billIndex = data.bills.findIndex((b) => b.id === id);

    if (billIndex === -1) {
      return NextResponse.json(
        { error: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Jika body mengandung is_paid, gunakan nilai itu; jika tidak, toggle
    if (typeof body.is_paid === "boolean") {
      data.bills[billIndex].is_paid = body.is_paid;
    } else {
      data.bills[billIndex].is_paid = !data.bills[billIndex].is_paid;
    }

    writeData(data);
    return NextResponse.json(data.bills[billIndex]);
  } catch {
    return NextResponse.json(
      { error: "Gagal mengupdate status tagihan" },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/[id] — hapus tagihan
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = readData();
    const billIndex = data.bills.findIndex((b) => b.id === id);

    if (billIndex === -1) {
      return NextResponse.json(
        { error: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    data.bills.splice(billIndex, 1);
    writeData(data);

    return NextResponse.json({ message: "Tagihan berhasil dihapus" });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus tagihan" },
      { status: 500 }
    );
  }
}
