"use client";

import { useState, useEffect, useCallback } from "react";
import { Room } from "@/lib/types";
import { formatRupiah } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, BedDouble, Zap, Banknote } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  room_name: "",
  tenant_name: "",
  base_price: "",
  monthly_fee: "",
  price_per_kwh: "",
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      setRooms(data);
    } catch {
      toast.error("Gagal memuat data kamar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  function openAddDialog() {
    setEditingRoom(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(room: Room) {
    setEditingRoom(room);
    setForm({
      room_name: room.room_name,
      tenant_name: room.tenant_name,
      base_price: String(room.base_price),
      monthly_fee: String(room.monthly_fee),
      price_per_kwh: String(room.price_per_kwh),
    });
    setDialogOpen(true);
  }

  function openDeleteDialog(room: Room) {
    setDeletingRoom(room);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      room_name: form.room_name,
      tenant_name: form.tenant_name,
      base_price: Number(form.base_price),
      monthly_fee: Number(form.monthly_fee),
      price_per_kwh: Number(form.price_per_kwh),
    };

    try {
      let res;
      if (editingRoom) {
        res = await fetch(`/api/rooms/${editingRoom.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success(
        editingRoom ? "Kamar berhasil diperbarui!" : "Kamar berhasil ditambahkan!"
      );
      setDialogOpen(false);
      fetchRooms();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingRoom) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${deletingRoom.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Kamar berhasil dihapus!");
      setDeleteDialogOpen(false);
      fetchRooms();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Kelola Kamar</h1>
          <p className="text-slate-500 mt-1">
            Tambah, edit, dan hapus data kamar kost
          </p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-2">
          <Plus size={16} />
          Tambah Kamar
        </Button>
      </div>

      {/* Room Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded" />
                  <div className="h-4 bg-slate-200 rounded" />
                  <div className="h-4 bg-slate-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <BedDouble className="mx-auto mb-4 text-slate-300" size={48} />
            <p className="text-slate-500 font-medium">Belum ada kamar</p>
            <p className="text-slate-400 text-sm mt-1">
              Klik &quot;Tambah Kamar&quot; untuk mulai menambahkan kamar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{room.room_name}</CardTitle>
                    <CardDescription className="mt-0.5">
                      ID: {room.id}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      room.tenant_name === "Kosong" ? "secondary" : "default"
                    }
                    className={
                      room.tenant_name !== "Kosong"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    {room.tenant_name === "Kosong" ? "Kosong" : "Terisi"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <BedDouble size={14} className="text-slate-400" />
                  <span className="text-slate-500">Penyewa:</span>
                  <span className="font-medium">{room.tenant_name}</span>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Banknote size={13} />
                      Harga Kamar
                    </span>
                    <span className="font-semibold">
                      {formatRupiah(room.base_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Banknote size={13} />
                      Iuran Bulanan
                    </span>
                    <span className="font-semibold">
                      {formatRupiah(room.monthly_fee)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Zap size={13} />
                      Harga / kWh
                    </span>
                    <span className="font-semibold">
                      {formatRupiah(room.price_per_kwh)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(room)}
                  >
                    <Pencil size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => openDeleteDialog(room)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Edit Kamar" : "Tambah Kamar Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingRoom
                ? `Perbarui data untuk ${editingRoom.room_name}`
                : "Isi detail kamar baru yang ingin ditambahkan"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room_name">Nama Kamar</Label>
                <Input
                  id="room_name"
                  placeholder="cth: Kamar A1"
                  value={form.room_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, room_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant_name">Nama Penyewa</Label>
                <Input
                  id="tenant_name"
                  placeholder="cth: Budi Santoso"
                  value={form.tenant_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tenant_name: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="base_price">Harga Kamar (Rp)</Label>
              <Input
                id="base_price"
                type="number"
                placeholder="cth: 1500000"
                value={form.base_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, base_price: e.target.value }))
                }
                min={0}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_fee">Iuran Bulanan (Rp)</Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  placeholder="cth: 50000"
                  value={form.monthly_fee}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, monthly_fee: e.target.value }))
                  }
                  min={0}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_per_kwh">Harga per kWh (Rp)</Label>
                <Input
                  id="price_per_kwh"
                  type="number"
                  placeholder="cth: 2000"
                  value={form.price_per_kwh}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price_per_kwh: e.target.value }))
                  }
                  min={0}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Menyimpan..."
                  : editingRoom
                    ? "Simpan Perubahan"
                    : "Tambah Kamar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus Kamar</DialogTitle>
            <DialogDescription>
              Anda yakin ingin menghapus{" "}
              <span className="font-semibold text-slate-800">
                {deletingRoom?.room_name}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
