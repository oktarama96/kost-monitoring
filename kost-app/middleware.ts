import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const session = await auth();
    const { pathname } = request.nextUrl;

    // Rute publik yang tidak perlu login
    const publicPaths = ["/login", "/register", "/api/auth"];
    const isPublic = publicPaths.some((p) => pathname.startsWith(p));

    if (!session && !isPublic) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Jika sudah login dan akses /login atau /register, redirect ke dashboard
    if (session && (pathname === "/login" || pathname === "/register")) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Jalankan middleware di semua halaman kecuali _next dan static files
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
