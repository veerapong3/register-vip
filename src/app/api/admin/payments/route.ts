import { NextResponse } from "next/server";
import {
  updateSchoolPaymentStatus,
  type PaymentStatus,
} from "@/lib/google/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: PaymentStatus[] = ["รอตรวจสอบ", "ชำระแล้ว", "ไม่ครบ/มีปัญหา"];

function checkAdmin(req: Request) {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return false;
  const header = req.headers.get("x-admin-password")?.trim();
  return Boolean(header && header === password);
}

export async function POST(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json(
        { ok: false, error: "รหัสผ่านแอดมินไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      schoolId?: string;
      schoolName?: string;
      status?: string;
      note?: string;
    };

    const schoolId = String(body.schoolId || "").trim();
    const schoolName = String(body.schoolName || "").trim();
    const status = String(body.status || "").trim() as PaymentStatus;
    const note = String(body.note || "").trim();

    if (!schoolId || !schoolName) {
      return NextResponse.json(
        { ok: false, error: "ข้อมูลโรงเรียนไม่ครบ" },
        { status: 400 },
      );
    }
    if (!ALLOWED.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "สถานะไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    await updateSchoolPaymentStatus({ schoolId, schoolName, status, note });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ";
    console.error("[admin/payments]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
