import { NextResponse } from "next/server";
import { getSchoolOrderSummaries } from "@/lib/google/sheets";
import { BASE_PRICE } from "@/lib/sizes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schools = await getSchoolOrderSummaries();
    const totalQty = schools.reduce((s, x) => s + x.totalQty, 0);
    const paidQty = schools
      .filter((x) => x.paymentStatus === "ชำระแล้ว")
      .reduce((s, x) => s + x.totalQty, 0);
    return NextResponse.json({
      ok: true,
      basePrice: BASE_PRICE,
      schools,
      totals: {
        schools: schools.length,
        shirts: totalQty,
        amount: totalQty * BASE_PRICE,
        paidShirts: paidQty,
        pendingSchools: schools.filter((x) => x.paymentStatus !== "ชำระแล้ว")
          .length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "โหลดสรุปไม่สำเร็จ";
    console.error("[summary]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
