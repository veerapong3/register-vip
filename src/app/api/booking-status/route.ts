import { NextResponse } from "next/server";
import { getBookingSettings } from "@/lib/google/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const booking = await getBookingSettings();
    return NextResponse.json({
      ok: true,
      open: booking.open,
      message: booking.message,
      updatedAt: booking.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "โหลดสถานะไม่สำเร็จ";
    console.error("[booking-status]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
