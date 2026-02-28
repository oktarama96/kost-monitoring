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
  TrendingUp,
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
      toast.success(
        updated.status === "paid"
          ? "Tagihan ditandai Lunas!"
          : "Status diubah ke Belum Lunas"
      );
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

  const totalAmount = bills.reduce((sum, b) => sum + b.total_amount, 0);
  const paidAmount = bills
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + b.total_amount, 0);
  const unpaidAmount = bills
    .filter((b) => b.status === "unpaid")
    .reduce((sum, b) => sum + b.total_amount, 0);
  const paidCount = bills.filter((b) => b.status === "paid").length;
  const unpaidCount = bills.filter((b) => b.status === "unpaid").length;
  const collectionRate =
    totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daftar Tagihan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola status pembayaran dan generate teks tagihan
          </p>
        </div>
        {bills.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full w-fit">
            <TrendingUp size={12} className="text-primary" />
            Pelunasan:{" "}
            <span className="font-bold text-foreground">{collectionRate}%</span>
          </div>
        )}
      </div>

      {/* Filter */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filter Periode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-40">
              <Label className="text-xs font-medium">Bulan</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9">
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
            <div className="space-y-1.5 min-w-28">
              <Label className="text-xs font-medium">Tahun</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9">
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
              size="sm"
              onClick={fetchBills}
              disabled={loading}
              className="gap-2 h-9"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Muat Ulang
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary strip */}
      {bills.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total</p>
              <p className="text-lg font-bold text-foreground">
                {formatRupiah(totalAmount)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bills.length} tagihan
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200/60 bg-emerald-50/30 shadow-sm">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-emerald-600 mb-1">Lunas</p>
              <p className="text-lg font-bold text-emerald-700">
                {formatRupiah(paidAmount)}
              </p>
              <p className="text-xs text-emerald-600/70 mt-0.5">
                {paidCount} tagihan
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-200/60 bg-red-50/30 shadow-sm">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-red-600 mb-1">Belum Lunas</p>
              <p className="text-lg font-bold text-red-700">
                {formatRupiah(unpaidAmount)}
              </p>
              <p className="text-xs text-red-600/70 mt-0.5">
                {unpaidCount} tagihan
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bills table */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <MessageSquare className="text-muted-foreground" size={22} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  Tidak ada tagihan ditemukan
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Coba ubah filter bulan/tahun atau tambah tagihan baru
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Kamar
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Penyewa
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Periode
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Meteran
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      kWh
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Listrik
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => {
                    const electricCost = bill.room
                      ? bill.kwh_used * bill.room.price_per_kwh
                      : 0;

                    return (
                      <TableRow
                        key={bill.id}
                        className="border-border/40 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-semibold text-foreground">
                          {bill.room?.room_name ?? bill.room_id}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {bill.tenant_snapshot_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {MONTH_NAMES[bill.month]}/{bill.year}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatNumber(bill.meter_start)}
                          </span>
                          <span className="text-muted-foreground/40 mx-1">→</span>
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {formatNumber(bill.meter_end)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {bill.kwh_used}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatRupiah(electricCost)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatRupiah(bill.total_amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {bill.status === "expired" ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground border border-border/60">
                              Kedaluwarsa
                            </span>
                          ) : (
                            <button
                              onClick={() => togglePaidStatus(bill)}
                              disabled={togglingId === bill.id}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50 border ${
                                bill.status === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
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
                              className="h-7 px-2 text-xs gap-1 border-border/60"
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
              <MessageSquare size={16} />
              Teks Tagihan Siap Kirim
            </DialogTitle>
            <DialogDescription>
              Salin teks di bawah ini untuk dikirim ke penyewa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={generatedText}
              readOnly
              className="min-h-60 font-mono text-sm resize-none bg-muted/30"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <Button
              onClick={handleCopyText}
              className="w-full gap-2"
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
            <DialogTitle>Hapus Tagihan</DialogTitle>
            <DialogDescription>
              Anda yakin ingin menghapus tagihan{" "}
              <span className="font-semibold text-foreground">
                {deletingBill?.room?.room_name} —{" "}
                {deletingBill && MONTH_NAMES[deletingBill.month]}/
                {deletingBill?.year}
              </span>{" "}
              senilai{" "}
              <span className="font-semibold text-destructive">
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
