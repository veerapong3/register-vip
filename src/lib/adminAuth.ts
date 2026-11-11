import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "vip_admin_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 12; // 12 hours

export function getAdminUsername() {
  return (process.env.ADMIN_USERNAME || "admin").trim();
}

function sessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    ""
  );
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function createAdminSessionToken(username: string) {
  const exp = Date.now() + SESSION_MAX_AGE_SEC * 1000;
  const payload = `${username}|${exp}`;
  return `${payload}|${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token || !sessionSecret()) return false;
  const parts = token.split("|");
  if (parts.length !== 3) return false;
  const [user, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!user || !Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = sign(`${user}|${expStr}`);
  if (!safeEqual(sig, expected)) return false;
  return safeEqual(user, getAdminUsername());
}

export function verifyAdminPassword(username: string, password: string) {
  const expectedUser = getAdminUsername();
  const expectedPass = process.env.ADMIN_PASSWORD?.trim();
  if (!expectedUser || !expectedPass) return false;
  return safeEqual(username.trim(), expectedUser) && safeEqual(password, expectedPass);
}

function parseCookie(req: Request, name: string) {
  const raw = req.headers.get("cookie") || "";
  const match = raw
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`));
  if (!match) return "";
  return decodeURIComponent(match.slice(name.length + 1));
}

export function checkAdmin(req: Request) {
  const token = parseCookie(req, ADMIN_COOKIE);
  return verifyAdminSessionToken(token);
}

export function adminCookieHeader(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SEC}${secure}`;
}

export function clearAdminCookieHeader() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
