import { NextResponse } from "next/server";
import { getAdminDashboard } from "@/lib/google/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAdmin(req: Request) {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return false;
  const header = req.headers.get("x-admin-password")?.trim();
  return Boolean(header && header === password);
}

export async function GET(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json(
        { ok: false, error: "รหัสผ่านแอดมินไม่ถูกต้อง" },
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
