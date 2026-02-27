import { NextRequest, NextResponse } from "next/server";
import { checkinTenant, getActiveTenant } from "@/lib/db";
import { auth } from "@/auth";

// POST /api/rooms/[id]/checkin
// Body: { name, phone?, check_in_date? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: roomId } = await params;
        const body = await req.json();
        const { name, phone, check_in_date } = body;

        if (!name) {
            return NextResponse.json({ error: "Nama penghuni wajib diisi" }, { status: 400 });
        }

        // Pastikan tidak ada penghuni aktif
        const activeTenant = await getActiveTenant(roomId);
        if (activeTenant) {
            return NextResponse.json(
                { error: "Kamar masih berpenghuni. Lakukan checkout terlebih dahulu." },
                { status: 409 }
            );
        }

        const checkInDate = check_in_date ?? new Date().toISOString().split("T")[0];
        const tenant = await checkinTenant(roomId, name, phone ?? null, checkInDate);

        return NextResponse.json({
            message: "Penghuni baru berhasil didaftarkan",
            tenant,
        }, { status: 201 });
    } catch (err) {
        console.error("POST /api/rooms/[id]/checkin error:", err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Gagal checkin: ${message}` }, { status: 500 });
    }
}
