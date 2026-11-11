"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SchoolSelect } from "@/components/SchoolSelect";
import type { School } from "@/lib/schools";
import { BASE_PRICE, priceForSize, SHIRT_SIZES } from "@/lib/sizes";

type Person = { id: string; name: string; size: string };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const bankName = process.env.NEXT_PUBLIC_BANK_NAME || "ธนาคารไทยพาณิชย์";
const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT || "418-002259-4";
const bankHolder =
  process.env.NEXT_PUBLIC_BANK_HOLDER || "นายวีระพงศ์ ตะโกนอก";

const CONTACT_FOOTER = (
  <>
    โรงเรียนดอนตาลวิทยา × สพม.มุกดาหาร
    <br />
    ผู้ประสานงาน ผอ.บุญเลี่ยม บุญศรี และ รองฯ วีระพงศ์ ตะโกนอก · 087-946-3192
  </>
);

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
  const [lightbox, setLightbox] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    registrationId: string;
    quantity: number;
    totalAmount: number;
  } | null>(null);

  const total = useMemo(() => people.length * BASE_PRICE, [people.length]);

  const sizeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of people) {
      counts[p.size] = (counts[p.size] || 0) + 1;
    }
    return SHIRT_SIZES.filter((s) => counts[s.code]).map((s) => ({
      code: s.code,
      qty: counts[s.code],
    }));
  }, [people]);

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
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="hero-cta"
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
            <Link href="/summary" className="hero-cta hero-cta-ghost">
              ดูสรุปทุกโรงเรียน
            </Link>
          </div>
          <p className="footer mt-10">{CONTACT_FOOTER}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="hero">
        <button
          type="button"
          className="hero-media hero-media-btn"
          onClick={() => setLightbox(true)}
          aria-label="ดูรูปเสื้อขนาดเต็ม"
        >
          <Image
            src="/jersey.jpg"
            alt="เสื้อกีฬา VIP สพม.มุกดาหาร กีฬาสัมพันธ์ 2569"
            fill
            priority
            sizes="100vw"
            className="anim-float"
            style={{ objectFit: "cover", objectPosition: "center top" }}
          />
        </button>
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
            ตัวละ {BASE_PRICE}
          </p>
          <div className="hero-actions anim-fade anim-delay-3">
            <button
              type="button"
              className="hero-cta hero-cta-ghost"
              onClick={() => setLightbox(true)}
            >
              ดูรูปเสื้อเต็มจอ
            </button>
            <a href="#register" className="hero-cta">
              เริ่มลงทะเบียน
            </a>
            <Link href="/summary" className="hero-cta hero-cta-ghost">
              สรุปออเดอร์
            </Link>
          </div>
        </div>
      </section>

      {lightbox && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightbox(false)}
          >
            ปิด
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/jersey.jpg"
            alt="เสื้อกีฬา VIP ขนาดเต็ม"
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <form id="register" onSubmit={onSubmit} className="shell">
        <section className="step-panel step-school">
          <div className="step-panel-head">
            <span className="step-num">1</span>
            <div>
              <p className="step-kicker">โรงเรียน</p>
              <h2 className="step-title">เลือกโรงเรียนและผู้ประสานงาน</h2>
              <p className="step-desc mb-0">
                ค้นหาจาก 30 โรงเรียนในสังกัด สพม.มุกดาหาร
              </p>
            </div>
          </div>
          <SchoolSelect value={school} onChange={setSchool} />
          <div className="grid-2 mt-5">
            <div>
              <label className="field-label">ผู้ประสานงาน</label>
              <input
                className="field field-solid"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                required
              />
            </div>
            <div>
              <label className="field-label">เบอร์โทร</label>
              <input
                className="field field-solid"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="08x-xxx-xxxx"
                inputMode="tel"
                required
              />
            </div>
          </div>
        </section>

        <section className="step-panel step-people">
          <div className="step-panel-head">
            <span className="step-num">2</span>
            <div className="flex-1">
              <p className="step-kicker">รายชื่อเสื้อ</p>
              <h2 className="step-title">เพิ่มรายชื่อและเลือกไซส์</h2>
              <p className="step-desc mb-0">กดปุ่มไซส์ได้เลย · ตัวละ {BASE_PRICE}</p>
            </div>
            <button type="button" className="btn-add" onClick={addPerson}>
              + เพิ่มรายชื่อ
            </button>
          </div>

          <div className="size-guide" aria-label="ตารางไซส์อ้างอิง">
            {SHIRT_SIZES.filter((s) => s.chestInches).map((s) => (
              <div key={s.code} className="size-pill">
                <strong>{s.code}</strong>
                <span>{s.chestInches}&quot;</span>
              </div>
            ))}
          </div>

          <div className="person-list">
            {people.map((person, index) => (
              <div key={person.id} className="person-card">
                <div className="person-card-top">
                  <span className="person-badge">คนที่ {index + 1}</span>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removePerson(person.id)}
                    disabled={people.length <= 1}
                  >
                    ลบ
                  </button>
                </div>
                <div>
                  <label className="field-label">ชื่อ-นามสกุล</label>
                  <input
                    className="field field-solid"
                    value={person.name}
                    onChange={(e) =>
                      updatePerson(person.id, { name: e.target.value })
                    }
                    placeholder="ชื่อ-นามสกุล"
                    required
                  />
                </div>
                <div>
                  <label className="field-label">เลือกไซส์</label>
                  <div className="size-btn-grid" role="group" aria-label="ไซส์เสื้อ">
                    {SHIRT_SIZES.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        className={`size-btn${person.size === s.code ? " is-active" : ""}`}
                        onClick={() =>
                          updatePerson(person.id, { size: s.code })
                        }
                        aria-pressed={person.size === s.code}
                      >
                        <strong>{s.code}</strong>
                        {s.chestInches ? <span>{s.chestInches}&quot;</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="person-price">
                  {priceForSize(person.size).toLocaleString("th-TH")} บาท
                </p>
              </div>
            ))}
          </div>

          <div className="school-total-box">
            <div>
              <p className="school-total-label">
                ยอดที่โรงเรียนต้องชำระ
                {school ? ` · ${school.name}` : ""}
              </p>
              <p className="school-total-amount">
                {total.toLocaleString("th-TH")} บาท
              </p>
              <p className="school-total-sub">
                {people.length} ตัว × {BASE_PRICE} บาท
              </p>
            </div>
            <div className="school-total-sizes">
              {sizeBreakdown.map((s) => (
                <span key={s.code}>
                  {s.code} × {s.qty}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="step-panel step-pay">
          <div className="step-panel-head">
            <span className="step-num">3</span>
            <div>
              <p className="step-kicker">ชำระเงิน</p>
              <h2 className="step-title">โอนเงินและแนบสลิป</h2>
              <p className="step-desc mb-0">
                โอนตามยอดรวมของโรงเรียน แล้วอัปโหลดสลิปเพื่อยืนยัน
              </p>
            </div>
          </div>

          <div className="pay-block">
            <div className="pay-account">
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
              <label
                className={`file-drop${slip ? " has-file" : ""}`}
                htmlFor="slip-upload"
              >
                <input
                  id="slip-upload"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => onSlipChange(e.target.files?.[0] ?? null)}
                  required={!slip}
                />
                <span className="file-drop-icon" aria-hidden>
                  ↑
                </span>
                <span className="file-drop-title">
                  {slip ? "กดเพื่อเปลี่ยนสลิป" : "กดที่นี่เพื่ออัปโหลดสลิป"}
                </span>
                <span className="file-drop-sub">
                  {slip
                    ? slip.name
                    : "รองรับไฟล์รูปภาพ หรือ PDF · ขนาดไม่เกิน 8 MB"}
                </span>
              </label>
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
                className="field field-solid min-h-[88px]"
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
              ยอดรวมโรงเรียน · {people.length} ตัว × {BASE_PRICE} บาท
            </p>
            <p className="amount m-0 mt-1">
              {total.toLocaleString("th-TH")} บาท
            </p>
          </div>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : "ยืนยันลงทะเบียน"}
          </button>
        </div>

        <footer className="footer">{CONTACT_FOOTER}</footer>
      </form>
    </>
  );
}
