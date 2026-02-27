import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllOwners, createOwnerUser, getUserByEmail } from "@/lib/db";
import bcrypt from "bcryptjs";

async function guardSuperAdmin() {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "superadmin") {
        return null;
    }
    return session;
}

// GET /api/admin/owners
export async function GET() {
    const session = await guardSuperAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const owners = await getAllOwners();
        return NextResponse.json(owners);
    } catch (err) {
        console.error("GET /api/admin/owners:", err);
        return NextResponse.json({ error: "Gagal ambil data" }, { status: 500 });
    }
}

// POST /api/admin/owners — buat owner baru
// Body: { name, email, password, kost_name, kost_address? }
export async function POST(req: NextRequest) {
    const session = await guardSuperAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { name, email, password, kost_name, kost_address } = await req.json();
        if (!name || !email || !password || !kost_name) {
            return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
        }

        const existing = await getUserByEmail(email);
        if (existing) {
            return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const userId = `user-${Date.now()}`;

        const { user, kost } = await createOwnerUser(
            userId, name, email, passwordHash, kost_name, kost_address ?? null
        );

        return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, kost }, { status: 201 });
    } catch (err) {
        console.error("POST /api/admin/owners:", err);
        return NextResponse.json({ error: "Gagal membuat akun" }, { status: 500 });
    }
}
