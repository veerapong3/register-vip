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

const bankName = process.env.NEXT_PUBLIC_BANK_NAME || "ธนาคารไทยพาณิชย์";
const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT || "418-002259-4";
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

  const total = useMemo(() => people.length * BASE_PRICE, [people.length]);

  function updatePerson(id: string, patch: Partial<Person>) {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  function addPerson() {
    setPeople((prev) => [...prev, { id: uid(), name: "", size: "L" }]);
  }

  function removePerson(id: string) {
    setPeople((prev) =>
      prev.length <= 1 ? prev : prev.filter((p) => p.id !== id),
    );
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="success-wrap">
        <div className="anim-fade">
          <p className="step-kicker">ลงทะเบียนสำเร็จ</p>
          <h1 className="font-display">ขอบคุณครับ</h1>
          <p className="text-[var(--muted)]">
            รหัสรายการ{" "}
            <strong className="text-[var(--ink)]">{success.registrationId}</strong>
          </p>
          <div className="success-meta">
            <div>
              <span className="text-[var(--muted)]">จำนวนเสื้อ</span>
              <strong>{success.quantity} ตัว</strong>
            </div>
            <div>
              <span className="text-[var(--muted)]">ยอดชำระ</span>
              <strong>
                {success.totalAmount.toLocaleString("th-TH")} บาท
              </strong>
            </div>
          </div>
          <button
            type="button"
            className="hero-cta mt-8"
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
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="hero">
        <div className="hero-media">
          <Image
            src="/jersey.jpg"
            alt="เสื้อกีฬา VIP สพม.มุกดาหาร กีฬาสัมพันธ์ 2569"
            fill
            priority
            sizes="100vw"
            className="anim-float"
            style={{ objectFit: "cover", objectPosition: "center top" }}
          />
        </div>
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="anim-fade text-sm font-medium tracking-[0.2em] text-white/80 uppercase">
            สพม.มุกดาหาร · กีฬาสัมพันธ์ 2569
          </p>
          <h1 className="brand anim-fade anim-delay-1">VIP SESAO MUK</h1>
          <p className="hero-line anim-fade anim-delay-2">
            ลงทะเบียนเสื้อกีฬาฟุตบอล VIP — เลือกโรงเรียน เพิ่มรายชื่อ
            เลือกไซส์ แล้วแนบสลิปโอนเงิน
          </p>
          <p className="price-tag anim-fade anim-delay-2">
            ราคาเท่ากันทุกไซส์ · {BASE_PRICE} บาท / ตัว
          </p>
          <a href="#register" className="hero-cta anim-fade anim-delay-3">
            เริ่มลงทะเบียน
          </a>
        </div>
      </section>

      <form id="register" onSubmit={onSubmit} className="shell">
        <section className="step">
          <p className="step-kicker">Step 01</p>
          <h2 className="step-title">เลือกโรงเรียน</h2>
          <p className="step-desc">
            ค้นหาจาก 30 โรงเรียนในสังกัด สพม.มุกดาหาร
          </p>
          <SchoolSelect value={school} onChange={setSchool} />
          <div className="grid-2 mt-6">
            <div>
              <label className="field-label">ผู้ประสานงาน</label>
              <input
                className="field"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                required
              />
            </div>
            <div>
              <label className="field-label">เบอร์โทร</label>
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

        <section className="step">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="step-kicker">Step 02</p>
              <h2 className="step-title">รายชื่อและไซส์เสื้อ</h2>
              <p className="step-desc mb-0">
                เพิ่มรายชื่อได้เรื่อยๆ · ทุกตัวราคา {BASE_PRICE} บาท
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={addPerson}>
              + เพิ่มรายชื่อ
            </button>
          </div>

          <div className="size-guide" aria-label="ตารางไซส์">
            {SHIRT_SIZES.filter((s) => s.chestInches).map((s) => (
              <div key={s.code} className="size-pill">
                <strong>{s.code}</strong>
                <span>{s.chestInches}&quot;</span>
              </div>
            ))}
          </div>

          <div>
            {people.map((person, index) => (
              <div key={person.id} className="person-row">
                <div>
                  <label className="field-label">คนที่ {index + 1}</label>
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
                  <label className="field-label">ไซส์</label>
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
                        {formatSizeLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:pb-2">
                  <span className="text-sm font-semibold text-[var(--pink-deep)]">
                    {priceForSize(person.size).toLocaleString("th-TH")} ฿
                  </span>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => removePerson(person.id)}
                    disabled={people.length <= 1}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="step">
          <p className="step-kicker">Step 03</p>
          <h2 className="step-title">โอนเงินและแนบสลิป</h2>
          <p className="step-desc">
            โอนตามยอดรวม แล้วอัปโหลดสลิปเพื่อยืนยันการลงทะเบียน
          </p>

          <div className="pay-block">
            <div>
              <ul className="account-list">
                <li>
                  <span>ธนาคาร</span>
                  <strong>{bankName}</strong>
                </li>
                <li>
                  <span>เลขบัญชี</span>
                  <strong>{bankAccount}</strong>
                </li>
                <li>
                  <span>ชื่อบัญชี</span>
                  <strong>{bankHolder}</strong>
                </li>
                <li>
                  <span>ยอดที่ต้องโอน</span>
                  <strong className="text-[var(--pink-deep)]">
                    {total.toLocaleString("th-TH")} บาท
                  </strong>
                </li>
              </ul>
            </div>

            <div>
              <label className="field-label">อัปโหลดสลิปโอนเงิน</label>
              <input
                type="file"
                accept="image/*,.pdf"
                className="field"
                onChange={(e) => onSlipChange(e.target.files?.[0] ?? null)}
                required
              />
              {slipPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slipPreview}
                  alt="ตัวอย่างสลิป"
                  className="slip-preview"
                />
              )}
              <label className="field-label mt-5">หมายเหตุ (ถ้ามี)</label>
              <textarea
                className="field min-h-[88px]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น โอนจากบัญชีชื่อ..."
              />
            </div>
          </div>
        </section>

        {error && <div className="error-box">{error}</div>}

        <div className="total-bar">
          <div>
            <p className="m-0 text-sm text-white/80">
              {people.length} ตัว × {BASE_PRICE} บาท
            </p>
            <p className="amount m-0 mt-1">
              {total.toLocaleString("th-TH")} บาท
            </p>
          </div>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : "ยืนยันลงทะเบียน"}
          </button>
        </div>

        <footer className="footer">
          สอบถาม · academic@dontanwit.ac.th · YO SPORT × สพม.มุกดาหาร
        </footer>
      </form>
    </>
  );
}
