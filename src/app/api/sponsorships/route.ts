import { NextRequest, NextResponse } from "next/server";
import { getItems, claimItem, unclaimItem, setPaymentStatus } from "@/lib/sponsorships";
import type { PaymentStatus } from "@/lib/sponsorships";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getItems();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { id, name, action, paymentStatus } = await req.json();

  if (action === "unclaim") {
    const result = await unclaimItem(id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  }

  if (action === "setPaymentStatus") {
    const result = await setPaymentStatus(id, paymentStatus as PaymentStatus);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  }

  if (!id || !name) {
    return NextResponse.json(
      { success: false, error: "Missing id or name" },
      { status: 400 }
    );
  }

  const result = await claimItem(id, name.trim());
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
