const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

function startsWith(buf: Buffer, bytes: number[]) {
  if (buf.length < bytes.length) return false;
  return bytes.every((b, i) => buf[i] === b);
}

export function detectSlipMime(buffer: Buffer): string | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  return null;
}

export function validateSlipFile(buffer: Buffer, declaredMime: string) {
  const detected = detectSlipMime(buffer);
  if (!detected) {
    return { ok: false as const, error: "รองรับเฉพาะไฟล์รูป JPG/PNG/WEBP/GIF หรือ PDF" };
  }
  const declared = (declaredMime || "").toLowerCase();
  if (declared && !ALLOWED_MIME.has(declared) && declared !== "image/jpg") {
    return { ok: false as const, error: "ชนิดไฟล์สลิปไม่ถูกต้อง" };
  }
  return { ok: true as const, mimeType: detected };
}

export function isSafeDriveUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return (
      u.hostname === "drive.google.com" ||
      u.hostname === "docs.google.com" ||
      u.hostname.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

export const MAX_PEOPLE_PER_ORDER = 60;
