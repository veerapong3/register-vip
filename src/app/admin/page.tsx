"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PaymentStatus = "รอตรวจสอบ" | "ชำระแล้ว" | "ไม่ครบ/มีปัญหา";

type SchoolSummary = {
  schoolId: string;
  schoolName: string;
  totalQty: number;
  totalAmount: number;
  sizes: Record<string, number>;
  paymentStatus: PaymentStatus;
  paymentNote: string;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { status: PaymentStatus; note: string }>
  >({});

  const load = useCallback(async () => {
    const res = await fetch("/api/summary", { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "โหลดไม่สำเร็จ");
    const list = (data.schools || []) as SchoolSummary[];
    setSchools(list);
    const next: Record<string, { status: PaymentStatus; note: string }> = {};
    for (const s of list) {
      next[s.schoolId] = { status: s.paymentStatus, note: s.paymentNote || "" };
    }
    setDrafts(next);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("vip-admin-pass");
    if (saved) {
      setPassword(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    load().catch((err) =>
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ"),
    );
  }, [authed, load]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    sessionStorage.setItem("vip-admin-pass", password);
    setAuthed(true);
  }

  async function saveSchool(school: SchoolSummary) {
    setSavingId(school.schoolId);
    setError(null);
    try {
      const draft = drafts[school.schoolId];
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          status: draft.status,
          note: draft.note,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "อัปเดตไม่สำเร็จ");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ");
      if (err instanceof Error && /รหัสผ่าน/.test(err.message)) {
        setAuthed(false);
        sessionStorage.removeItem("vip-admin-pass");
      }
    } finally {
      setSavingId(null);
    }
  }

  if (!authed) {
    return (
      <div className="shell">
        <p className="step-kicker">Admin</p>
        <h1 className="step-title">ตรวจสอบการชำระเงิน</h1>
        <p className="step-desc">เข้าสู่ระบบเพื่ออัปเดตสถานะแต่ละโรงเรียน</p>
        <form onSubmit={onLogin} className="max-w-sm">
          <label className="field-label">รหัสผ่านแอดมิน</label>
          <input
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error-box">{error}</div>}
          <button type="submit" className="hero-cta mt-5">
            เข้าสู่ระบบ
          </button>
        </form>
        <p className="mt-8">
          <Link href="/summary" className="btn-ghost">
            ← ดูสรุปสาธารณะ
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="shell summary-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="step-kicker">Admin · Payment Check</p>
          <h1 className="step-title">อัปเดตสถานะชำระเงิน</h1>
          <p className="step-desc mb-0">
            ไม่แสดงรายชื่อผู้สวมใส่ · อัปเดตเฉพาะสถานะรายโรงเรียน
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/summary" className="btn-ghost">
            หน้าสรุป
          </Link>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              sessionStorage.removeItem("vip-admin-pass");
              setAuthed(false);
            }}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      {error && <div className="error-box mt-4">{error}</div>}

      <div className="summary-list">
        {schools.map((school) => {
          const draft = drafts[school.schoolId] || {
            status: school.paymentStatus,
            note: school.paymentNote,
          };
          return (
            <article key={school.schoolId} className="summary-card">
              <div className="summary-card-head">
                <h2>{school.schoolName}</h2>
                <strong>
                  {school.totalQty} ตัว ·{" "}
                  {school.totalAmount.toLocaleString("th-TH")} ฿
                </strong>
              </div>
              <div className="size-guide mb-3">
                {Object.entries(school.sizes).map(([size, qty]) => (
                  <div key={size} className="size-pill">
                    <strong>{size}</strong>
                    <span>{qty}</span>
                  </div>
                ))}
              </div>
              <div className="grid-2">
                <div>
                  <label className="field-label">สถานะชำระเงิน</label>
                  <select
                    className="field"
                    value={draft.status}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [school.schoolId]: {
                          ...draft,
                          status: e.target.value as PaymentStatus,
                        },
                      }))
                    }
                  >
                    <option value="รอตรวจสอบ">รอตรวจสอบ</option>
                    <option value="ชำระแล้ว">ชำระแล้ว</option>
                    <option value="ไม่ครบ/มีปัญหา">ไม่ครบ/มีปัญหา</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">หมายเหตุแอดมิน</label>
                  <input
                    className="field"
                    value={draft.note}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [school.schoolId]: {
                          ...draft,
                          note: e.target.value,
                        },
                      }))
                    }
                    placeholder="เช่น ตรวจสลิปแล้ว"
                  />
                </div>
              </div>
              <button
                type="button"
                className="hero-cta mt-4"
                style={{ fontSize: "0.9rem", padding: "0.7rem 1.1rem" }}
                disabled={savingId === school.schoolId}
                onClick={() => saveSchool(school)}
              >
                {savingId === school.schoolId ? "กำลังบันทึก..." : "บันทึกสถานะ"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
