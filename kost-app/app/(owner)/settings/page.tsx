"use client";

import { useState, useEffect, useCallback } from "react";
import { Kost } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Building2, CreditCard, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [kost, setKost] = useState<Kost | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    bank_account_holder: "",
    bank_name: "",
    bank_account_number: "",
  });

  const fetchKost = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kost");
      if (!res.ok) throw new Error("Gagal memuat data kost");
      const data: Kost = await res.json();
      setKost(data);
      setForm({
        name: data.name ?? "",
        address: data.address ?? "",
        bank_account_holder: data.bank_account_holder ?? "",
        bank_name: data.bank_name ?? "",
        bank_account_number: data.bank_account_number ?? "",
      });
    } catch {
      toast.error("Gagal memuat data kost");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKost();
  }, [fetchKost]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nama kost tidak boleh kosong");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/kost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || null,
          bank_account_holder: form.bank_account_holder.trim() || null,
          bank_name: form.bank_name.trim() || null,
          bank_account_number: form.bank_account_number.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const updated: Kost = await res.json();
      setKost(updated);
      toast.success("Pengaturan kost berhasil disimpan!");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengaturan Kost</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola informasi kost dan detail pembayaran
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchKost}
          disabled={loading}
          className="gap-2 w-fit"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Muat Ulang
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Kost Info */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 size={15} className="text-primary" />
              Informasi Kost
            </CardTitle>
            <CardDescription className="text-xs">
              Nama dan alamat kost yang akan ditampilkan di dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kost_name" className="text-sm font-medium">
                Nama Kost <span className="text-destructive">*</span>
              </Label>
              <Input
                id="kost_name"
                placeholder="cth: Kost Bu Siti"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kost_address" className="text-sm font-medium">
                Alamat{" "}
                <span className="text-muted-foreground font-normal">(opsional)</span>
              </Label>
              <Input
                id="kost_address"
                placeholder="Jl. Merdeka No. 10, ..."
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard size={15} className="text-primary" />
              Detail Pembayaran
            </CardTitle>
            <CardDescription className="text-xs">
              Informasi rekening yang akan ditampilkan di bagian bawah teks tagihan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bank_account_holder" className="text-sm font-medium">
                Nama Pemilik Rekening
              </Label>
              <Input
                id="bank_account_holder"
                placeholder="cth: BUDI SANTOSO"
                value={form.bank_account_holder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bank_account_holder: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank_name" className="text-sm font-medium">
                Nama Bank
              </Label>
              <Input
                id="bank_name"
                placeholder="cth: Bank BCA / Bank Mandiri"
                value={form.bank_name}
                onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank_account_number" className="text-sm font-medium">
                Nomor Rekening
              </Label>
              <Input
                id="bank_account_number"
                placeholder="cth: 1234567890"
                value={form.bank_account_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bank_account_number: e.target.value }))
                }
              />
            </div>

            {/* Preview */}
            {(form.bank_account_holder || form.bank_name || form.bank_account_number) && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Preview di teks tagihan
                </p>
                <p className="text-xs font-mono text-foreground whitespace-pre-line">
                  {[
                    form.bank_account_holder,
                    form.bank_name,
                    form.bank_account_number,
                  ]
                    .filter(Boolean)
                    .join("\n")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={submitting}
          className="gap-2 font-semibold"
        >
          {submitting ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save size={14} />
              Simpan Pengaturan
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
