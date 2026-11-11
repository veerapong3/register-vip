"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { SchoolSelect } from "@/components/SchoolSelect";
import type { School } from "@/lib/schools";
import {
  BASE_PRICE,
  formatSizeLabel,
  priceForSize,
  SHIRT_SIZES,
} from "@/lib/sizes";

type Person = { id: string; name: string; size: string };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const bankName =
  process.env.NEXT_PUBLIC_BANK_NAME || "ธนาคารไทยพาณิชย์";
const bankAccount =
  process.env.NEXT_PUBLIC_BANK_ACCOUNT || "418-002259-4";
const bankHolder =
  process.env.NEXT_PUBLIC_BANK_HOLDER || "นายวีระพงศ์ ตะโกนอก";

export function RegistrationForm() {
  const [school, setSchool] = useState<School | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  const [people, setPeople] = useState<Person[]>([
    { id: uid(), name: "", size: "L" },
  ]);
  const [slip, setSlip] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    registrationId: string;
    quantity: number;
    totalAmount: number;
  } | null>(null);

  const total = useMemo(
    () => people.reduce((sum, p) => sum + priceForSize(p.size), 0),
    [people],
  );

  function updatePerson(id: string, patch: Partial<Person>) {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  function addPerson() {
    setPeople((prev) => [...prev, { id: uid(), name: "", size: "L" }]);
  }

  function removePerson(id: string) {
    setPeople((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  }

  function onSlipChange(file: File | null) {
    setSlip(file);
    if (slipPreview) URL.revokeObjectURL(slipPreview);
    setSlipPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!school) {
      setError("กรุณาเลือกโรงเรียน");
      return;
    }
    if (!slip) {
      setError("กรุณาแนบสลิปการโอนเงิน");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("schoolId", school.id);
      form.set("contactName", contactName.trim());
      form.set("contactPhone", contactPhone.trim());
      form.set("note", note.trim());
      form.set(
        "people",
        JSON.stringify(
          people.map((p) => ({ name: p.name.trim(), size: p.size })),
        ),
      );
      form.set("slip", slip);

      const res = await fetch("/api/register", { method: "POST", body: form });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        registrationId?: string;
        quantity?: number;
        totalAmount?: number;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "บันทึกไม่สำเร็จ");
      }

      setSuccess({
        registrationId: data.registrationId!,
        quantity: data.quantity!,
        totalAmount: data.totalAmount!,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="panel success-panel animate-rise">
        <p className="eyebrow">ลงทะเบียนสำเร็จ</p>
        <h2 className="font-display text-3xl text-[var(--ink)]">
          ขอบคุณที่สั่งจองเสื้อ VIP
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          รหัสรายการ{" "}
          <span className="font-semibold text-[var(--brown)]">
            {success.registrationId}
          </span>
        </p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="stat">
            <dt>จำนวนเสื้อ</dt>
            <dd>{success.quantity} ตัว</dd>
          </div>
          <div className="stat">
            <dt>ยอดชำระ</dt>
            <dd>{success.totalAmount.toLocaleString("th-TH")} บาท</dd>
          </div>
        </dl>
        <button
          type="button"
          className="btn-primary mt-8"
          onClick={() => {
            setSuccess(null);
            setPeople([{ id: uid(), name: "", size: "L" }]);
            setContactName("");
            setContactPhone("");
            setNote("");
            setSchool(null);
            onSlipChange(null);
          }}
        >
          ลงทะเบียนรายการใหม่
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="panel animate-rise">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="relative w-full overflow-hidden rounded-2xl lg:w-[42%]">
            <Image
              src="/jersey.jpg"
              alt="เสื้อกีฬา VIP สพม.มุกดาหาร กีฬาสัมพันธ์ 2569"
              width={900}
              height={1100}
              className="h-auto w-full object-cover"
              priority
            />
          </div>
          <div className="flex-1">
            <p className="eyebrow">VIP Football · SESAO Mukdahan</p>
            <h2 className="font-display text-3xl leading-tight text-[var(--ink)] sm:text-4xl">
              ลงทะเบียนเสื้อกีฬาสัมพันธ์
              <span className="block text-[var(--pink-deep)]">ประจำปี 2569</span>
            </h2>
            <p className="mt-3 max-w-xl text-[var(--muted)]">
              เลือกโรงเรียน เพิ่มรายชื่อพร้อมไซส์เสื้อ คำนวณราคาอัตโนมัติ
              และแนบสลิปโอนเงินในขั้นตอนเดียว
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="chip">ตัวละ {BASE_PRICE} บาท</span>
              <span className="chip">ไซส์พิเศษมีค่าเพิ่ม</span>
              <span className="chip">30 โรงเรียน สพม.มุกดาหาร</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel animate-rise delay-1">
        <h3 className="section-title">1. เลือกโรงเรียน</h3>
        <SchoolSelect value={school} onChange={setSchool} />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">ผู้ประสานงาน</label>
            <input
              className="field"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="ชื่อ-นามสกุล"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">เบอร์โทร</label>
            <input
              className="field"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="08x-xxx-xxxx"
              inputMode="tel"
              required
            />
          </div>
        </div>
      </section>

      <section className="panel animate-rise delay-2">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="section-title">2. รายชื่อผู้สวมใส่และไซส์</h3>
            <p className="text-sm text-[var(--muted)]">
              กดเพิ่มรายชื่อได้ตามต้องการ · ราคาคำนวณตามไซส์ทันที
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={addPerson}>
            + เพิ่มรายชื่อ
          </button>
        </div>

        <div className="mb-5 overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="size-table">
            <thead>
              <tr>
                <th>ไซส์</th>
                {SHIRT_SIZES.filter((s) => s.chestInches).map((s) => (
                  <th key={s.code}>{s.code}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>รอบอก (นิ้ว)</td>
                {SHIRT_SIZES.filter((s) => s.chestInches).map((s) => (
                  <td key={s.code}>{s.chestInches}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          {people.map((person, index) => (
            <div
              key={person.id}
              className="grid gap-3 rounded-xl border border-[var(--line)] bg-white/70 p-3 sm:grid-cols-[2.2fr_1.4fr_auto] sm:items-end"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  คนที่ {index + 1}
                </label>
                <input
                  className="field"
                  value={person.name}
                  onChange={(e) =>
                    updatePerson(person.id, { name: e.target.value })
                  }
                  placeholder="ชื่อ-นามสกุล"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  ไซส์
                </label>
                <select
                  className="field"
                  value={person.size}
                  onChange={(e) =>
                    updatePerson(person.id, { size: e.target.value })
                  }
                  required
                >
                  {SHIRT_SIZES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {formatSizeLabel(s)} · {priceForSize(s.code)}฿
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-end">
                <span className="text-sm font-semibold text-[var(--brown)]">
                  {priceForSize(person.size).toLocaleString("th-TH")} ฿
                </span>
                <button
                  type="button"
                  className="text-sm text-red-700 hover:underline disabled:opacity-40"
                  onClick={() => removePerson(person.id)}
                  disabled={people.length <= 1}
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--pink-deep)] px-5 py-4 text-white">
          <div>
            <p className="text-sm text-white/80">ยอดรวมทั้งหมด</p>
            <p className="font-display text-3xl">
              {total.toLocaleString("th-TH")} บาท
            </p>
          </div>
          <p className="text-sm text-white/85">
            {people.length} ตัว · ฐาน {BASE_PRICE}฿ + ค่าไซส์พิเศษ
          </p>
        </div>
      </section>

      <section className="panel animate-rise delay-3">
        <h3 className="section-title">3. โอนเงินและแนบสลิป</h3>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-dashed border-[var(--brown)]/40 bg-[var(--pink-soft)]/50 p-4">
            <p className="text-sm font-medium text-[var(--ink)]">ช่องทางชำระเงิน</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">ธนาคาร / ช่องทาง</dt>
                <dd className="font-medium">{bankName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">เลขบัญชี</dt>
                <dd className="font-medium">{bankAccount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">ชื่อบัญชี</dt>
                <dd className="font-medium text-right">{bankHolder}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-[var(--line)] pt-2">
                <dt className="text-[var(--muted)]">ยอดที่ต้องโอน</dt>
                <dd className="text-lg font-semibold text-[var(--pink-deep)]">
                  {total.toLocaleString("th-TH")} บาท
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-[var(--muted)]">
              ติดต่อยืนยัน: {bankHolder}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              อัปโหลดสลิปโอนเงิน
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              className="field file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--pink-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={(e) => onSlipChange(e.target.files?.[0] ?? null)}
              required
            />
            {slipPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slipPreview}
                alt="ตัวอย่างสลิป"
                className="mt-3 max-h-48 rounded-xl border border-[var(--line)] object-contain"
              />
            )}
            <label className="mb-1.5 mt-4 block text-sm font-medium">
              หมายเหตุ (ถ้ามี)
            </label>
            <textarea
              className="field min-h-[88px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น โอนจากบัญชีชื่อ..."
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
        {submitting ? "กำลังบันทึก..." : `ยืนยันลงทะเบียน · ${total.toLocaleString("th-TH")} บาท`}
      </button>
    </form>
  );
}
