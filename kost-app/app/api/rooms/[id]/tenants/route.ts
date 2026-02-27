import { NextRequest, NextResponse } from "next/server";
import { getTenantHistory } from "@/lib/db";
import { auth } from "@/auth";

// GET /api/rooms/[id]/tenants — histori penghuni kamar
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: roomId } = await params;
        const history = await getTenantHistory(roomId);
        return NextResponse.json(history);
    } catch (err) {
        console.error("GET /api/rooms/[id]/tenants error:", err);
        return NextResponse.json({ error: "Gagal memuat histori penghuni" }, { status: 500 });
    }
}
