"use client";

import { useState, useEffect, useCallback } from "react";
import { Room, Tenant } from "@/lib/types";
import { formatRupiah } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, BedDouble, Zap, Banknote, UserPlus,
  UserMinus, Phone, CalendarDays, ChevronDown, ChevronUp, History,
  Users,
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
      setTenantHistory((prev) => { const n = { ...prev }; delete n[targetRoom.id]; return n; });
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const occupiedCount = rooms.filter((r) => r.active_tenant).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola Kamar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tambah, edit, hapus kamar dan kelola penghuni
          </p>
        </div>
        <div className="flex items-center gap-3">
          {rooms.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <Users size={12} />
              <span>
                <span className="font-bold text-foreground">{occupiedCount}</span>/{rooms.length} terisi
              </span>
            </div>
          )}
          <Button onClick={openAddDialog} className="gap-2 font-semibold" size="sm">
            <Plus size={15} /> Tambah Kamar
          </Button>
        </div>
      </div>

      {/* Room grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/60">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card className="border-dashed border-2 border-border/60 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <BedDouble className="text-muted-foreground" size={28} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Belum ada kamar</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Klik &quot;Tambah Kamar&quot; untuk mulai
              </p>
            </div>
            <Button onClick={openAddDialog} variant="outline" size="sm" className="mt-1 gap-2">
              <Plus size={14} /> Tambah Kamar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {rooms.map((room) => {
            const tenant = room.active_tenant;
            const hasHistory = expandedHistory[room.id];
            const history = tenantHistory[room.id] ?? [];

            return (
              <Card
                key={room.id}
                className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-bold truncate">
                        {room.room_name}
                      </CardTitle>
                    </div>
                    <Badge
                      className={
                        tenant
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shrink-0"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted shrink-0"
                      }
                    >
                      {tenant ? "Terisi" : "Kosong"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 flex-1 flex flex-col">
                  {/* Tenant info */}
                  {tenant ? (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                        <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold">
                          {tenant.name[0]?.toUpperCase()}
                        </div>
                        {tenant.name}
                      </div>
                      {tenant.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600">
                          <Phone size={11} /> {tenant.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-blue-600">
                        <CalendarDays size={11} /> Masuk: {formatDate(tenant.check_in_date)}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground text-center">
                      Tidak ada penghuni
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                    {[
                      { icon: Banknote, label: "Harga Kamar", value: formatRupiah(room.base_price) },
                      { icon: Banknote, label: "Iuran Bulanan", value: formatRupiah(room.monthly_fee) },
                      { icon: Zap, label: "Harga / kWh", value: formatRupiah(room.price_per_kwh) },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Icon size={12} /> {label}
                        </span>
                        <span className="font-semibold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    {tenant ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs"
                        onClick={() => { setTargetRoom(room); setCheckoutDialog(true); }}
                      >
                        <UserMinus size={12} className="mr-1" /> Pindah Keluar
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 text-xs"
                        onClick={() => { setTargetRoom(room); setCheckinForm(emptyCheckinForm); setCheckinDialog(true); }}
                      >
                        <UserPlus size={12} className="mr-1" /> Tambah Penghuni
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => openEditDialog(room)}
                    >
                      <Pencil size={12} className="mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                      onClick={() => { setTargetRoom(room); setDeleteDialog(true); }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>

                  {/* History toggle */}
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
                    onClick={() => toggleHistory(room.id)}
                  >
                    <History size={11} />
                    Histori Penghuni
                    {hasHistory ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
                  </button>

                  {hasHistory && (
                    <div className="border-t border-border/40 pt-2 space-y-1.5">
                      {history.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Belum ada histori</p>
                      ) : (
                        history.map((t) => (
                          <div
                            key={t.id}
                            className="text-xs text-muted-foreground flex justify-between items-center py-1.5 border-b border-border/30 last:border-0"
                          >
                            <span className="font-medium text-foreground">{t.name}</span>
                            <span className="text-right">
                              {formatDate(t.check_in_date)} —{" "}
                              {t.check_out_date ? (
                                formatDate(t.check_out_date)
                              ) : (
                                <span className="text-emerald-600 font-medium">Aktif</span>
                              )}
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
              {editingRoom
                ? `Perbarui data ${editingRoom.room_name}`
                : "Isi detail kamar yang ingin ditambahkan"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRoomSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room_name">Nama Kamar</Label>
              <Input
                id="room_name"
                placeholder="cth: Kamar A1"
                value={roomForm.room_name}
                onChange={(e) => setRoomForm((f) => ({ ...f, room_name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="base_price">Harga Kamar (Rp)</Label>
                <Input
                  id="base_price"
                  type="number"
                  placeholder="1500000"
                  value={roomForm.base_price}
                  onChange={(e) => setRoomForm((f) => ({ ...f, base_price: e.target.value }))}
                  min={0}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_fee">Iuran Bulanan (Rp)</Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  placeholder="50000"
                  value={roomForm.monthly_fee}
                  onChange={(e) => setRoomForm((f) => ({ ...f, monthly_fee: e.target.value }))}
                  min={0}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_kwh">Harga per kWh (Rp)</Label>
              <Input
                id="price_per_kwh"
                type="number"
                placeholder="2000"
                value={roomForm.price_per_kwh}
                onChange={(e) => setRoomForm((f) => ({ ...f, price_per_kwh: e.target.value }))}
                min={0}
                required
              />
            </div>
            {!editingRoom && (
              <div className="border-t border-border/60 pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Penghuni Awal (Opsional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="new_tenant_name">Nama Penghuni</Label>
                    <Input
                      id="new_tenant_name"
                      placeholder="Budi Santoso"
                      value={roomForm.tenant_name}
                      onChange={(e) => setRoomForm((f) => ({ ...f, tenant_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_tenant_phone">No. HP</Label>
                    <Input
                      id="new_tenant_phone"
                      placeholder="08xx"
                      value={roomForm.tenant_phone}
                      onChange={(e) => setRoomForm((f) => ({ ...f, tenant_phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_tenant_checkin">Tanggal Masuk</Label>
                  <Input
                    id="new_tenant_checkin"
                    type="date"
                    value={roomForm.tenant_check_in_date}
                    onChange={(e) => setRoomForm((f) => ({ ...f, tenant_check_in_date: e.target.value }))}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddEditDialog(false)}
                disabled={submitting}
              >
                Batal
              </Button>
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
            <DialogTitle>Hapus Kamar</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus{" "}
              <span className="font-semibold text-foreground">{targetRoom?.room_name}</span>?
              Semua data tagihan kamar ini juga akan terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
              disabled={submitting}
            >
              Batal
            </Button>
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
            <DialogTitle>Penghuni Pindah Keluar</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">
                {targetRoom?.active_tenant?.name}
              </span>{" "}
              akan keluar dari {targetRoom?.room_name}. Tagihan yang belum lunas akan otomatis
              ditandai <span className="font-semibold">Kedaluwarsa</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="checkout_date">Tanggal Keluar</Label>
              <Input
                id="checkout_date"
                type="date"
                value={checkoutDate}
                onChange={(e) => setCheckoutDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout_notes">
                Catatan{" "}
                <span className="text-muted-foreground font-normal">(opsional)</span>
              </Label>
              <Input
                id="checkout_notes"
                placeholder="cth: Pindah kota, habis kontrak..."
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutDialog(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleCheckout}
              disabled={submitting}
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
            <DialogTitle>Tambah Penghuni Baru</DialogTitle>
            <DialogDescription>
              Daftarkan penghuni baru untuk{" "}
              <span className="font-semibold text-foreground">{targetRoom?.room_name}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckin} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ci_name">Nama Penghuni</Label>
              <Input
                id="ci_name"
                placeholder="Nama lengkap"
                value={checkinForm.name}
                onChange={(e) => setCheckinForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci_phone">
                No. HP{" "}
                <span className="text-muted-foreground font-normal">(opsional)</span>
              </Label>
              <Input
                id="ci_phone"
                placeholder="08xx-xxxx-xxxx"
                value={checkinForm.phone}
                onChange={(e) => setCheckinForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci_date">Tanggal Masuk</Label>
              <Input
                id="ci_date"
                type="date"
                value={checkinForm.check_in_date}
                onChange={(e) => setCheckinForm((f) => ({ ...f, check_in_date: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCheckinDialog(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Mendaftarkan..." : "Daftarkan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
