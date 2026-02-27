"use client";

import { useState, useEffect, useCallback } from "react";
import { Room, Bill } from "@/lib/types";
import { formatRupiah, MONTH_NAMES, calculateBillAmount } from "@/lib/helpers";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap, Save, RefreshCw, Calculator, Info } from "lucide-react";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

interface RoomEntry {
  room: Room;
  // angka meteran akhir bulan ini (yang diinput user)
  meter_end: string;
  // angka meteran awal (otomatis dari tagihan bulan lalu)
  meter_start: number | null;
  // jika tidak ada riwayat, user harus isi meter_start manual
  meter_start_override: string;
  existingBill?: Bill;
}

export default function BillingInputPage() {
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1)
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [entries, setEntries] = useState<RoomEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, billsRes] = await Promise.all([
        fetch("/api/rooms"),
        fetch(`/api/bills?month=${selectedMonth}&year=${selectedYear}`),
      ]);

      const rooms: Room[] = await roomsRes.json();
      const bills: (Bill & { room?: Room })[] = await billsRes.json();

      // Untuk setiap kamar, ambil meter_end bulan sebelumnya secara paralel
      const prevMeterResults = await Promise.all(
        rooms.map((room) =>
          fetch(
            `/api/rooms/${room.id}/last-meter?month=${selectedMonth}&year=${selectedYear}`
          ).then((r) => r.json())
        )
      );

      const newEntries: RoomEntry[] = rooms.map((room, i) => {
        const existingBill = bills.find((b) => b.room_id === room.id);
        const prevMeter = prevMeterResults[i];

        return {
          room,
          // Jika tagihan bulan ini sudah ada, tampilkan meter_end yang tersimpan
          meter_end: existingBill ? String(existingBill.meter_end) : "",
          // meter_start: dari tagihan bulan lalu, atau dari existingBill.meter_start
          meter_start:
            existingBill?.meter_start ??
            (prevMeter.meter_end !== null ? prevMeter.meter_end : null),
          meter_start_override:
            existingBill?.meter_start != null &&
            prevMeter.meter_end === null
              ? String(existingBill.meter_start)
              : "",
          existingBill: existingBill
            ? {
                id: existingBill.id,
                room_id: existingBill.room_id,
                month: existingBill.month,
                year: existingBill.year,
                meter_start: existingBill.meter_start,
                meter_end: existingBill.meter_end,
                kwh_used: existingBill.kwh_used,
                total_amount: existingBill.total_amount,
                is_paid: existingBill.is_paid,
              }
            : undefined,
        };
      });

      setEntries(newEntries);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function updateMeterEnd(roomId: string, value: string) {
    setEntries((prev) =>
      prev.map((e) => (e.room.id === roomId ? { ...e, meter_end: value } : e))
    );
  }

  function updateMeterStartOverride(roomId: string, value: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.room.id === roomId ? { ...e, meter_start_override: value } : e
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validEntries = entries.filter(
      (e) => e.meter_end !== "" && Number(e.meter_end) >= 0
    );

    if (validEntries.length === 0) {
      toast.warning("Tidak ada angka meteran yang diisi");
      return;
    }

    // Validasi: kamar tanpa riwayat harus mengisi meter_start_override
    const missingStart = validEntries.filter(
      (e) => e.meter_start === null && e.meter_start_override === ""
    );
    if (missingStart.length > 0) {
      toast.error(
        `Mohon isi angka meteran awal untuk: ${missingStart.map((e) => e.room.room_name).join(", ")}`
      );
      return;
    }

    const payload = validEntries.map((e) => ({
      room_id: e.room.id,
      meter_end: Number(e.meter_end),
      ...(e.meter_start === null && {
        meter_start_override: Number(e.meter_start_override),
      }),
    }));

    setSubmitting(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: Number(selectedMonth),
          year: Number(selectedYear),
          entries: payload,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const result = await res.json();
      toast.success(
        `${result.created.length} tagihan baru dibuat, ${result.updated.length} diperbarui`
      );
      fetchData();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const filledCount = entries.filter((e) => e.meter_end !== "").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Input Tagihan</h1>
        <p className="text-slate-500 mt-1">
          Masukkan angka meteran listrik saat ini per kamar. Pemakaian kWh
          dihitung otomatis dari selisih meteran bulan lalu.
        </p>
      </div>

      {/* Period Selector */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Pilih Periode Tagihan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-36">
              <Label>Bulan</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              type="button"
              variant="outline"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Muat Ulang
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Input Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Meteran Listrik — {MONTH_NAMES[Number(selectedMonth)]}{" "}
                  {selectedYear}
                </CardTitle>
                <CardDescription>
                  {filledCount} dari {entries.length} kamar sudah diisi
                </CardDescription>
              </div>
              <Button
                type="submit"
                disabled={submitting || loading}
                className="flex items-center gap-2"
              >
                <Save size={14} />
                {submitting ? "Menyimpan..." : "Simpan Tagihan"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-slate-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <p className="text-center text-slate-400 py-8">
                Belum ada kamar. Tambahkan kamar terlebih dahulu.
              </p>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => {
                  const isPaid = entry.existingBill?.is_paid;
                  const isExisting = !!entry.existingBill;

                  // Hitung preview kWh dan total
                  const meterEndNum = Number(entry.meter_end);
                  const meterStartNum =
                    entry.meter_start !== null
                      ? entry.meter_start
                      : entry.meter_start_override !== ""
                        ? Number(entry.meter_start_override)
                        : null;

                  const kwhPreview =
                    entry.meter_end !== "" &&
                    meterStartNum !== null &&
                    meterEndNum >= meterStartNum
                      ? meterEndNum - meterStartNum
                      : null;

                  const totalPreview =
                    kwhPreview !== null
                      ? calculateBillAmount(kwhPreview, entry.room)
                      : null;

                  const hasNoPrevHistory = entry.meter_start === null;

                  return (
                    <div
                      key={entry.room.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        isPaid
                          ? "bg-green-50 border-green-200"
                          : isExisting
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Room Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800">
                              {entry.room.room_name}
                            </p>
                            {isExisting && (
                              <Badge
                                variant={isPaid ? "default" : "secondary"}
                                className={
                                  isPaid ? "bg-green-600 text-xs" : "text-xs"
                                }
                              >
                                {isPaid ? "Lunas" : "Sudah Ada"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            {entry.room.tenant_name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatRupiah(entry.room.base_price)} + iuran{" "}
                            {formatRupiah(entry.room.monthly_fee)} +{" "}
                            {formatRupiah(entry.room.price_per_kwh)}/kWh
                          </p>
                        </div>

                        {/* Meter Inputs */}
                        <div className="flex flex-wrap items-end gap-3">
                          {/* Meteran Awal (meter_start) */}
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-500">
                              Meteran Awal
                            </Label>
                            {hasNoPrevHistory ? (
                              // Tidak ada riwayat bulan lalu — user isi manual
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  placeholder="Isi manual"
                                  value={entry.meter_start_override}
                                  onChange={(e) =>
                                    updateMeterStartOverride(
                                      entry.room.id,
                                      e.target.value
                                    )
                                  }
                                  min={0}
                                  className="w-28 text-right border-amber-300 focus-visible:ring-amber-400"
                                  disabled={isPaid}
                                />
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                  <Info size={10} />
                                  Bulan pertama
                                </p>
                              </div>
                            ) : (
                              // Ada riwayat — tampilkan otomatis, tidak bisa diedit
                              <div className="w-28 h-9 flex items-center justify-end px-3 bg-slate-100 rounded-md border border-slate-200 text-sm font-mono font-semibold text-slate-600">
                                {entry.meter_start}
                              </div>
                            )}
                          </div>

                          {/* Tanda panah pemisah */}
                          <div className="pb-1.5 text-slate-400 font-bold text-lg">
                            →
                          </div>

                          {/* Meteran Akhir (input utama) */}
                          <div className="space-y-1">
                            <Label
                              htmlFor={`meter-end-${entry.room.id}`}
                              className="text-xs font-semibold flex items-center gap-1"
                            >
                              <Zap size={10} className="text-yellow-500" />
                              Meteran Sekarang
                            </Label>
                            <Input
                              id={`meter-end-${entry.room.id}`}
                              type="number"
                              placeholder="0"
                              value={entry.meter_end}
                              onChange={(e) =>
                                updateMeterEnd(entry.room.id, e.target.value)
                              }
                              min={0}
                              className="w-32 text-right font-mono"
                              disabled={isPaid}
                            />
                          </div>

                          {/* Preview kWh & Total */}
                          <div className="text-right min-w-36 pb-0.5">
                            {kwhPreview !== null ? (
                              <div>
                                <div className="flex items-center gap-1 text-xs text-slate-400 justify-end">
                                  <Calculator size={11} />
                                  {kwhPreview} kWh
                                </div>
                                <p className="font-bold text-slate-800 text-base">
                                  {formatRupiah(totalPreview!)}
                                </p>
                              </div>
                            ) : entry.meter_end !== "" &&
                              meterStartNum !== null &&
                              meterEndNum < meterStartNum ? (
                              <p className="text-xs text-red-500 font-medium">
                                Meteran akhir lebih kecil dari awal
                              </p>
                            ) : (
                              <p className="text-slate-300 text-sm">—</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
