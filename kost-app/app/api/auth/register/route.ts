import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail, createUser, createKost } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password, kost_name, kost_address } = body;

        if (!name || !email || !password || !kost_name) {
            return NextResponse.json(
                { error: "Semua field wajib diisi" },
                { status: 400 }
            );
        }

        // Cek email duplikat
        const existing = await getUserByEmail(email);
        if (existing) {
            return NextResponse.json(
                { error: "Email sudah terdaftar" },
                { status: 409 }
            );
        }

        const userId = `user-${Date.now()}`;
        const passwordHash = await bcrypt.hash(password, 12);

        // Buat user
        await createUser({
            id: userId,
            name,
            email,
            password_hash: passwordHash,
            role: "owner",
        });

        // Buat kost default
        await createKost({
            id: `kost-${Date.now()}`,
            user_id: userId,
            name: kost_name,
            address: kost_address ?? null,
        });

        return NextResponse.json({ message: "Akun berhasil dibuat" }, { status: 201 });
    } catch (err) {
        console.error("POST /api/auth/register error:", err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Gagal mendaftar: ${message}` }, { status: 500 });
    }
}
