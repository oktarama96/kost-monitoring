import { NextRequest, NextResponse } from "next/server";
import { getPrevMonthMeterEnd } from "@/lib/db";

// GET /api/rooms/[id]/last-meter?month=2&year=2026
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
    const meterEnd = await getPrevMonthMeterEnd(id, month, year);

    return NextResponse.json({
      room_id: id,
      prev_month: prevMonth,
      prev_year: prevYear,
      meter_end: meterEnd,
    });
  } catch (err) {
    console.error("GET /api/rooms/[id]/last-meter error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Gagal membaca data meteran: ${message}` },
      { status: 500 }
    );
  }
}
