"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ email: "", password: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await signIn("credentials", {
            email: form.email,
            password: form.password,
            redirect: false,
        });

        setLoading(false);

        if (res?.error) {
            toast.error("Email atau password salah");
        } else {
            router.push("/");
            router.refresh();
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
                        Kelola kost Anda<br />dengan mudah
                    </h2>
                    <p className="text-sidebar-foreground/60 text-sm leading-relaxed">
                        Platform manajemen tagihan kost bulanan — catat meteran listrik,
                        pantau pembayaran, dan kirim tagihan ke penyewa dalam hitungan detik.
                    </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-sidebar-foreground/40">
                    <span>© {new Date().getFullYear()} KostManager</span>
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
                        <h1 className="text-2xl font-bold text-foreground">Masuk ke akun</h1>
                        <p className="text-sm text-muted-foreground">
                            Gunakan email dan password yang sudah terdaftar
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
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
                            <Label htmlFor="password" className="text-sm font-medium">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="pl-9"
                                    required
                                />
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
                                    Masuk...
                                </>
                            ) : (
                                <>
                                    Masuk
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-muted-foreground">
                        Belum punya akun?{" "}
                        <Link
                            href="/register"
                            className="font-semibold text-primary hover:underline underline-offset-4"
                        >
                            Daftar sekarang
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
