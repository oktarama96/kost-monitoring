"use client";

import { useState, useEffect, useCallback } from "react";
import { OwnerWithKost } from "@/lib/db";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Plus, Pencil, Trash2, BedDouble, RefreshCw, Users, Building2,
} from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
    name: "", email: "", password: "", kost_name: "", kost_address: "",
};

export default function AdminPage() {
    const [owners, setOwners] = useState<OwnerWithKost[]>([]);
    const [loading, setLoading] = useState(true);

    const [addDialog, setAddDialog] = useState(false);
    const [editDialog, setEditDialog] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [targetOwner, setTargetOwner] = useState<OwnerWithKost | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchOwners = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/owners");
            const data = await res.json();
            setOwners(Array.isArray(data) ? data : []);
        } catch {
            toast.error("Gagal memuat data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOwners(); }, [fetchOwners]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/owners", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("Akun penyedia kost berhasil dibuat!");
            setAddDialog(false);
            setForm(emptyForm);
            fetchOwners();
        } catch (err) { toast.error(String(err)); }
        finally { setSubmitting(false); }
    }

    function openEdit(owner: OwnerWithKost) {
        setTargetOwner(owner);
        setForm({
            name: owner.name, email: owner.email, password: "",
            kost_name: owner.kost_name ?? "", kost_address: owner.kost_address ?? "",
        });
        setEditDialog(true);
    }

    async function handleEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!targetOwner) return;
        setSubmitting(true);
        try {
            const body: Record<string, string> = {};
            if (form.name !== targetOwner.name) body.name = form.name;
            if (form.email !== targetOwner.email) body.email = form.email;
            if (form.password) body.password = form.password;
            if (form.kost_name !== (targetOwner.kost_name ?? "")) body.kost_name = form.kost_name;
            if (form.kost_address !== (targetOwner.kost_address ?? "")) body.kost_address = form.kost_address;

            const res = await fetch(`/api/admin/owners/${targetOwner.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("Data berhasil diperbarui!");
            setEditDialog(false);
            fetchOwners();
        } catch (err) { toast.error(String(err)); }
        finally { setSubmitting(false); }
    }

    async function handleDelete() {
        if (!targetOwner) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/owners/${targetOwner.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("Akun berhasil dihapus beserta semua data kostnya.");
            setDeleteDialog(false);
            fetchOwners();
        } catch (err) { toast.error(String(err)); }
        finally { setSubmitting(false); }
    }

    const formatDate = (d?: string) => d
        ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        : "—";

    const totalRooms = owners.reduce((sum, o) => sum + (o.room_count ?? 0), 0);

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Manajemen Penyedia Kost</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Kelola akun pengelola kost yang terdaftar
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchOwners}
                        disabled={loading}
                        className="gap-1.5"
                    >
                        <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => { setForm(emptyForm); setAddDialog(true); }}
                        size="sm"
                        className="gap-2"
                    >
                        <Plus size={14} /> Tambah Owner
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="pt-5 pb-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                            <Users size={18} className="text-violet-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{owners.length}</p>
                            <p className="text-xs text-muted-foreground">Total Penyedia Kost</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="pt-5 pb-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            <BedDouble size={18} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{totalRooms}</p>
                            <p className="text-xs text-muted-foreground">Total Kamar Terdaftar</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Building2 size={15} className="text-violet-500" />
                        Daftar Penyedia Kost
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Klik Hapus untuk menghapus akun beserta seluruh data kamar dan tagihannya
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : owners.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                                <Users className="text-muted-foreground" size={22} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Belum ada penyedia kost terdaftar
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-2">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/60">
                                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nama</TableHead>
                                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</TableHead>
                                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nama Kost</TableHead>
                                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alamat</TableHead>
                                        <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kamar</TableHead>
                                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Terdaftar</TableHead>
                                        <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {owners.map((owner) => (
                                        <TableRow key={owner.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-semibold text-foreground">{owner.name}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{owner.email}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{owner.kost_name ?? "—"}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm max-w-40 truncate">{owner.kost_address ?? "—"}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="text-xs">
                                                    {owner.room_count} kamar
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{formatDate(owner.created_at)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEdit(owner)}
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Pencil size={13} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => { setTargetOwner(owner); setDeleteDialog(true); }}
                                                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={13} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Add Dialog ── */}
            <Dialog open={addDialog} onOpenChange={setAddDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Penyedia Kost</DialogTitle>
                        <DialogDescription>
                            Buat akun baru untuk pengelola kost beserta informasi kostnya
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="border-b border-border/60 pb-4 space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Akun</p>
                            <Field label="Nama" id="a_name" placeholder="Nama pengelola"
                                value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
                            <Field label="Email" id="a_email" type="email" placeholder="email@example.com"
                                value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
                            <Field label="Password" id="a_pass" type="password" placeholder="Min. 8 karakter"
                                value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} required />
                        </div>
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Informasi Kost</p>
                            <Field label="Nama Kost" id="a_kost" placeholder="cth: Kost Makmur"
                                value={form.kost_name} onChange={v => setForm(f => ({ ...f, kost_name: v }))} required />
                            <Field label="Alamat" id="a_addr" placeholder="Jl. ... (opsional)"
                                value={form.kost_address} onChange={v => setForm(f => ({ ...f, kost_address: v }))} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAddDialog(false)}>Batal</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Menyimpan..." : "Buat Akun"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Edit Dialog ── */}
            <Dialog open={editDialog} onOpenChange={setEditDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Penyedia Kost</DialogTitle>
                        <DialogDescription>
                            Perbarui data{" "}
                            <span className="font-semibold text-foreground">{targetOwner?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="border-b border-border/60 pb-4 space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Akun</p>
                            <Field label="Nama" id="e_name" value={form.name}
                                onChange={v => setForm(f => ({ ...f, name: v }))} required />
                            <Field label="Email" id="e_email" type="email" value={form.email}
                                onChange={v => setForm(f => ({ ...f, email: v }))} required />
                            <Field label="Password Baru" id="e_pass" type="password" placeholder="Kosongkan jika tidak diubah"
                                value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
                        </div>
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Informasi Kost</p>
                            <Field label="Nama Kost" id="e_kost" value={form.kost_name}
                                onChange={v => setForm(f => ({ ...f, kost_name: v }))} required />
                            <Field label="Alamat" id="e_addr" value={form.kost_address}
                                onChange={v => setForm(f => ({ ...f, kost_address: v }))} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>Batal</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Delete Dialog ── */}
            <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Penyedia Kost</DialogTitle>
                        <DialogDescription>
                            Yakin ingin menghapus akun{" "}
                            <span className="font-semibold text-foreground">{targetOwner?.name}</span>?{" "}
                            Semua data kost, kamar, penghuni, dan tagihan akan ikut terhapus permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialog(false)}>Batal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting ? "Menghapus..." : "Ya, Hapus Semua"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Field({
    label, id, value, onChange, type = "text", placeholder, required,
}: {
    label: string; id: string; value: string;
    onChange: (v: string) => void; type?: string;
    placeholder?: string; required?: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
            <Input
                id={id}
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={e => onChange(e.target.value)}
                required={required}
            />
        </div>
    );
}
