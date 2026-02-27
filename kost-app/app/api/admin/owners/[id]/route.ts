import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateOwnerUser, deleteOwnerUser } from "@/lib/db";
import bcrypt from "bcryptjs";

async function guardSuperAdmin() {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "superadmin") return null;
    return session;
}

// PATCH /api/admin/owners/[id]
// Body: { name?, email?, password?, kost_name?, kost_address? }
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await guardSuperAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { id } = await params;
        const body = await req.json();
        const { name, email, password, kost_name, kost_address } = body;

        const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

        await updateOwnerUser(id, {
            name: name || undefined,
            email: email || undefined,
            passwordHash,
            kostName: kost_name || undefined,
            kostAddress: kost_address ?? undefined,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("PATCH /api/admin/owners/[id]:", err);
        return NextResponse.json({ error: "Gagal update data" }, { status: 500 });
    }
}

// DELETE /api/admin/owners/[id]
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await guardSuperAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { id } = await params;
        const deleted = await deleteOwnerUser(id);
        if (!deleted) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/admin/owners/[id]:", err);
        return NextResponse.json({ error: "Gagal hapus data" }, { status: 500 });
    }
}
