import { NextRequest, NextResponse } from "next/server";
import { getBills, getPrevMonthMeterEnd, upsertBill, getActiveTenant, getKostByUserId } from "@/lib/db";
import { Bill } from "@/lib/types";
import { calculateBillAmount, generateBillId } from "@/lib/helpers";
import { auth } from "@/auth";

// GET /api/bills?month=2&year=2026
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kost = await getKostByUserId(session.user.id);
    if (!kost) {
      return NextResponse.json({ error: "Kost tidak ditemukan" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const bills = await getBills(kost.id, {
      ...(month && { month: Number(month) }),
      ...(year && { year: Number(year) }),
    });

    return NextResponse.json(bills);
  } catch (err) {
    console.error("GET /api/bills error:", err);
    return NextResponse.json({ error: "Gagal membaca data tagihan" }, { status: 500 });
  }
}

// POST /api/bills
// Body: { month, year, entries: [{ room_id, meter_end, meter_start_override? }] }
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kost = await getKostByUserId(session.user.id);
    if (!kost) {
      return NextResponse.json({ error: "Kost tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { month, year, entries } = body;

    if (!month || !year || !entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Data tidak lengkap. Diperlukan: month, year, entries[]" },
        { status: 400 }
      );
    }

    const createdBills: Bill[] = [];
    const updatedBills: Bill[] = [];

    for (const entry of entries) {
      const { room_id, meter_end, meter_start_override } = entry;
      if (!room_id || meter_end == null) continue;

      const meterEnd = Number(meter_end);

      const prevMeterEnd = await getPrevMonthMeterEnd(room_id, Number(month), Number(year));
      const meterStart = prevMeterEnd !== null
        ? prevMeterEnd
        : meter_start_override != null
          ? Number(meter_start_override)
          : 0;

      if (meterEnd < meterStart) {
        return NextResponse.json(
          { error: `Angka meteran akhir (${meterEnd}) tidak boleh lebih kecil dari meteran awal (${meterStart}) untuk room_id ${room_id}` },
          { status: 400 }
        );
      }

      const { getRoomById } = await import("@/lib/db");
      const room = await getRoomById(room_id);
      if (!room) continue;

      // Snapshot nama penghuni aktif saat tagihan dibuat
      const activeTenant = await getActiveTenant(room_id);
      const tenantSnapshotName = activeTenant?.name ?? null;

      const kwhUsed = meterEnd - meterStart;
      const totalAmount = calculateBillAmount(kwhUsed, room);
      const billId = generateBillId(Number(month), Number(year), room_id);

      const existingBills = await getBills(kost.id, { month: Number(month), year: Number(year) });
      const isExisting = existingBills.some((b) => b.room_id === room_id);

      const bill: Bill = {
        id: billId,
        room_id,
        month: Number(month),
        year: Number(year),
        meter_start: meterStart,
        meter_end: meterEnd,
        kwh_used: kwhUsed,
        total_amount: totalAmount,
        status: "unpaid",
        tenant_snapshot_name: tenantSnapshotName,
      };

      const saved = await upsertBill(bill);

      if (isExisting) {
        updatedBills.push(saved);
      } else {
        createdBills.push(saved);
      }
    }

    return NextResponse.json(
      { message: "Tagihan berhasil disimpan", created: createdBills, updated: updatedBills },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/bills error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gagal menyimpan tagihan: ${message}` }, { status: 500 });
  }
}
