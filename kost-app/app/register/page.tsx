"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Building2, Loader2, User, Mail, Lock, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        kost_name: "",
        kost_address: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error ?? "Pendaftaran gagal");
                setLoading(false);
                return;
            }

            const loginRes = await signIn("credentials", {
                email: form.email,
                password: form.password,
                redirect: false,
            });

            if (loginRes?.error) {
                toast.success("Akun berhasil dibuat! Silakan login.");
                router.push("/login");
            } else {
                toast.success("Selamat datang di KostManager!");
                router.push("/");
                router.refresh();
            }
        } catch {
            toast.error("Terjadi kesalahan. Coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel — branding */}
            <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-sidebar px-10 py-12">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
                        <Building2 className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
                        KostManager
                    </span>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-sidebar-foreground leading-snug">
                        Mulai kelola kost<br />Anda hari ini
                    </h2>
                    <p className="text-sidebar-foreground/60 text-sm leading-relaxed">
                        Daftarkan akun dan kost Anda dalam hitungan menit. Gratis selamanya
                        untuk pengelola kost skala kecil hingga menengah.
                    </p>
                    <ul className="space-y-2 text-sm text-sidebar-foreground/60">
                        {[
                            "Catat meteran listrik per kamar",
                            "Pantau status pembayaran real-time",
                            "Generate teks tagihan otomatis",
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex items-center gap-2 text-xs text-sidebar-foreground/40">
                    <span>© 2025 KostManager</span>
                    <span>·</span>
                    <span>v1.0</span>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
                <div className="w-full max-w-sm space-y-8">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 lg:hidden">
                        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <span className="text-lg font-bold text-foreground">KostManager</span>
                    </div>

                    <div className="space-y-1.5">
                        <h1 className="text-2xl font-bold text-foreground">Buat akun baru</h1>
                        <p className="text-sm text-muted-foreground">
                            Isi data Anda dan nama kost yang akan dikelola
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Account section */}
                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                Informasi Akun
                            </p>

                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium">
                                    Nama Lengkap
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        placeholder="Budi Santoso"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="pl-9"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reg-email" className="text-sm font-medium">
                                    Email
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="reg-email"
                                        type="email"
                                        placeholder="nama@email.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="pl-9"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reg-password" className="text-sm font-medium">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="reg-password"
                                        type="password"
                                        placeholder="Minimal 6 karakter"
                                        minLength={6}
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="pl-9"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Kost section */}
                        <div className="space-y-4 pt-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                Informasi Kost
                            </p>

                            <div className="space-y-2">
                                <Label htmlFor="kost_name" className="text-sm font-medium">
                                    Nama Kost
                                </Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="kost_name"
                                        placeholder="Kost Bu Siti"
                                        value={form.kost_name}
                                        onChange={(e) => setForm({ ...form, kost_name: e.target.value })}
                                        className="pl-9"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="kost_address" className="text-sm font-medium">
                                    Alamat{" "}
                                    <span className="text-muted-foreground font-normal">(opsional)</span>
                                </Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="kost_address"
                                        placeholder="Jl. Merdeka No. 10, ..."
                                        value={form.kost_address}
                                        onChange={(e) => setForm({ ...form, kost_address: e.target.value })}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full gap-2 font-semibold"
                            disabled={loading}
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Mendaftar...
                                </>
                            ) : (
                                <>
                                    Buat Akun
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-muted-foreground">
                        Sudah punya akun?{" "}
                        <Link
                            href="/login"
                            className="font-semibold text-primary hover:underline underline-offset-4"
                        >
                            Masuk di sini
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
