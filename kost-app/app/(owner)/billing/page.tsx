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
import {
  Zap, Save, RefreshCw, Calculator, Info, CheckCircle2,
} from "lucide-react";
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
              status: existingBill.status,
              tenant_snapshot_name: existingBill.tenant_snapshot_name,
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

      fetchData();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmittingIds((prev) => ({ ...prev, [entry.room.id]: false }));
    }
  }

  const savedCount = entries.filter((e) => e.existingBill).length;
  const paidCount = entries.filter((e) => e.existingBill?.status === "paid").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Input Tagihan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Masukkan angka meteran listrik saat ini per kamar
          </p>
        </div>
        {entries.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full w-fit">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>
              <span className="font-bold text-foreground">{paidCount}</span>/{entries.length} lunas
              {savedCount > paidCount && (
                <span className="ml-1 text-muted-foreground">
                  · {savedCount} tersimpan
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Period selector */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Pilih Periode Tagihan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-36">
              <Label className="text-xs font-medium">Bulan</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9">
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
              onClick={fetchData}
              disabled={loading}
              className="gap-2 h-9"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Muat Ulang
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Room entries */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="border-dashed border-2 border-border/60 shadow-none">
          <CardContent className="text-center py-12 text-muted-foreground">
            Belum ada kamar. Tambahkan kamar terlebih dahulu.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isPaid = entry.existingBill?.status === "paid";
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
                className={`shadow-sm transition-colors ${
                  isPaid
                    ? "border-emerald-200/60 bg-emerald-50/20"
                    : isExisting
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/60"
                }`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Room info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">
                          {entry.room.room_name}
                        </p>
                        {isPaid && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs gap-1">
                            <CheckCircle2 size={10} /> Lunas
                          </Badge>
                        )}
                        {isExisting && !isPaid && (
                          <Badge variant="secondary" className="text-xs">
                            Tersimpan
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {entry.existingBill?.tenant_snapshot_name ?? "Belum ada penghuni"}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {formatRupiah(entry.room.base_price)} + iuran{" "}
                        {formatRupiah(entry.room.monthly_fee)} +{" "}
                        {formatRupiah(entry.room.price_per_kwh)}/kWh
                      </p>
                    </div>

                    {/* Meter inputs */}
                    <div className="flex flex-wrap items-end gap-3">
                      {/* Meter start */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
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
                              className="w-28 text-right font-mono border-amber-300 focus-visible:ring-amber-400 h-9"
                              disabled={isPaid}
                            />
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <Info size={10} /> Bulan pertama
                            </p>
                          </div>
                        ) : (
                          <div className="w-28 h-9 flex items-center justify-end px-3 bg-muted rounded-md border border-border/60 text-sm font-mono font-semibold text-muted-foreground">
                            {entry.meter_start}
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="pb-1.5 text-muted-foreground font-bold text-lg">→</div>

                      {/* Meter end */}
                      <div className="space-y-1">
                        <Label
                          htmlFor={`meter-end-${entry.room.id}`}
                          className="text-xs font-semibold flex items-center gap-1"
                        >
                          <Zap size={10} className="text-amber-500" />
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
                          className={`w-32 text-right font-mono h-9 ${
                            meterTooSmall
                              ? "border-red-400 focus-visible:ring-red-400"
                              : ""
                          }`}
                          disabled={isPaid}
                        />
                      </div>

                      {/* Preview */}
                      <div className="text-right min-w-36 pb-0.5">
                        {kwhPreview !== null ? (
                          <div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                              <Calculator size={11} />
                              {kwhPreview} kWh
                            </div>
                            <p className="font-bold text-foreground text-base">
                              {formatRupiah(totalPreview!)}
                            </p>
                          </div>
                        ) : meterTooSmall ? (
                          <p className="text-xs text-red-500 font-medium">
                            Meteran akhir lebih kecil
                          </p>
                        ) : (
                          <p className="text-muted-foreground/40 text-sm">—</p>
                        )}
                      </div>

                      {/* Save button */}
                      <Button
                        onClick={() => handleSaveOne(entry)}
                        disabled={isPaid || isSubmitting || entry.meter_end === ""}
                        size="sm"
                        className="gap-1.5 min-w-24 h-9"
                        variant={isPaid ? "secondary" : "default"}
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
