import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/db";
import { Bill } from "@/lib/types";
import { calculateBillAmount, generateBillId } from "@/lib/helpers";

// GET /api/bills?month=2&year=2026 — ambil semua tagihan, opsional filter bulan/tahun
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const data = readData();
    let bills = data.bills;

    if (month && year) {
      bills = bills.filter(
        (b) => b.month === Number(month) && b.year === Number(year)
      );
    } else if (year) {
      bills = bills.filter((b) => b.year === Number(year));
    }

    // Gabungkan data room ke setiap tagihan
    const billsWithRoom = bills.map((bill) => {
      const room = data.rooms.find((r) => r.id === bill.room_id);
      return { ...bill, room };
    });

    return NextResponse.json(billsWithRoom);
  } catch {
    return NextResponse.json(
      { error: "Gagal membaca data tagihan" },
      { status: 500 }
    );
  }
}

// POST /api/bills — buat/update tagihan sebulan secara batch
// Body: { month, year, entries: [{ room_id, meter_end }] }
// meter_start otomatis diambil dari meter_end tagihan bulan sebelumnya
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { month, year, entries } = body;

    if (!month || !year || !entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Data tidak lengkap. Diperlukan: month, year, entries[]" },
        { status: 400 }
      );
    }

    const data = readData();
    const createdBills: Bill[] = [];
    const updatedBills: Bill[] = [];

    for (const entry of entries) {
      const { room_id, meter_end, meter_start_override } = entry;
      if (!room_id || meter_end == null) continue;

      const room = data.rooms.find((r) => r.id === room_id);
      if (!room) continue;

      const meterEnd = Number(meter_end);

      // Cari meter_start: ambil meter_end dari tagihan bulan sebelumnya.
      // Jika tidak ada tagihan bulan lalu, pakai meter_start_override jika dikirim,
      // atau fallback ke 0 (kamar baru / bulan pertama).
      let meterStart = 0;

      // Hitung bulan & tahun sebelumnya
      const prevMonth = Number(month) === 1 ? 12 : Number(month) - 1;
      const prevYear = Number(month) === 1 ? Number(year) - 1 : Number(year);

      const prevBill = data.bills.find(
        (b) =>
          b.room_id === room_id &&
          b.month === prevMonth &&
          b.year === prevYear
      );

      if (prevBill) {
        meterStart = prevBill.meter_end;
      } else if (meter_start_override != null) {
        // Fallback manual: user bisa kirim meter_start_override untuk bulan pertama
        meterStart = Number(meter_start_override);
      }

      if (meterEnd < meterStart) {
        return NextResponse.json(
          {
            error: `Angka meteran akhir (${meterEnd}) tidak boleh lebih kecil dari meteran awal (${meterStart}) untuk kamar ${room.room_name}`,
          },
          { status: 400 }
        );
      }

      const kwhUsed = meterEnd - meterStart;
      const totalAmount = calculateBillAmount(kwhUsed, room);
      const billId = generateBillId(Number(month), Number(year), room_id);

      // Cek apakah tagihan untuk bulan ini sudah ada
      const existingIndex = data.bills.findIndex(
        (b) =>
          b.room_id === room_id &&
          b.month === Number(month) &&
          b.year === Number(year)
      );

      if (existingIndex !== -1) {
        // Update tagihan yang sudah ada (pertahankan is_paid)
        data.bills[existingIndex] = {
          ...data.bills[existingIndex],
          meter_start: meterStart,
          meter_end: meterEnd,
          kwh_used: kwhUsed,
          total_amount: totalAmount,
        };
        updatedBills.push(data.bills[existingIndex]);
      } else {
        // Buat tagihan baru
        const newBill: Bill = {
          id: billId,
          room_id,
          month: Number(month),
          year: Number(year),
          meter_start: meterStart,
          meter_end: meterEnd,
          kwh_used: kwhUsed,
          total_amount: totalAmount,
          is_paid: false,
        };
        data.bills.push(newBill);
        createdBills.push(newBill);
      }
    }

    writeData(data);

    return NextResponse.json(
      {
        message: "Tagihan berhasil disimpan",
        created: createdBills,
        updated: updatedBills,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan tagihan" },
      { status: 500 }
    );
  }
}
