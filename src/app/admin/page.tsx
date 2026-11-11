"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { BASE_PRICE, SHIRT_SIZES } from "@/lib/sizes";

type PaymentStatus = "รอตรวจสอบ" | "ชำระแล้ว" | "ไม่ครบ/มีปัญหา";

type SchoolSummary = {
  schoolId: string;
  schoolName: string;
  totalQty: number;
  totalAmount: number;
  sizes: Record<string, number>;
  paymentStatus: PaymentStatus;
  paymentNote: string;
  updatedAt?: string;
  registrationCount?: number;
};

type Registration = {
  registrationId: string;
  timestamp: string;
  schoolId: string;
  schoolName: string;
  contactName: string;
  contactPhone: string;
  note: string;
  slipUrl: string;
  quantity: number;
  totalAmount: number;
  people: { name: string; size: string }[];
};

type Totals = {
  schools: number;
  shirts: number;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  paidSchools: number;
  pendingSchools: number;
  issueSchools: number;
  registrations: number;
};

type Tab = "overview" | "schools" | "orders";

function statusClass(status: string) {
  if (status === "ชำระแล้ว") return "status-paid";
  if (status === "ไม่ครบ/มีปัญหา") return "status-issue";
  return "status-pending";
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sizeTotals, setSizeTotals] = useState<Record<string, number>>({});
  const [totals, setTotals] = useState<Totals | null>(null);
  const [filter, setFilter] = useState<"all" | PaymentStatus>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { status: PaymentStatus; note: string }>
  >({});

  const load = useCallback(async (pass: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard", {
        cache: "no-store",
        headers: { "x-admin-password": pass },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "โหลดไม่สำเร็จ");
      }
      const list = (data.schools || []) as SchoolSummary[];
      setSchools(list);
      setRegistrations((data.registrations || []) as Registration[]);
      setSizeTotals((data.sizeTotals || {}) as Record<string, number>);
      setTotals(data.totals as Totals);
      const next: Record<string, { status: PaymentStatus; note: string }> = {};
      for (const s of list) {
        next[s.schoolId] = {
          status: s.paymentStatus,
          note: s.paymentNote || "",
        };
      }
      setDrafts(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("vip-admin-pass");
    if (saved) {
      setPassword(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed || !password) return;
    load(password).catch((err) => {
      setError(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
      if (err instanceof Error && /รหัสผ่าน/.test(err.message)) {
        setAuthed(false);
        sessionStorage.removeItem("vip-admin-pass");
      }
    });
  }, [authed, password, load]);

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      if (filter !== "all" && s.paymentStatus !== filter) return false;
      if (!query.trim()) return true;
      return s.schoolName.toLowerCase().includes(query.trim().toLowerCase());
    });
  }, [schools, filter, query]);

  const filteredOrders = useMemo(() => {
    if (!query.trim()) return registrations;
    const q = query.trim().toLowerCase();
    return registrations.filter(
      (r) =>
        r.schoolName.toLowerCase().includes(q) ||
        r.registrationId.toLowerCase().includes(q) ||
        r.contactName.toLowerCase().includes(q),
    );
  }, [registrations, query]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await load(password);
      sessionStorage.setItem("vip-admin-pass", password);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    }
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
      await load(password);
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
        <h1 className="step-title">ศูนย์ข้อมูลแอดมิน</h1>
        <p className="step-desc">
          ดูสรุปยอด รายการสั่งจอง รายชื่อ และอัปเดตสถานะชำระเงิน
        </p>
        <form onSubmit={onLogin} className="admin-login">
          <label className="field-label">รหัสผ่านแอดมิน</label>
          <input
            type="password"
            className="field field-solid"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error-box">{error}</div>}
          <button type="submit" className="btn-add mt-5" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
        <p className="mt-8">
          <Link href="/summary" className="btn-ghost">
            ← ดูสรุปสาธารณะ
          </Link>
        </p>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="shell summary-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="step-kicker">Admin Dashboard</p>
          <h1 className="step-title">ศูนย์ข้อมูล VIP</h1>
          <p className="step-desc mb-0">
            ดูภาพรวม · รายโรงเรียน · รายการลงทะเบียน และตรวจสลิป
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => load(password)}
            disabled={loading}
          >
            รีเฟรช
          </button>
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

      <div className="admin-tabs">
        {(
          [
            ["overview", "ภาพรวม"],
            ["schools", "โรงเรียน"],
            ["orders", "รายการสั่ง"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`admin-tab${tab === id ? " is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="error-box mt-4">{error}</div>}

      {totals && (
        <div className="summary-kpis">
          <div>
            <span>โรงเรียน</span>
            <strong>{totals.schools}</strong>
          </div>
          <div>
            <span>เสื้อทั้งหมด</span>
            <strong>{totals.shirts} ตัว</strong>
          </div>
          <div>
            <span>ยอดรวม</span>
            <strong>{totals.amount.toLocaleString("th-TH")} ฿</strong>
          </div>
          <div>
            <span>ชำระแล้ว</span>
            <strong>{totals.paidAmount.toLocaleString("th-TH")} ฿</strong>
          </div>
          <div>
            <span>รอตรวจ</span>
            <strong>{totals.pendingSchools} รร.</strong>
          </div>
          <div>
            <span>มีปัญหา</span>
            <strong>{totals.issueSchools} รร.</strong>
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div className="admin-section">
          <h2 className="admin-section-title">สรุปไซส์ทั้งหมด</h2>
          <div className="size-guide">
            {SHIRT_SIZES.map((s) =>
              sizeTotals[s.code] ? (
                <div key={s.code} className="size-pill">
                  <strong>{s.code}</strong>
                  <span>{sizeTotals[s.code]} ตัว</span>
                </div>
              ) : null,
            )}
          </div>

          <h2 className="admin-section-title mt-8">รายการล่าสุด</h2>
          <div className="summary-list">
            {registrations.slice(0, 5).map((r) => (
              <article key={r.registrationId} className="summary-card">
                <div className="summary-card-head">
                  <h2>{r.schoolName}</h2>
                  <strong>
                    {r.quantity} ตัว · {r.totalAmount.toLocaleString("th-TH")} ฿
                  </strong>
                </div>
                <p className="admin-meta">
                  {r.registrationId} · {r.timestamp}
                </p>
                <p className="admin-meta">
                  ผู้ประสานงาน {r.contactName} · {r.contactPhone}
                </p>
                {r.slipUrl && (
                  <a
                    className="admin-slip-link"
                    href={r.slipUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    เปิดสลิป
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {(tab === "schools" || tab === "orders") && (
        <div className="admin-toolbar">
          <input
            className="field field-solid"
            placeholder={
              tab === "schools" ? "ค้นหาโรงเรียน..." : "ค้นหารหัส/โรงเรียน/ผู้ประสานงาน..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {tab === "schools" && (
            <select
              className="field field-solid"
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as "all" | PaymentStatus)
              }
            >
              <option value="all">ทุกสถานะ</option>
              <option value="รอตรวจสอบ">รอตรวจสอบ</option>
              <option value="ชำระแล้ว">ชำระแล้ว</option>
              <option value="ไม่ครบ/มีปัญหา">ไม่ครบ/มีปัญหา</option>
            </select>
          )}
        </div>
      )}

      {tab === "schools" && (
        <div className="summary-list">
          {filteredSchools.map((school) => {
            const draft = drafts[school.schoolId] || {
              status: school.paymentStatus,
              note: school.paymentNote,
            };
            const schoolOrders = registrations.filter(
              (r) => r.schoolId === school.schoolId,
            );
            return (
              <article key={school.schoolId} className="summary-card">
                <div className="summary-card-head">
                  <h2>{school.schoolName}</h2>
                  <span
                    className={`status-badge ${statusClass(school.paymentStatus)}`}
                  >
                    {school.paymentStatus}
                  </span>
                </div>
                <p className="summary-amount">
                  {school.totalQty} ตัว ·{" "}
                  {school.totalAmount.toLocaleString("th-TH")} บาท
                  {school.registrationCount
                    ? ` · ${school.registrationCount} รายการ`
                    : ""}
                </p>
                <div className="size-guide mb-3">
                  {Object.entries(school.sizes).map(([size, qty]) => (
                    <div key={size} className="size-pill">
                      <strong>{size}</strong>
                      <span>{qty}</span>
                    </div>
                  ))}
                </div>

                {schoolOrders.length > 0 && (
                  <div className="admin-order-mini">
                    {schoolOrders.map((o) => (
                      <div key={o.registrationId}>
                        <p>
                          <strong>{o.registrationId}</strong> · {o.quantity} ตัว
                        </p>
                        <p className="admin-meta">
                          {o.contactName} · {o.contactPhone}
                        </p>
                        <p className="admin-meta">
                          {o.people
                            .map((p) => `${p.name} (${p.size})`)
                            .join(" · ")}
                        </p>
                        {o.slipUrl && (
                          <a
                            className="admin-slip-link"
                            href={o.slipUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            เปิดสลิป
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid-2 mt-4">
                  <div>
                    <label className="field-label">สถานะชำระเงิน</label>
                    <select
                      className="field field-solid"
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
                      className="field field-solid"
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
                  className="btn-add mt-4"
                  disabled={savingId === school.schoolId}
                  onClick={() => saveSchool(school)}
                >
                  {savingId === school.schoolId
                    ? "กำลังบันทึก..."
                    : "บันทึกสถานะ"}
                </button>
              </article>
            );
          })}
          {filteredSchools.length === 0 && (
            <p className="text-[var(--muted)]">ไม่พบโรงเรียน</p>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className="summary-list">
          {filteredOrders.map((r) => (
            <article key={r.registrationId} className="summary-card">
              <div className="summary-card-head">
                <h2>{r.schoolName}</h2>
                <strong>
                  {r.quantity} ตัว · {r.totalAmount.toLocaleString("th-TH")} ฿
                </strong>
              </div>
              <p className="admin-meta">
                {r.registrationId} · {r.timestamp}
              </p>
              <p className="admin-meta">
                ผู้ประสานงาน {r.contactName} ·{" "}
                <a href={`tel:${r.contactPhone}`}>{r.contactPhone}</a>
              </p>
              {r.note && <p className="summary-note">หมายเหตุ: {r.note}</p>}
              <ul className="admin-people">
                {r.people.map((p, i) => (
                  <li key={`${r.registrationId}-${i}`}>
                    {i + 1}. {p.name} · ไซส์ {p.size} · {BASE_PRICE} ฿
                  </li>
                ))}
              </ul>
              {r.slipUrl && (
                <a
                  className="admin-slip-link"
                  href={r.slipUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  เปิดสลิปใน Drive
                </a>
              )}
            </article>
          ))}
          {filteredOrders.length === 0 && (
            <p className="text-[var(--muted)]">ไม่พบรายการ</p>
          )}
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
