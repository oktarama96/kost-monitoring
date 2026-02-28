import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { readData, getKostByUserId } from "@/lib/db";
import { formatRupiah, MONTH_NAMES } from "@/lib/helpers";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, BedDouble, AlertCircle, CheckCircle2, Clock,
  TrendingUp, ArrowRight,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const kost = await getKostByUserId(session.user.id);
  if (!kost) redirect("/login");

  const data = await readData(kost.id);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const currentMonthBills = data.bills.filter(
    (b) => b.month === currentMonth && b.year === currentYear
  );

  const unpaidBills = currentMonthBills.filter((b) => b.status === "unpaid");
  const paidBills = currentMonthBills.filter((b) => b.status === "paid");
  const expiredBills = currentMonthBills.filter((b) => b.status === "expired");
  const totalThisMonth = currentMonthBills.reduce((sum, b) => sum + b.total_amount, 0);
  const totalPaid = paidBills.reduce((sum, b) => sum + b.total_amount, 0);
  const totalUnpaid = unpaidBills.reduce((sum, b) => sum + b.total_amount, 0);

  const billedRoomIds = new Set(currentMonthBills.map((b) => b.room_id));
  const unbilledRooms = data.rooms.filter((r) => !billedRoomIds.has(r.id));

  const collectionRate =
    totalThisMonth > 0 ? Math.round((totalPaid / totalThisMonth) * 100) : 0;

  const statusConfig: Record<string, { label: string; className: string }> = {
    paid: { label: "Lunas", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    unpaid: { label: "Belum Lunas", className: "bg-red-50 text-red-700 border-red-200" },
    expired: { label: "Kedaluwarsa", className: "bg-muted text-muted-foreground border-border" },
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
            {kost.name}
          </p>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ringkasan tagihan{" "}
            <span className="font-semibold text-foreground">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full w-fit">
          <TrendingUp size={12} className="text-primary" />
          Tingkat pelunasan:{" "}
          <span className="font-bold text-foreground">{collectionRate}%</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">{currentMonthBills.length} tagihan</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatRupiah(totalThisMonth)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Tagihan Bulan Ini</p>
          </CardContent>
        </Card>

        {/* Paid */}
        <Card className="border-emerald-200/60 bg-emerald-50/30 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-xs text-emerald-600">{paidBills.length} kamar</span>
            </div>
            <p className="text-xl font-bold text-emerald-700">{formatRupiah(totalPaid)}</p>
            <p className="text-xs text-emerald-600/80 mt-0.5">Sudah Lunas</p>
          </CardContent>
        </Card>

        {/* Unpaid */}
        <Card className="border-red-200/60 bg-red-50/30 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-xs text-red-600">{unpaidBills.length} kamar</span>
            </div>
            <p className="text-xl font-bold text-red-700">{formatRupiah(totalUnpaid)}</p>
            <p className="text-xs text-red-600/80 mt-0.5">Belum Dibayar</p>
          </CardContent>
        </Card>

        {/* Rooms */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <BedDouble className="h-4 w-4 text-blue-600" />
              </div>
              {expiredBills.length > 0 && (
                <span className="text-xs text-amber-600">{expiredBills.length} kedaluwarsa</span>
              )}
            </div>
            <p className="text-xl font-bold text-foreground">{data.rooms.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Kamar</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Unpaid rooms */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Belum Bayar Bulan Ini
              </CardTitle>
              {unpaidBills.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unpaidBills.length}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Kamar yang tagihannya belum dilunasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unpaidBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                </div>
                <p className="text-sm font-medium text-emerald-600">Semua tagihan lunas!</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {unpaidBills.map((bill) => {
                  const room = data.rooms.find((r) => r.id === bill.room_id);
                  return (
                    <li
                      key={bill.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {room?.room_name ?? bill.room_id}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {bill.tenant_snapshot_name ?? "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold text-red-600">
                          {formatRupiah(bill.total_amount)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Unbilled rooms */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Belum Ada Tagihan
              </CardTitle>
              {unbilledRooms.length > 0 && (
                <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                  {unbilledRooms.length}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Kamar yang belum di-input tagihan bulan ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unbilledRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                </div>
                <p className="text-sm font-medium text-emerald-600">Semua kamar sudah di-input!</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {unbilledRooms.map((room) => (
                  <li
                    key={room.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50/50"
                  >
                    <p className="text-sm font-semibold text-foreground">{room.room_name}</p>
                    <Link
                      href="/billing"
                      className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-2"
                    >
                      Input <ArrowRight size={11} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bills table */}
      {currentMonthBills.length > 0 && (
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Semua Tagihan — {MONTH_NAMES[currentMonth]} {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="pb-3 px-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Kamar
                    </th>
                    <th className="pb-3 px-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Penyewa
                    </th>
                    <th className="pb-3 px-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      kWh
                    </th>
                    <th className="pb-3 px-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total
                    </th>
                    <th className="pb-3 px-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {currentMonthBills.map((bill) => {
                    const room = data.rooms.find((r) => r.id === bill.room_id);
                    const sc = statusConfig[bill.status];
                    return (
                      <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium text-foreground">
                          {room?.room_name}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {bill.tenant_snapshot_name ?? "—"}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-muted-foreground">
                          {bill.kwh_used}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-foreground">
                          {formatRupiah(bill.total_amount)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.className}`}
                          >
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired bills */}
      {expiredBills.length > 0 && (
        <Card className="shadow-sm border-border/60 bg-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Clock size={14} /> Tagihan Kedaluwarsa
            </CardTitle>
            <CardDescription className="text-xs">
              Tagihan ini dibuat saat masih ada penghuni, namun belum dilunasi ketika penghuni pindah keluar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {expiredBills.map((bill) => {
                const room = data.rooms.find((r) => r.id === bill.room_id);
                return (
                  <li
                    key={bill.id}
                    className="flex justify-between items-center text-sm text-muted-foreground py-2 border-b border-border/40 last:border-0"
                  >
                    <span>
                      {room?.room_name} — {bill.tenant_snapshot_name ?? "—"}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatRupiah(bill.total_amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
