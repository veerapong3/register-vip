import { NextResponse } from "next/server";
import { uploadSlip } from "@/lib/google/drive";
import {
  appendRegistrationRows,
  getBookingSettings,
} from "@/lib/google/sheets";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { SCHOOLS } from "@/lib/schools";
import { getSize, priceForSize, SHIRT_SIZES } from "@/lib/sizes";
import { MAX_PEOPLE_PER_ORDER, validateSlipFile } from "@/lib/slipFile";

export const runtime = "nodejs";
export const maxDuration = 60;

type PersonInput = {
  name: string;
  jerseyNumber: string;
  noJersey?: boolean;
  size: string;
};

function normalizeJerseyNumber(raw: string) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function bangkokTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(" ", "T");
}

function makeRegistrationId() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VIP-${stamp}-${rand}`;
}

export async function POST(req: Request) {
  try {
    const booking = await getBookingSettings();
    if (!booking.open) {
      return NextResponse.json(
        {
          ok: false,
          error: booking.message || "ขณะนี้ปิดจองแล้ว",
          closed: true,
        },
        { status: 403 },
      );
    }

    const ip = clientIp(req);
    const limited = rateLimit({
      key: `register:${ip}`,
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" },
        { status: 429 },
      );
    }

    const form = await req.formData();
    const schoolId = String(form.get("schoolId") || "").trim();
    const contactName = String(form.get("contactName") || "").trim().slice(0, 120);
    const contactPhone = String(form.get("contactPhone") || "").trim().slice(0, 40);
    const note = String(form.get("note") || "").trim().slice(0, 500);
    const peopleRaw = String(form.get("people") || "[]");
    const slip = form.get("slip");

    const school = SCHOOLS.find((s) => s.id === schoolId);
    if (!school) {
      return NextResponse.json(
        { ok: false, error: "กรุณาเลือกโรงเรียนใน สพม.มุกดาหาร" },
        { status: 400 },
      );
    }
    if (!contactName) {
      return NextResponse.json(
        { ok: false, error: "กรุณากรอกชื่อผู้ประสานงาน" },
        { status: 400 },
      );
    }
    if (!contactPhone) {
      return NextResponse.json(
        { ok: false, error: "กรุณากรอกเบอร์โทร" },
        { status: 400 },
      );
    }

    let people: PersonInput[];
    try {
      people = JSON.parse(peopleRaw) as PersonInput[];
    } catch {
      return NextResponse.json(
        { ok: false, error: "ข้อมูลรายชื่อไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    if (!Array.isArray(people) || people.length === 0) {
      return NextResponse.json(
        { ok: false, error: "กรุณาเพิ่มรายชื่ออย่างน้อย 1 คน" },
        { status: 400 },
      );
    }
    if (people.length > MAX_PEOPLE_PER_ORDER) {
      return NextResponse.json(
        {
          ok: false,
          error: `ลงทะเบียนได้ไม่เกิน ${MAX_PEOPLE_PER_ORDER} คนต่อรายการ`,
        },
        { status: 400 },
      );
    }

    const validCodes = new Set(SHIRT_SIZES.map((s) => s.code));
    const cleaned = people.map((p, i) => {
      const name = String(p?.name || "").trim().slice(0, 120);
      const noJersey = Boolean(p?.noJersey) || !String(p?.jerseyNumber || "").trim();
      const jerseyNumber = noJersey
        ? ""
        : normalizeJerseyNumber(String(p?.jerseyNumber || "")).slice(0, 3);
      const size = String(p?.size || "").trim();
      if (!name) throw new Error(`กรุณากรอกชื่อคนที่ ${i + 1}`);
      if (!noJersey && !jerseyNumber) {
        throw new Error(
          `กรุณากรอกเบอร์หลังเสื้อของคนที่ ${i + 1} หรือเลือกไม่ใส่เบอร์`,
        );
      }
      if (jerseyNumber && !/^[0-9A-Z]{1,3}$/.test(jerseyNumber)) {
        throw new Error(
          `เบอร์หลังเสื้อของคนที่ ${i + 1} ต้องเป็นตัวเลข/ตัวอักษร ไม่เกิน 3 ตัว`,
        );
      }
      if (!validCodes.has(size)) throw new Error(`ไซส์ของคนที่ ${i + 1} ไม่ถูกต้อง`);
      return {
        name,
        jerseyNumber: jerseyNumber || "ไม่ใส่เบอร์",
        size,
        price: priceForSize(size),
      };
    });

    if (!(slip instanceof File) || slip.size === 0) {
      return NextResponse.json(
        { ok: false, error: "กรุณาแนบสลิปการโอนเงิน" },
        { status: 400 },
      );
    }
    if (slip.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "ไฟล์สลิปต้องไม่เกิน 8 MB" },
        { status: 400 },
      );
    }

    const totalAmount = cleaned.reduce((sum, p) => sum + p.price, 0);
    const registrationId = makeRegistrationId();
    const timestamp = bangkokTimestamp();

    const buffer = Buffer.from(await slip.arrayBuffer());
    const fileCheck = validateSlipFile(buffer, slip.type || "");
    if (!fileCheck.ok) {
      return NextResponse.json(
        { ok: false, error: fileCheck.error },
        { status: 400 },
      );
    }

    const uploaded = await uploadSlip({
      registrationId,
      schoolName: school.name,
      fileName: slip.name || "slip.jpg",
      mimeType: fileCheck.mimeType,
      buffer,
    });

    await appendRegistrationRows(
      cleaned.map((p, i) => {
        const sizeMeta = getSize(p.size);
        return {
          timestamp,
          registrationId,
          schoolName: school.name,
          schoolId: school.id,
          contactName,
          contactPhone,
          index: i + 1,
          personName: p.name,
          jerseyNumber: p.jerseyNumber,
          size: p.size,
          chestInches: sizeMeta?.chestInches
            ? String(sizeMeta.chestInches)
            : "-",
          price: p.price,
          quantity: cleaned.length,
          totalAmount,
          slipUrl: uploaded.fileUrl,
          note,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      registrationId,
      quantity: cleaned.length,
      totalAmount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    console.error("[register]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
