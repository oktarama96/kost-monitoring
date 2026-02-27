import { NextRequest, NextResponse } from "next/server";
import { hasSuperAdmin, createUser } from "@/lib/db";
import bcrypt from "bcryptjs";

// POST /api/admin/setup — buat akun superadmin pertama
// Hanya bisa digunakan jika belum ada superadmin sama sekali
export async function POST(req: NextRequest) {
    try {
        const already = await hasSuperAdmin();
        if (already) {
            return NextResponse.json({ error: "SuperAdmin sudah ada" }, { status: 409 });
        }

        const { name, email, password } = await req.json();
        if (!name || !email || !password) {
            return NextResponse.json({ error: "name, email, dan password wajib diisi" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const id = `superadmin-${Date.now()}`;

        const user = await createUser({ id, name, email, password_hash: passwordHash, role: "superadmin" });
        return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 });
    } catch (err) {
        console.error("POST /api/admin/setup:", err);
        return NextResponse.json({ error: "Gagal membuat superadmin" }, { status: 500 });
    }
}
