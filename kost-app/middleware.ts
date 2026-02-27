import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const session = await auth();
    const { pathname } = request.nextUrl;

    // Rute publik yang tidak perlu login
    const publicPaths = ["/login", "/register", "/api/auth", "/api/admin/setup"];
    const isPublic = publicPaths.some((p) => pathname.startsWith(p));

    if (!session && !isPublic) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    if (session) {
        const role = session.user.role;

        // Proteksi /admin/* — hanya superadmin
        // Kecualikan /api/admin/setup karena dipakai saat belum ada superadmin
        const isAdminSetup = pathname === "/api/admin/setup";
        if (!isAdminSetup && (pathname.startsWith("/admin") || pathname.startsWith("/api/admin"))) {
            if (role !== "superadmin") {
                return NextResponse.redirect(new URL("/", request.url));
            }
        }

        // Setelah login: superadmin → /admin, owner → /
        if (pathname === "/login" || pathname === "/register") {
            if (role === "superadmin") {
                return NextResponse.redirect(new URL("/admin", request.url));
            }
            return NextResponse.redirect(new URL("/", request.url));
        }

        // Owner tidak boleh akses /admin (sudah dicek di atas)
        // Superadmin yang akses "/" bisa bebas (tidak di-redirect)
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
