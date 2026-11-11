import { NextResponse } from "next/server";
import { uploadSlip } from "@/lib/google/drive";
import { appendRegistrationRows } from "@/lib/google/sheets";
import { SCHOOLS } from "@/lib/schools";
import { getSize, priceForSize, SHIRT_SIZES } from "@/lib/sizes";

export const runtime = "nodejs";
export const maxDuration = 60;

type PersonInput = {
  name: string;
  size: string;
};

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
    const form = await req.formData();
    const schoolId = String(form.get("schoolId") || "").trim();
    const contactName = String(form.get("contactName") || "").trim();
    const contactPhone = String(form.get("contactPhone") || "").trim();
    const note = String(form.get("note") || "").trim();
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

    const validCodes = new Set(SHIRT_SIZES.map((s) => s.code));
    const cleaned = people.map((p, i) => {
      const name = String(p?.name || "").trim();
      const size = String(p?.size || "").trim();
      if (!name) throw new Error(`กรุณากรอกชื่อคนที่ ${i + 1}`);
      if (!validCodes.has(size)) throw new Error(`ไซส์ของคนที่ ${i + 1} ไม่ถูกต้อง`);
      return { name, size, price: priceForSize(size) };
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
    const uploaded = await uploadSlip({
      registrationId,
      schoolName: school.name,
      fileName: slip.name || "slip.jpg",
      mimeType: slip.type || "image/jpeg",
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
      slipUrl: uploaded.fileUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    console.error("[register]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
