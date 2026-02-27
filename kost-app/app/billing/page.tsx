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
import { Zap, Save, RefreshCw, Calculator } from "lucide-react";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

interface RoomEntry {
  room: Room;
  kwh_used: string;
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

      const newEntries: RoomEntry[] = rooms.map((room) => {
        const existingBill = bills.find((b) => b.room_id === room.id);
        return {
          room,
          kwh_used: existingBill ? String(existingBill.kwh_used) : "",
          existingBill: existingBill
            ? {
                id: existingBill.id,
                room_id: existingBill.room_id,
                month: existingBill.month,
                year: existingBill.year,
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

  function updateKwh(roomId: string, value: string) {
    setEntries((prev) =>
      prev.map((e) => (e.room.id === roomId ? { ...e, kwh_used: value } : e))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validEntries = entries
      .filter((e) => e.kwh_used !== "" && Number(e.kwh_used) >= 0)
      .map((e) => ({
        room_id: e.room.id,
        kwh_used: Number(e.kwh_used),
      }));

    if (validEntries.length === 0) {
      toast.warning("Tidak ada data kWh yang diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: Number(selectedMonth),
          year: Number(selectedYear),
          entries: validEntries,
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
      fetchData(); // Refresh untuk tampilkan data terbaru
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const filledCount = entries.filter((e) => e.kwh_used !== "").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Input Tagihan</h1>
        <p className="text-slate-500 mt-1">
          Masukkan pemakaian listrik (kWh) per kamar untuk periode yang dipilih
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
                  Input kWh — {MONTH_NAMES[Number(selectedMonth)]}{" "}
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
                    className="h-20 bg-slate-100 rounded-lg animate-pulse"
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
                  const kwhNum = Number(entry.kwh_used);
                  const estimatedTotal =
                    entry.kwh_used !== "" && !isNaN(kwhNum)
                      ? calculateBillAmount(kwhNum, entry.room)
                      : null;

                  const isExisting = !!entry.existingBill;
                  const isPaid = entry.existingBill?.is_paid;

                  return (
                    <div
                      key={entry.room.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border transition-colors ${
                        isPaid
                          ? "bg-green-50 border-green-200"
                          : isExisting
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-slate-200"
                      }`}
                    >
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
                          Tarif: {formatRupiah(entry.room.base_price)} + iuran{" "}
                          {formatRupiah(entry.room.monthly_fee)} +{" "}
                          {formatRupiah(entry.room.price_per_kwh)}/kWh
                        </p>
                      </div>

                      {/* kWh Input */}
                      <div className="flex items-center gap-3">
                        <div className="space-y-1">
                          <Label
                            htmlFor={`kwh-${entry.room.id}`}
                            className="text-xs"
                          >
                            <Zap size={11} className="inline mr-1" />
                            Pemakaian (kWh)
                          </Label>
                          <Input
                            id={`kwh-${entry.room.id}`}
                            type="number"
                            placeholder="0"
                            value={entry.kwh_used}
                            onChange={(e) =>
                              updateKwh(entry.room.id, e.target.value)
                            }
                            min={0}
                            className="w-28 text-right"
                            disabled={isPaid}
                          />
                        </div>

                        {/* Estimated Total */}
                        <div className="text-right min-w-32">
                          {estimatedTotal !== null ? (
                            <div>
                              <div className="flex items-center gap-1 text-xs text-slate-400 justify-end">
                                <Calculator size={11} />
                                Estimasi Total
                              </div>
                              <p className="font-bold text-slate-800">
                                {formatRupiah(estimatedTotal)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-slate-300 text-sm">—</p>
                          )}
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
