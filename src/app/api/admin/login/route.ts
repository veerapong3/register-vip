import { NextResponse } from "next/server";
import {
  adminCookieHeader,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/adminAuth";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const limited = rateLimit({
      key: `admin-login:${ip}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่" },
        { status: 429 },
      );
    }

    const body = (await req.json()) as {
      username?: string;
      password?: string;
    };
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!verifyAdminPassword(username, password)) {
      return NextResponse.json(
        { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    const token = createAdminSessionToken(username);
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", adminCookieHeader(token));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ";
    console.error("[admin/login]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
