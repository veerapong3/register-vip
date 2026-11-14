import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { setBookingSettings } from "@/lib/google/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json(
        { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      open?: boolean;
      message?: string;
    };

    if (typeof body.open !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุสถานะเปิด/ปิดระบบจอง" },
        { status: 400 },
      );
    }

    const booking = await setBookingSettings({
      open: body.open,
      message: body.message,
    });

    return NextResponse.json({ ok: true, booking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ";
    console.error("[admin/booking]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
