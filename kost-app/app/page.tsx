import { readData } from "@/lib/db";
import { formatRupiah, MONTH_NAMES } from "@/lib/helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, BedDouble, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const data = readData();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Filter tagihan bulan ini
  const currentMonthBills = data.bills.filter(
    (b) => b.month === currentMonth && b.year === currentYear
  );

  const unpaidBills = currentMonthBills.filter((b) => !b.is_paid);
  const paidBills = currentMonthBills.filter((b) => b.is_paid);
  const totalThisMonth = currentMonthBills.reduce(
    (sum, b) => sum + b.total_amount,
    0
  );
  const totalPaid = paidBills.reduce((sum, b) => sum + b.total_amount, 0);
  const totalUnpaid = unpaidBills.reduce((sum, b) => sum + b.total_amount, 0);

  // Kamar yang belum punya tagihan bulan ini
  const billedRoomIds = new Set(currentMonthBills.map((b) => b.room_id));
  const roomsNotBilled = data.rooms.filter(
    (r) => !billedRoomIds.has(r.id) && r.tenant_name !== "Kosong"
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Ringkasan tagihan bulan{" "}
          <span className="font-semibold text-slate-700">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Tagihan Bulan Ini
            </CardTitle>
            <Wallet className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatRupiah(totalThisMonth)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {currentMonthBills.length} tagihan tercatat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Sudah Lunas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatRupiah(totalPaid)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {paidBills.length} kamar lunas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Belum Dibayar
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatRupiah(totalUnpaid)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {unpaidBills.length} kamar menunggak
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Kamar
            </CardTitle>
            <BedDouble className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {data.rooms.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {data.rooms.filter((r) => r.tenant_name !== "Kosong").length} terisi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kamar Belum Bayar & Belum Di-input */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={18} />
              Belum Bayar Bulan Ini
            </CardTitle>
            <CardDescription>
              Kamar yang tagihannya belum dilunasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unpaidBills.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="mx-auto mb-2 text-green-400" size={40} />
                <p className="font-medium text-green-600">Semua tagihan lunas!</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {unpaidBills.map((bill) => {
                  const room = data.rooms.find((r) => r.id === bill.room_id);
                  return (
                    <li
                      key={bill.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {room?.room_name ?? bill.room_id}
                        </p>
                        <p className="text-sm text-slate-500">
                          {room?.tenant_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          {formatRupiah(bill.total_amount)}
                        </p>
                        <Badge variant="destructive" className="text-xs mt-1">
                          Belum Lunas
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <BedDouble size={18} />
              Belum Ada Tagihan
            </CardTitle>
            <CardDescription>
              Kamar berpenghuni yang belum di-input tagihan bulan ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roomsNotBilled.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="mx-auto mb-2 text-green-400" size={40} />
                <p className="font-medium text-green-600">
                  Semua kamar sudah di-input!
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {roomsNotBilled.map((room) => (
                  <li
                    key={room.id}
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {room.room_name}
                      </p>
                      <p className="text-sm text-slate-500">{room.tenant_name}</p>
                    </div>
                    <Link
                      href="/billing"
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Input →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabel semua tagihan bulan ini */}
      {currentMonthBills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Semua Tagihan — {MONTH_NAMES[currentMonth]} {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 font-medium">Kamar</th>
                    <th className="pb-3 font-medium">Penyewa</th>
                    <th className="pb-3 font-medium text-right">kWh</th>
                    <th className="pb-3 font-medium text-right">Total</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {currentMonthBills.map((bill) => {
                    const room = data.rooms.find((r) => r.id === bill.room_id);
                    return (
                      <tr key={bill.id} className="hover:bg-slate-50">
                        <td className="py-3 font-medium">{room?.room_name}</td>
                        <td className="py-3 text-slate-500">
                          {room?.tenant_name}
                        </td>
                        <td className="py-3 text-right">{bill.kwh_used}</td>
                        <td className="py-3 text-right font-semibold">
                          {formatRupiah(bill.total_amount)}
                        </td>
                        <td className="py-3 text-center">
                          <Badge
                            variant={bill.is_paid ? "default" : "destructive"}
                            className={
                              bill.is_paid
                                ? "bg-green-600 hover:bg-green-700"
                                : ""
                            }
                          >
                            {bill.is_paid ? "Lunas" : "Belum"}
                          </Badge>
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
    </div>
  );
}
