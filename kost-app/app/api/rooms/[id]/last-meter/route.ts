import { NextRequest, NextResponse } from "next/server";
import { readData } from "@/lib/db";

// GET /api/rooms/[id]/last-meter?month=2&year=2026
// Mengembalikan angka meteran akhir dari bulan sebelumnya untuk dijadikan meter_start
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!month || !year) {
      return NextResponse.json(
        { error: "Parameter month dan year diperlukan" },
        { status: 400 }
      );
    }

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const data = readData();
    const prevBill = data.bills.find(
      (b) => b.room_id === id && b.month === prevMonth && b.year === prevYear
    );

    return NextResponse.json({
      room_id: id,
      prev_month: prevMonth,
      prev_year: prevYear,
      meter_end: prevBill?.meter_end ?? null,  // null = belum ada riwayat
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal membaca data meteran" },
      { status: 500 }
    );
  }
}
