import { NextRequest, NextResponse } from "next/server";
import { updateBillPaidStatus, deleteBill } from "@/lib/db";

// PATCH /api/bills/[id] — toggle atau set status is_paid
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (typeof body.is_paid !== "boolean") {
      return NextResponse.json(
        { error: "Field is_paid (boolean) diperlukan" },
        { status: 400 }
      );
    }

    const updated = await updateBillPaidStatus(id, body.is_paid);

    if (!updated) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/bills/[id] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Gagal mengupdate status tagihan: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteBill(id);

    if (!deleted) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Tagihan berhasil dihapus" });
  } catch (err) {
    console.error("DELETE /api/bills/[id] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Gagal menghapus tagihan: ${message}` },
      { status: 500 }
    );
  }
}
