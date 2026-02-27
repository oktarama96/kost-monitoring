"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

            // Auto login setelah register berhasil
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-slate-900 rounded-xl p-3 mb-3">
                        <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">KostManager</h1>
                    <p className="text-slate-500 text-sm mt-1">Daftar akun pengelola kost</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Buat Akun</CardTitle>
                        <CardDescription>
                            Isi data Anda dan nama kost yang akan dikelola
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="name">Nama Lengkap</Label>
                                <Input
                                    id="name"
                                    placeholder="Budi Santoso"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="reg-email">Email</Label>
                                <Input
                                    id="reg-email"
                                    type="email"
                                    placeholder="nama@email.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="reg-password">Password</Label>
                                <Input
                                    id="reg-password"
                                    type="password"
                                    placeholder="Minimal 6 karakter"
                                    minLength={6}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="border-t pt-4 space-y-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Informasi Kost
                                </p>
                                <div className="space-y-1">
                                    <Label htmlFor="kost_name">Nama Kost</Label>
                                    <Input
                                        id="kost_name"
                                        placeholder="Kost Bu Siti"
                                        value={form.kost_name}
                                        onChange={(e) => setForm({ ...form, kost_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="kost_address">
                                        Alamat <span className="text-slate-400 font-normal">(opsional)</span>
                                    </Label>
                                    <Input
                                        id="kost_address"
                                        placeholder="Jl. Merdeka No. 10, ..."
                                        value={form.kost_address}
                                        onChange={(e) => setForm({ ...form, kost_address: e.target.value })}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Mendaftar...</>
                                ) : (
                                    "Buat Akun"
                                )}
                            </Button>
                        </form>

                        <p className="text-center text-sm text-slate-500 mt-4">
                            Sudah punya akun?{" "}
                            <Link href="/login" className="text-slate-900 font-semibold hover:underline">
                                Masuk di sini
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
