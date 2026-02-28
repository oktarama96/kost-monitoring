import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getKostByUserId, updateKost } from "@/lib/db";

// GET /api/kost — get current owner's kost details
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kost = await getKostByUserId(session.user.id);
  if (!kost) {
    return NextResponse.json({ error: "Kost not found" }, { status: 404 });
  }

  return NextResponse.json(kost);
}

// PATCH /api/kost — update kost name, address, and bank details
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kost = await getKostByUserId(session.user.id);
  if (!kost) {
    return NextResponse.json({ error: "Kost not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, address, bank_account_holder, bank_name, bank_account_number } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Nama kost tidak boleh kosong" }, { status: 400 });
  }

  const updated = await updateKost(kost.id, {
    name: name.trim(),
    address: address?.trim() || null,
    bank_account_holder: bank_account_holder?.trim() || null,
    bank_name: bank_name?.trim() || null,
    bank_account_number: bank_account_number?.trim() || null,
  });

  return NextResponse.json(updated);
}
