"use client";

import { useState, useEffect, useCallback } from "react";
import { Room, Bill } from "@/lib/types";
import {
  formatRupiah,
  formatNumber,
  MONTH_NAMES,
  generateBillText,
} from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Copy,
  Trash2,
  RefreshCw,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

interface BillWithRoom extends Bill {
  room?: Room;
}

export default function BillingListPage() {
  const [bills, setBills] = useState<BillWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBill, setDeletingBill] = useState<BillWithRoom | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth !== "all") params.set("month", selectedMonth);
      params.set("year", selectedYear);

      const url =
        selectedMonth !== "all"
          ? `/api/bills?month=${selectedMonth}&year=${selectedYear}`
          : `/api/bills?year=${selectedYear}`;

      const res = await fetch(url);
      const data = await res.json();
      setBills(data);
    } catch {
      toast.error("Gagal memuat data tagihan");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  async function togglePaidStatus(bill: BillWithRoom) {
    if (bill.status === "expired") return;
    setTogglingId(bill.id);
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_paid: bill.status !== "paid" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const updated = await res.json();
      setBills((prev) =>
        prev.map((b) =>
          b.id === bill.id ? { ...b, status: updated.status } : b
        )
      );
      toast.success(updated.status === "paid" ? "Tagihan ditandai Lunas!" : "Status diubah ke Belum Lunas");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setTogglingId(null);
    }
  }

  function handleGenerateText(bill: BillWithRoom) {
    if (!bill.room) {
      toast.error("Data kamar tidak ditemukan");
      return;
    }

    const text = generateBillText({
      tenant_name: bill.tenant_snapshot_name ?? bill.room.room_name,
      room_name: bill.room.room_name,
      month: bill.month,
      year: bill.year,
      base_price: bill.room.base_price,
      monthly_fee: bill.room.monthly_fee,
      meter_start: bill.meter_start,
      meter_end: bill.meter_end,
      kwh_used: bill.kwh_used,
      price_per_kwh: bill.room.price_per_kwh,
      total_amount: bill.total_amount,
    });

    setGeneratedText(text);
    setTextDialogOpen(true);
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(generatedText);
      toast.success("Teks berhasil disalin!");
    } catch {
      toast.error("Gagal menyalin teks. Salin manual dari kotak di bawah.");
    }
  }

  function openDeleteDialog(bill: BillWithRoom) {
    setDeletingBill(bill);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingBill) return;
    try {
      const res = await fetch(`/api/bills/${deletingBill.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Tagihan berhasil dihapus");
      setDeleteDialogOpen(false);
      fetchBills();
    } catch (err) {
      toast.error(String(err));
    }
  }

  // Statistik summary
  const totalAmount = bills.reduce((sum, b) => sum + b.total_amount, 0);
  const paidAmount = bills
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + b.total_amount, 0);
  const unpaidAmount = bills
    .filter((b) => b.status === "unpaid")
    .reduce((sum, b) => sum + b.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Daftar Tagihan</h1>
        <p className="text-slate-500 mt-1">
          Kelola status pembayaran dan generate teks tagihan
        </p>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter size={16} />
            Filter Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-40">
              <Label>Bulan</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {Object.entries(MONTH_NAMES).map(([num, name]) => (
                    <SelectItem key={num} value={num}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-28">
              <Label>Tahun</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={fetchBills}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Muat Ulang
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Strip */}
      {bills.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Total</p>
            <p className="text-lg font-bold text-slate-900">
              {formatRupiah(totalAmount)}
            </p>
            <p className="text-xs text-slate-400">{bills.length} tagihan</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
            <p className="text-xs text-green-600 mb-1">Lunas</p>
            <p className="text-lg font-bold text-green-700">
              {formatRupiah(paidAmount)}
            </p>
            <p className="text-xs text-green-500">
              {bills.filter((b) => b.status === "paid").length} tagihan
            </p>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
            <p className="text-xs text-red-600 mb-1">Belum Lunas</p>
            <p className="text-lg font-bold text-red-700">
              {formatRupiah(unpaidAmount)}
            </p>
            <p className="text-xs text-red-500">
              {bills.filter((b) => b.status === "unpaid").length} tagihan
            </p>
          </div>
        </div>
      )}

      {/* Bills Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-slate-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <MessageSquare className="mx-auto mb-3 text-slate-300" size={48} />
              <p className="font-medium">Tidak ada tagihan ditemukan</p>
              <p className="text-sm mt-1">
                Coba ubah filter bulan/tahun atau tambah tagihan baru
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kamar</TableHead>
                    <TableHead>Penyewa</TableHead>
                    <TableHead className="text-center">Periode</TableHead>
                    <TableHead className="text-center">Meteran</TableHead>
                    <TableHead className="text-right">kWh</TableHead>
                    <TableHead className="text-right">Listrik</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => {
                    const electricCost = bill.room
                      ? bill.kwh_used * bill.room.price_per_kwh
                      : 0;

                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">
                          {bill.room?.room_name ?? bill.room_id}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {bill.tenant_snapshot_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm text-slate-500">
                          {MONTH_NAMES[bill.month]}/{bill.year}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-sm text-slate-500">
                            {formatNumber(bill.meter_start)}
                          </span>
                          <span className="text-slate-300 mx-1">→</span>
                          <span className="font-mono text-sm font-semibold text-slate-700">
                            {formatNumber(bill.meter_end)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {bill.kwh_used} kWh
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-600">
                          {formatRupiah(electricCost)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatRupiah(bill.total_amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {bill.status === "expired" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-slate-100 text-slate-400 border border-slate-200 cursor-default">
                              Kedaluwarsa
                            </span>
                          ) : (
                            <button
                              onClick={() => togglePaidStatus(bill)}
                              disabled={togglingId === bill.id}
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                              style={{
                                background: bill.status === "paid" ? "#dcfce7" : "#fee2e2",
                                color: bill.status === "paid" ? "#15803d" : "#dc2626",
                                border: `1px solid ${bill.status === "paid" ? "#86efac" : "#fca5a5"}`,
                              }}
                            >
                              {togglingId === bill.id ? (
                                <RefreshCw size={11} className="animate-spin" />
                              ) : bill.status === "paid" ? (
                                <CheckCircle2 size={11} />
                              ) : (
                                <XCircle size={11} />
                              )}
                              {bill.status === "paid" ? "Lunas" : "Belum"}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateText(bill)}
                              className="h-7 px-2 text-xs flex items-center gap-1"
                            >
                              <MessageSquare size={11} />
                              Text
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(bill)}
                              className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={11} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Text Dialog */}
      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={18} />
              Teks Tagihan Siap Kirim
            </DialogTitle>
            <DialogDescription>
              Salin teks di bawah ini untuk dikirim ke penyewa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={generatedText}
              readOnly
              className="min-h-60 font-mono text-sm resize-none bg-slate-50"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <Button
              onClick={handleCopyText}
              className="w-full flex items-center gap-2"
            >
              <Copy size={14} />
              Salin ke Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus Tagihan</DialogTitle>
            <DialogDescription>
              Anda yakin ingin menghapus tagihan{" "}
              <span className="font-semibold text-slate-800">
                {deletingBill?.room?.room_name} —{" "}
                {deletingBill && MONTH_NAMES[deletingBill.month]}/
                {deletingBill?.year}
              </span>{" "}
              senilai{" "}
              <span className="font-semibold text-red-600">
                {deletingBill && formatRupiah(deletingBill.total_amount)}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Ya, Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
