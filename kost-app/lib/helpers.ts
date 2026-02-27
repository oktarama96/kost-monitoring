import { Room } from "./types";

/**
 * Kalkulasi total tagihan berdasarkan pemakaian kWh dan data kamar
 * Total = (kwh_used * price_per_kwh) + monthly_fee + base_price
 */
export function calculateBillAmount(kwhUsed: number, room: Room): number {
  return kwhUsed * room.price_per_kwh + room.monthly_fee + room.base_price;
}

/**
 * Format angka ke format Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format angka ke string dengan pemisah ribuan (tanpa simbol Rp)
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

/**
 * Nama bulan dalam Bahasa Indonesia
 */
export const MONTH_NAMES: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

/**
 * Generate ID tagihan berdasarkan bulan, tahun, dan room_id
 */
export function generateBillId(
  month: number,
  year: number,
  roomId: string
): string {
  const roomNum = roomId.replace("room-", "").replace("-", "");
  return `bill-${String(month).padStart(2, "0")}${year}-room${roomNum}`;
}

/**
 * Generate teks tagihan untuk copy-paste
 */
export function generateBillText(params: {
  tenant_name: string;
  room_name: string;
  month: number;
  year: number;
  base_price: number;
  monthly_fee: number;
  meter_start: number;
  meter_end: number;
  kwh_used: number;
  price_per_kwh: number;
  total_amount: number;
}): string {
  const {
    tenant_name,
    room_name,
    month,
    year,
    base_price,
    monthly_fee,
    meter_start,
    meter_end,
    kwh_used,
    price_per_kwh,
    total_amount,
  } = params;

  const electricityCost = kwh_used * price_per_kwh;
  const monthName = MONTH_NAMES[month];

  return `Halo ${tenant_name}, berikut rincian tagihan kamar ${room_name} untuk bulan ${monthName}/${year}:

Harga Kamar: Rp ${formatNumber(base_price)}

Iuran Bulanan: Rp ${formatNumber(monthly_fee)}

Pemakaian Listrik:
  - Meteran awal : ${formatNumber(meter_start)} kWh
  - Meteran akhir: ${formatNumber(meter_end)} kWh
  - Pemakaian    : ${kwh_used} kWh x Rp ${formatNumber(price_per_kwh)} = Rp ${formatNumber(electricityCost)}

Total Tagihan: Rp ${formatNumber(total_amount)}

Mohon untuk melakukan pembayaran sesuai jumlah di atas. Terima kasih!

I KOMANG OKTARAMA BA
Bank Mandiri
1450013849266
`;
}
