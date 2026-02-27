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
import { Zap, Save, RefreshCw, Calculator, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

interface RoomEntry {
  room: Room;
  meter_end: string;
  meter_start: number | null;
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
  // Track loading state per kamar: { [roomId]: boolean }
  const [submittingIds, setSubmittingIds] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, billsRes] = await Promise.all([
        fetch("/api/rooms"),
        fetch(`/api/bills?month=${selectedMonth}&year=${selectedYear}`),
      ]);

      const rooms: Room[] = await roomsRes.json();
      const bills: (Bill & { room?: Room })[] = await billsRes.json();

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
          meter_end: existingBill ? String(existingBill.meter_end) : "",
          meter_start:
            existingBill?.meter_start ??
            (prevMeter.meter_end !== null ? prevMeter.meter_end : null),
          meter_start_override:
            existingBill?.meter_start != null && prevMeter.meter_end === null
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

  async function handleSaveOne(entry: RoomEntry) {
    // Validasi
    if (entry.meter_end === "") {
      toast.warning(`Isi angka meteran untuk ${entry.room.room_name}`);
      return;
    }
    if (entry.meter_start === null && entry.meter_start_override === "") {
      toast.error(`Isi angka meteran awal untuk ${entry.room.room_name}`);
      return;
    }

    const meterEnd = Number(entry.meter_end);
    const meterStart =
      entry.meter_start !== null
        ? entry.meter_start
        : Number(entry.meter_start_override);

    if (meterEnd < meterStart) {
      toast.error(
        `Meteran akhir (${meterEnd}) tidak boleh lebih kecil dari meteran awal (${meterStart})`
      );
      return;
    }

    setSubmittingIds((prev) => ({ ...prev, [entry.room.id]: true }));
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: Number(selectedMonth),
          year: Number(selectedYear),
          entries: [
            {
              room_id: entry.room.id,
              meter_end: meterEnd,
              ...(entry.meter_start === null && {
                meter_start_override: Number(entry.meter_start_override),
              }),
            },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const result = await res.json();
      const isNew = result.created.length > 0;

      toast.success(
        `${entry.room.room_name} — tagihan ${isNew ? "berhasil disimpan" : "berhasil diperbarui"}!`
      );

      // Refresh hanya entry kamar ini agar meter_start terupdate
      fetchData();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmittingIds((prev) => ({ ...prev, [entry.room.id]: false }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Input Tagihan</h1>
        <p className="text-slate-500 mt-1">
          Masukkan angka meteran listrik saat ini per kamar. Simpan tagihan
          masing-masing kamar secara terpisah.
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

      {/* Daftar Kamar */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-slate-400">
            Belum ada kamar. Tambahkan kamar terlebih dahulu.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isPaid = entry.existingBill?.is_paid;
            const isExisting = !!entry.existingBill;
            const isSubmitting = submittingIds[entry.room.id] ?? false;

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
            const meterTooSmall =
              entry.meter_end !== "" &&
              meterStartNum !== null &&
              meterEndNum < meterStartNum;

            return (
              <Card
                key={entry.room.id}
                className={`transition-colors ${
                  isPaid
                    ? "border-green-200 bg-green-50"
                    : isExisting
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200"
                }`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                    {/* Info Kamar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">
                          {entry.room.room_name}
                        </p>
                        {isPaid && (
                          <Badge className="bg-green-600 text-xs gap-1">
                            <CheckCircle2 size={10} /> Lunas
                          </Badge>
                        )}
                        {isExisting && !isPaid && (
                          <Badge variant="secondary" className="text-xs">
                            Sudah Ada
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{entry.room.tenant_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatRupiah(entry.room.base_price)} + iuran{" "}
                        {formatRupiah(entry.room.monthly_fee)} +{" "}
                        {formatRupiah(entry.room.price_per_kwh)}/kWh
                      </p>
                    </div>

                    {/* Input Meteran */}
                    <div className="flex flex-wrap items-end gap-3">

                      {/* Meteran Awal */}
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">
                          Meteran Awal
                        </Label>
                        {hasNoPrevHistory ? (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              placeholder="Isi manual"
                              value={entry.meter_start_override}
                              onChange={(e) =>
                                updateMeterStartOverride(entry.room.id, e.target.value)
                              }
                              min={0}
                              className="w-28 text-right border-amber-300 focus-visible:ring-amber-400"
                              disabled={isPaid}
                            />
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <Info size={10} /> Bulan pertama
                            </p>
                          </div>
                        ) : (
                          <div className="w-28 h-9 flex items-center justify-end px-3 bg-slate-100 rounded-md border border-slate-200 text-sm font-mono font-semibold text-slate-600">
                            {entry.meter_start}
                          </div>
                        )}
                      </div>

                      {/* Panah */}
                      <div className="pb-1.5 text-slate-400 font-bold text-lg">→</div>

                      {/* Meteran Akhir */}
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
                          className={`w-32 text-right font-mono ${meterTooSmall ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                          disabled={isPaid}
                        />
                      </div>

                      {/* Preview Total */}
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
                        ) : meterTooSmall ? (
                          <p className="text-xs text-red-500 font-medium">
                            Meteran akhir lebih kecil dari awal
                          </p>
                        ) : (
                          <p className="text-slate-300 text-sm">—</p>
                        )}
                      </div>

                      {/* Tombol Simpan per Kamar */}
                      <Button
                        onClick={() => handleSaveOne(entry)}
                        disabled={isPaid || isSubmitting || entry.meter_end === ""}
                        size="sm"
                        className="flex items-center gap-1.5 min-w-24"
                      >
                        {isSubmitting ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Save size={13} />
                        )}
                        {isSubmitting
                          ? "Menyimpan..."
                          : isExisting
                            ? "Perbarui"
                            : "Simpan"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
