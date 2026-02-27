import { NextRequest, NextResponse } from "next/server";
import { checkoutTenant, getActiveTenant } from "@/lib/db";
import { auth } from "@/auth";

// POST /api/rooms/[id]/checkout
// Body: { notes? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: roomId } = await params;
        const body = await req.json().catch(() => ({}));
        const { notes, check_out_date } = body;

        // Cari penghuni aktif
        const activeTenant = await getActiveTenant(roomId);
        if (!activeTenant) {
            return NextResponse.json(
                { error: "Tidak ada penghuni aktif di kamar ini" },
                { status: 404 }
            );
        }

        const result = await checkoutTenant(activeTenant.id, roomId, notes ?? null, check_out_date ?? null);

        return NextResponse.json({
            message: "Penghuni berhasil keluar. Tagihan yang belum lunas telah diset sebagai kedaluwarsa.",
            tenant: result,
        });
    } catch (err) {
        console.error("POST /api/rooms/[id]/checkout error:", err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Gagal checkout: ${message}` }, { status: 500 });
    }
}
