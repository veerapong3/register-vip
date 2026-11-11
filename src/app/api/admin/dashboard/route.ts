import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { getAdminDashboard } from "@/lib/google/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json(
        { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }
    const dashboard = await getAdminDashboard();
    return NextResponse.json({ ok: true, ...dashboard });
  } catch (err) {
    const message = err instanceof Error ? err.message : "โหลดไม่สำเร็จ";
    console.error("[admin/dashboard]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
