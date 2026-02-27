"use client";

import { useState, useEffect, useCallback } from "react";
import { Room, Tenant } from "@/lib/types";
import { formatRupiah } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, BedDouble, Zap, Banknote, UserPlus,
  UserMinus, Phone, CalendarDays, ChevronDown, ChevronUp, History,
} from "lucide-react";
import { toast } from "sonner";

type RoomWithTenant = Room & { active_tenant?: Tenant | null };

const emptyRoomForm = {
  room_name: "",
  base_price: "",
  monthly_fee: "",
  price_per_kwh: "",
  tenant_name: "",
  tenant_phone: "",
  tenant_check_in_date: new Date().toISOString().split("T")[0],
};

const emptyCheckinForm = {
  name: "",
  phone: "",
  check_in_date: new Date().toISOString().split("T")[0],
};

const todayDate = () => new Date().toISOString().split("T")[0];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomWithTenant[]>([]);
  const [tenantHistory, setTenantHistory] = useState<Record<string, Tenant[]>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [addEditDialog, setAddEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [checkinDialog, setCheckinDialog] = useState(false);

  const [editingRoom, setEditingRoom] = useState<RoomWithTenant | null>(null);
  const [targetRoom, setTargetRoom] = useState<RoomWithTenant | null>(null);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [checkinForm, setCheckinForm] = useState(emptyCheckinForm);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [checkoutDate, setCheckoutDate] = useState(todayDate());
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

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  async function fetchHistory(roomId: string) {
    try {
      const res = await fetch(`/api/rooms/${roomId}/tenants`);
      const data = await res.json();
      setTenantHistory((prev) => ({ ...prev, [roomId]: data }));
    } catch {
      // silent
    }
  }

  function toggleHistory(roomId: string) {
    const willExpand = !expandedHistory[roomId];
    setExpandedHistory((prev) => ({ ...prev, [roomId]: willExpand }));
    if (willExpand && !tenantHistory[roomId]) {
      fetchHistory(roomId);
    }
  }

  // ── Add/Edit Room ──────────────────────────────────────────────
  function openAddDialog() {
    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
    setAddEditDialog(true);
  }

  function openEditDialog(room: RoomWithTenant) {
    setEditingRoom(room);
    setRoomForm({
      room_name: room.room_name,
      base_price: String(room.base_price),
      monthly_fee: String(room.monthly_fee),
      price_per_kwh: String(room.price_per_kwh),
      tenant_name: "",
      tenant_phone: "",
      tenant_check_in_date: todayDate(),
    });
    setAddEditDialog(true);
  }

  async function handleRoomSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res;
      if (editingRoom) {
        res = await fetch(`/api/rooms/${editingRoom.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_name: roomForm.room_name,
            base_price: Number(roomForm.base_price),
            monthly_fee: Number(roomForm.monthly_fee),
            price_per_kwh: Number(roomForm.price_per_kwh),
          }),
        });
      } else {
        res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_name: roomForm.room_name,
            base_price: Number(roomForm.base_price),
            monthly_fee: Number(roomForm.monthly_fee),
            price_per_kwh: Number(roomForm.price_per_kwh),
            tenant_name: roomForm.tenant_name || undefined,
            tenant_phone: roomForm.tenant_phone || undefined,
            tenant_check_in_date: roomForm.tenant_name ? roomForm.tenant_check_in_date : undefined,
          }),
        });
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(editingRoom ? "Kamar berhasil diperbarui!" : "Kamar berhasil ditambahkan!");
      setAddEditDialog(false);
      fetchRooms();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete Room ────────────────────────────────────────────────
  async function handleDelete() {
    if (!targetRoom) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${targetRoom.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Kamar berhasil dihapus!");
      setDeleteDialog(false);
      fetchRooms();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Checkout ───────────────────────────────────────────────────
  async function handleCheckout() {
    if (!targetRoom) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${targetRoom.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: checkoutNotes || null, check_out_date: checkoutDate }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Penghuni berhasil keluar. Tagihan belum lunas ditandai kedaluwarsa.");
      setCheckoutDialog(false);
      setCheckoutNotes("");
      setCheckoutDate(todayDate());
      fetchRooms();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Check-in ───────────────────────────────────────────────────
  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!targetRoom) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${targetRoom.id}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: checkinForm.name,
          phone: checkinForm.phone || null,
          check_in_date: checkinForm.check_in_date,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Penghuni baru berhasil didaftarkan!");
      setCheckinDialog(false);
      setCheckinForm(emptyCheckinForm);
      fetchRooms();
      // Reset history cache for this room
      setTenantHistory((prev) => { const n = { ...prev }; delete n[targetRoom.id]; return n; });
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Kelola Kamar</h1>
          <p className="text-slate-500 mt-1">Tambah, edit, hapus kamar dan kelola penghuni</p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-2">
          <Plus size={16} /> Tambah Kamar
        </Button>
      </div>

      {/* Room Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 bg-slate-200 rounded w-3/4" /></CardHeader>
              <CardContent><div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded" />
                <div className="h-4 bg-slate-200 rounded" />
              </div></CardContent>
            </Card>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <BedDouble className="mx-auto mb-4 text-slate-300" size={48} />
            <p className="text-slate-500 font-medium">Belum ada kamar</p>
            <p className="text-slate-400 text-sm mt-1">Klik &quot;Tambah Kamar&quot; untuk mulai</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const tenant = room.active_tenant;
            const hasHistory = expandedHistory[room.id];
            const history = tenantHistory[room.id] ?? [];

            return (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{room.room_name}</CardTitle>
                      <CardDescription className="mt-0.5">ID: {room.id}</CardDescription>
                    </div>
                    <Badge
                      variant={tenant ? "default" : "secondary"}
                      className={tenant ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {tenant ? "Terisi" : "Kosong"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Tenant info */}
                  {tenant ? (
                    <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                        <BedDouble size={13} /> {tenant.name}
                      </div>
                      {tenant.phone && (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <Phone size={11} /> {tenant.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <CalendarDays size={11} /> Masuk: {formatDate(tenant.check_in_date)}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-400 text-center">
                      Tidak ada penghuni
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-slate-500"><Banknote size={13} /> Harga Kamar</span>
                      <span className="font-semibold">{formatRupiah(room.base_price)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-slate-500"><Banknote size={13} /> Iuran Bulanan</span>
                      <span className="font-semibold">{formatRupiah(room.monthly_fee)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-slate-500"><Zap size={13} /> Harga / kWh</span>
                      <span className="font-semibold">{formatRupiah(room.price_per_kwh)}</span>
                    </div>
                  </div>

                  {/* Tenant actions */}
                  <div className="flex gap-2">
                    {tenant ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => { setTargetRoom(room); setCheckoutDialog(true); }}
                      >
                        <UserMinus size={13} className="mr-1" /> Pindah Keluar
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => { setTargetRoom(room); setCheckinForm(emptyCheckinForm); setCheckinDialog(true); }}
                      >
                        <UserPlus size={13} className="mr-1" /> Tambah Penghuni
                      </Button>
                    )}
                    <Button
                      variant="outline" size="sm" className="flex-1"
                      onClick={() => openEditDialog(room)}
                    >
                      <Pencil size={13} className="mr-1" /> Edit
                    </Button>
                    <Button
                      variant="destructive" size="sm"
                      onClick={() => { setTargetRoom(room); setDeleteDialog(true); }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>

                  {/* Tenant history toggle */}
                  <button
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors w-full"
                    onClick={() => toggleHistory(room.id)}
                  >
                    <History size={11} />
                    Histori Penghuni
                    {hasHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>

                  {hasHistory && (
                    <div className="border-t pt-2 space-y-1.5">
                      {history.length === 0 ? (
                        <p className="text-xs text-slate-400">Belum ada histori</p>
                      ) : (
                        history.map((t) => (
                          <div key={t.id} className="text-xs text-slate-500 flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                            <span className="font-medium text-slate-700">{t.name}</span>
                            <span>
                              {formatDate(t.check_in_date)} — {t.check_out_date ? formatDate(t.check_out_date) : <span className="text-green-600">Aktif</span>}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit Room Dialog ── */}
      <Dialog open={addEditDialog} onOpenChange={setAddEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRoom ? "Edit Kamar" : "Tambah Kamar Baru"}</DialogTitle>
            <DialogDescription>
              {editingRoom ? `Perbarui data ${editingRoom.room_name}` : "Isi detail kamar yang ingin ditambahkan"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRoomSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room_name">Nama Kamar</Label>
              <Input id="room_name" placeholder="cth: Kamar A1" value={roomForm.room_name}
                onChange={(e) => setRoomForm((f) => ({ ...f, room_name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_price">Harga Kamar (Rp)</Label>
                <Input id="base_price" type="number" placeholder="1500000" value={roomForm.base_price}
                  onChange={(e) => setRoomForm((f) => ({ ...f, base_price: e.target.value }))} min={0} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_fee">Iuran Bulanan (Rp)</Label>
                <Input id="monthly_fee" type="number" placeholder="50000" value={roomForm.monthly_fee}
                  onChange={(e) => setRoomForm((f) => ({ ...f, monthly_fee: e.target.value }))} min={0} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_kwh">Harga per kWh (Rp)</Label>
              <Input id="price_per_kwh" type="number" placeholder="2000" value={roomForm.price_per_kwh}
                onChange={(e) => setRoomForm((f) => ({ ...f, price_per_kwh: e.target.value }))} min={0} required />
            </div>
            {!editingRoom && (
              <div className="border-t pt-3 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase">Penghuni Awal (Opsional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_tenant_name">Nama Penghuni</Label>
                    <Input id="new_tenant_name" placeholder="Budi Santoso" value={roomForm.tenant_name}
                      onChange={(e) => setRoomForm((f) => ({ ...f, tenant_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_tenant_phone">No. HP</Label>
                    <Input id="new_tenant_phone" placeholder="08xx" value={roomForm.tenant_phone}
                      onChange={(e) => setRoomForm((f) => ({ ...f, tenant_phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_tenant_checkin">Tanggal Masuk</Label>
                  <Input id="new_tenant_checkin" type="date" value={roomForm.tenant_check_in_date}
                    onChange={(e) => setRoomForm((f) => ({ ...f, tenant_check_in_date: e.target.value }))} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddEditDialog(false)} disabled={submitting}>Batal</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : editingRoom ? "Simpan Perubahan" : "Tambah Kamar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus Kamar</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus <span className="font-semibold text-slate-800">{targetRoom?.room_name}</span>? Semua data tagihan kamar ini juga akan terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={submitting}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Checkout Dialog ── */}
      <Dialog open={checkoutDialog} onOpenChange={setCheckoutDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-orange-600">Penghuni Pindah Keluar</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-slate-800">{targetRoom?.active_tenant?.name}</span> akan keluar dari {targetRoom?.room_name}.<br />
              Tagihan yang belum lunas akan otomatis ditandai <span className="font-semibold text-gray-600">Kedaluwarsa</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="checkout_date">Tanggal Keluar</Label>
              <Input id="checkout_date" type="date" value={checkoutDate}
                onChange={(e) => setCheckoutDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout_notes">Catatan <span className="text-slate-400 font-normal">(opsional)</span></Label>
              <Input id="checkout_notes" placeholder="cth: Pindah kota, habis kontrak..." value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialog(false)} disabled={submitting}>Batal</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700" onClick={handleCheckout} disabled={submitting}
            >
              {submitting ? "Memproses..." : "Konfirmasi Keluar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Check-in Dialog ── */}
      <Dialog open={checkinDialog} onOpenChange={setCheckinDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-green-700">Tambah Penghuni Baru</DialogTitle>
            <DialogDescription>Daftarkan penghuni baru untuk {targetRoom?.room_name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckin} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="ci_name">Nama Penghuni</Label>
              <Input id="ci_name" placeholder="Nama lengkap" value={checkinForm.name}
                onChange={(e) => setCheckinForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ci_phone">No. HP <span className="text-slate-400 font-normal">(opsional)</span></Label>
              <Input id="ci_phone" placeholder="08xx-xxxx-xxxx" value={checkinForm.phone}
                onChange={(e) => setCheckinForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ci_date">Tanggal Masuk</Label>
              <Input id="ci_date" type="date" value={checkinForm.check_in_date}
                onChange={(e) => setCheckinForm((f) => ({ ...f, check_in_date: e.target.value }))} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCheckinDialog(false)} disabled={submitting}>Batal</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? "Mendaftarkan..." : "Daftarkan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
