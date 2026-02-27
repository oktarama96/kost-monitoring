import { NextRequest, NextResponse } from "next/server";
import { updateBillStatus, deleteBill } from "@/lib/db";
import { auth } from "@/auth";

// PATCH /api/bills/[id] — set status paid/unpaid (tidak bisa mengubah expired)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (typeof body.is_paid !== "boolean") {
      return NextResponse.json(
        { error: "Field is_paid (boolean) diperlukan" },
        { status: 400 }
      );
    }

    const newStatus = body.is_paid ? "paid" : "unpaid";
    const updated = await updateBillStatus(id, newStatus);

    if (!updated) {
      return NextResponse.json(
        { error: "Tagihan tidak ditemukan atau sudah berstatus kedaluwarsa" },
        { status: 404 }
      );
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
