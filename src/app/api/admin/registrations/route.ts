import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { updateRegistration } from "@/lib/google/sheets";
import { SCHOOLS } from "@/lib/schools";
import { SHIRT_SIZES } from "@/lib/sizes";
import { MAX_PEOPLE_PER_ORDER } from "@/lib/slipFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIZE_CODES = new Set(SHIRT_SIZES.map((s) => s.code));

function normalizeJerseyNumber(raw: string) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export async function PUT(req: Request) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json(
        { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      registrationId?: string;
      schoolId?: string;
      contactName?: string;
      contactPhone?: string;
      note?: string;
      people?: {
        name?: string;
        jerseyNumber?: string;
        noJersey?: boolean;
        size?: string;
      }[];
    };

    const registrationId = String(body.registrationId || "").trim();
    const schoolId = String(body.schoolId || "").trim();
    const contactName = String(body.contactName || "").trim().slice(0, 120);
    const contactPhone = String(body.contactPhone || "").trim().slice(0, 40);
    const note = String(body.note || "").trim().slice(0, 500);
    const peopleRaw = Array.isArray(body.people) ? body.people : [];

    if (!registrationId) {
      return NextResponse.json(
        { ok: false, error: "ไม่พบรหัสลงทะเบียน" },
        { status: 400 },
      );
    }

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
    if (peopleRaw.length === 0) {
      return NextResponse.json(
        { ok: false, error: "ต้องมีอย่างน้อย 1 คน" },
        { status: 400 },
      );
    }
    if (peopleRaw.length > MAX_PEOPLE_PER_ORDER) {
      return NextResponse.json(
        {
          ok: false,
          error: `แก้ไขได้ไม่เกิน ${MAX_PEOPLE_PER_ORDER} คนต่อรายการ`,
        },
        { status: 400 },
      );
    }

    const people = peopleRaw.map((p, i) => {
      const name = String(p.name || "").trim().slice(0, 120);
      const noJersey =
        Boolean(p.noJersey) || !String(p.jerseyNumber || "").trim();
      const jerseyNumber = noJersey
        ? "ไม่มี"
        : normalizeJerseyNumber(String(p.jerseyNumber || "")).slice(0, 3);
      const size = String(p.size || "").trim();
      if (!name) {
        throw new Error(`กรุณากรอกชื่อผู้สวมใส่คนที่ ${i + 1}`);
      }
      if (!noJersey && jerseyNumber && !/^[0-9A-Z]{1,3}$/.test(jerseyNumber)) {
        throw new Error(
          `เบอร์หลังเสื้อของคนที่ ${i + 1} ต้องเป็นตัวเลข/ตัวอักษร ไม่เกิน 3 ตัว`,
        );
      }
      if (!SIZE_CODES.has(size)) {
        throw new Error(`ไซส์ไม่ถูกต้องที่คนที่ ${i + 1}`);
      }
      return { name, jerseyNumber, size };
    });

    const updated = await updateRegistration({
      registrationId,
      schoolId: school.id,
      schoolName: school.name,
      contactName,
      contactPhone,
      note,
      people,
    });

    return NextResponse.json({ ok: true, registration: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "บันทึกไม่สำเร็จ";
    console.error("[admin/registrations]", err);
    const status = /กรุณา|ไซส์|ไม่พบ|ต้องมี/.test(message) ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
