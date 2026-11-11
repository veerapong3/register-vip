import { NextResponse } from "next/server";
import { getSchoolOrderSummaries } from "@/lib/google/sheets";
import { BASE_PRICE } from "@/lib/sizes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schools = await getSchoolOrderSummaries();
    const publicSchools = schools.map((s) => ({
      schoolId: s.schoolId,
      schoolName: s.schoolName,
      contactName: s.contactName || "",
      totalQty: s.totalQty,
      sizes: s.sizes,
      paymentStatus: s.paymentStatus,
      updatedAt: s.updatedAt,
    }));
    const totalQty = publicSchools.reduce((sum, x) => sum + x.totalQty, 0);
    const paidSchools = schools.filter(
      (x) => x.paymentStatus === "ชำระแล้ว",
    ).length;
    const pendingSchools = schools.filter(
      (x) => x.paymentStatus !== "ชำระแล้ว",
    ).length;
    const paidQty = schools
      .filter((x) => x.paymentStatus === "ชำระแล้ว")
      .reduce((s, x) => s + x.totalQty, 0);
    return NextResponse.json({
      ok: true,
      basePrice: BASE_PRICE,
      schools: publicSchools,
      totals: {
        schools: publicSchools.length,
        shirts: totalQty,
        paidShirts: paidQty,
        paidSchools,
        pendingSchools,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "โหลดสรุปไม่สำเร็จ";
    console.error("[summary]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
