"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import {
  confirmAction,
  toastError,
  toastInfo,
  toastSuccess,
} from "@/lib/alerts";
import { downloadCsv, stamp } from "@/lib/exportCsv";
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
  people: { name: string; jerseyNumber: string; size: string }[];
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

function safeSlipHref(url: string) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    if (
      u.hostname === "drive.google.com" ||
      u.hostname === "docs.google.com" ||
      u.hostname.endsWith(".googleusercontent.com")
    ) {
      return url;
    }
  } catch {
    return null;
  }
  return null;
}

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard", {
        cache: "no-store",
        credentials: "same-origin",
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
      setAuthed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load()
      .catch(() => {
        setAuthed(false);
      })
      .finally(() => setBooting(false));
  }, [load]);

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
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      }
      setPassword("");
      await load();
      toastSuccess("เข้าสู่ระบบสำเร็จ");
    } catch (err) {
      setAuthed(false);
      const msg = err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    const ok = await confirmAction({
      title: "ออกจากระบบ?",
      text: "ต้องเข้าสู่ระบบใหม่เพื่อจัดการข้อมูล",
      confirmText: "ออกจากระบบ",
      icon: "warning",
    });
    if (!ok) return;
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => null);
    setAuthed(false);
    setSchools([]);
    setRegistrations([]);
    setTotals(null);
    toastInfo("ออกจากระบบแล้ว");
  }

  function exportNames() {
    const rows: (string | number)[][] = [];
    for (const r of registrations) {
      r.people.forEach((p, i) => {
        rows.push([
          r.timestamp,
          r.registrationId,
          r.schoolName,
          r.schoolId,
          r.contactName,
          r.contactPhone,
          i + 1,
          p.name,
          p.jerseyNumber || "",
          p.size,
          BASE_PRICE,
          r.slipUrl,
          r.note,
        ]);
      });
    }
    downloadCsv(
      `vip-names-${stamp()}.csv`,
      [
        "วันเวลา",
        "รหัสลงทะเบียน",
        "โรงเรียน",
        "รหัสโรงเรียน",
        "ผู้ประสานงาน",
        "เบอร์โทร",
        "ลำดับ",
        "ชื่อผู้สวมใส่",
        "เบอร์หลังเสื้อ",
        "ไซส์",
        "ราคา",
        "ลิงก์สลิป",
        "หมายเหตุ",
      ],
      rows,
    );
  }

  function exportSchools() {
    const sizeCodes = SHIRT_SIZES.map((s) => s.code);
    const rows = schools.map((s) => [
      s.schoolName,
      s.schoolId,
      s.totalQty,
      s.totalAmount,
      s.paymentStatus,
      s.paymentNote,
      s.updatedAt || "",
      s.registrationCount || 0,
      ...sizeCodes.map((code) => s.sizes[code] || 0),
    ]);
    downloadCsv(
      `vip-schools-${stamp()}.csv`,
      [
        "โรงเรียน",
        "รหัสโรงเรียน",
        "จำนวนตัว",
        "ยอดเงิน",
        "สถานะชำระเงิน",
        "หมายเหตุแอดมิน",
        "อัปเดตล่าสุด",
        "จำนวนรายการ",
        ...sizeCodes.map((c) => `ไซส์ ${c}`),
      ],
      rows,
    );
  }

  function exportSizeSummary() {
    const rows = SHIRT_SIZES.filter((s) => sizeTotals[s.code]).map((s) => [
      s.code,
      s.chestInches ?? "",
      sizeTotals[s.code] || 0,
      (sizeTotals[s.code] || 0) * BASE_PRICE,
    ]);
    downloadCsv(
      `vip-sizes-${stamp()}.csv`,
      ["ไซส์", "รอบอก (นิ้ว)", "จำนวนตัว", "มูลค่า"],
      rows,
    );
  }

  async function persistSchoolStatus(
    school: SchoolSummary,
    status: PaymentStatus,
    note: string,
  ) {
    setSavingId(school.schoolId);
    setError(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          status,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "อัปเดตไม่สำเร็จ");
      }
      setDrafts((prev) => ({
        ...prev,
        [school.schoolId]: { status, note },
      }));
      await load();
      toastSuccess(
        status === "ชำระแล้ว"
          ? `อนุมัติแล้ว · ${school.schoolName}`
          : `บันทึกสถานะแล้ว · ${school.schoolName}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ";
      setError(msg);
      toastError(msg);
      if (/(รหัสผ่าน|ชื่อผู้ใช้|ไม่ถูกต้อง)/.test(msg)) {
        setAuthed(false);
      }
    } finally {
      setSavingId(null);
    }
  }

  async function saveSchool(school: SchoolSummary) {
    const draft = drafts[school.schoolId] || {
      status: school.paymentStatus,
      note: school.paymentNote,
    };
    const ok = await confirmAction({
      title: "บันทึกสถานะชำระเงิน?",
      text: `${school.schoolName} → ${draft.status}`,
      confirmText: "บันทึก",
      icon: draft.status === "ชำระแล้ว" ? "question" : "warning",
    });
    if (!ok) return;
    await persistSchoolStatus(school, draft.status, draft.note);
  }

  async function quickApprove(school: SchoolSummary) {
    const slip =
      registrations.find((r) => r.schoolId === school.schoolId)?.slipUrl || "";
    const ok = await confirmAction({
      title: "อนุมัติชำระเงิน?",
      text: `${school.schoolName} · ${school.totalQty} ตัว · ${school.totalAmount.toLocaleString("th-TH")} บาท${slip ? "" : " (ยังไม่พบลิงก์สลิป)"}`,
      confirmText: "อนุมัติชำระแล้ว",
      icon: "question",
    });
    if (!ok) return;
    await persistSchoolStatus(
      school,
      "ชำระแล้ว",
      drafts[school.schoolId]?.note || school.paymentNote || "อนุมัติจากภาพรวม",
    );
  }

  const pendingSchools = useMemo(
    () => schools.filter((s) => s.paymentStatus === "รอตรวจสอบ"),
    [schools],
  );

  if (booting) {
    return (
      <div className="shell">
        <p className="text-[var(--muted)]">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
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
          <label className="field-label">ชื่อผู้ใช้</label>
          <input
            type="text"
            className="field field-solid"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <label className="field-label mt-4">รหัสผ่าน</label>
          <input
            type="password"
            className="field field-solid"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
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
            onClick={() => load()}
            disabled={loading}
          >
            รีเฟรช
          </button>
          <Link href="/summary" className="btn-ghost">
            หน้าสรุป
          </Link>
          <button type="button" className="btn-ghost" onClick={onLogout}>
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

      <div className="admin-export-bar">
        <p className="admin-export-label">ส่งออกข้อมูล (CSV / เปิดใน Excel ได้)</p>
        <div className="admin-export-actions">
          <button type="button" className="btn-export" onClick={exportNames}>
            ส่งออกรายชื่อผู้สวมใส่
          </button>
          <button type="button" className="btn-export" onClick={exportSchools}>
            ส่งออกสรุปโรงเรียน
          </button>
          <button
            type="button"
            className="btn-export"
            onClick={exportSizeSummary}
          >
            ส่งออกสรุปไซส์
          </button>
        </div>
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
          <h2 className="admin-section-title">อนุมัติเร็ว · รอตรวจสอบ</h2>
          <div className="quick-approve-list">
            {pendingSchools.map((school) => {
              const order = registrations.find(
                (r) => r.schoolId === school.schoolId,
              );
              const slip = order ? safeSlipHref(order.slipUrl) : null;
              return (
                <article key={school.schoolId} className="quick-approve-card">
                  <div className="quick-approve-main">
                    <h3>{school.schoolName}</h3>
                    <p>
                      {school.totalQty} ตัว ·{" "}
                      {school.totalAmount.toLocaleString("th-TH")} บาท
                      {school.registrationCount
                        ? ` · ${school.registrationCount} รายการ`
                        : ""}
                    </p>
                    <div className="school-total-sizes">
                      {Object.entries(school.sizes).map(([size, qty]) => (
                        <span key={size}>
                          {size}×{qty}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="quick-approve-actions">
                    {slip && (
                      <a
                        className="btn-ghost"
                        href={slip}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        เปิดสลิป
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-approve"
                      disabled={savingId === school.schoolId}
                      onClick={() => quickApprove(school)}
                    >
                      {savingId === school.schoolId
                        ? "กำลังอนุมัติ..."
                        : "อนุมัติชำระแล้ว"}
                    </button>
                  </div>
                </article>
              );
            })}
            {pendingSchools.length === 0 && (
              <p className="text-[var(--muted)]">ไม่มีรายการรอตรวจสอบ</p>
            )}
          </div>

          <h2 className="admin-section-title mt-8">สรุปไซส์ทั้งหมด</h2>
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
                {safeSlipHref(r.slipUrl) && (
                  <a
                    className="admin-slip-link"
                    href={safeSlipHref(r.slipUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
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
                            .map(
                              (p) =>
                                `${p.name} #${p.jerseyNumber || "-"} (${p.size})`,
                            )
                            .join(" · ")}
                        </p>
                        {safeSlipHref(o.slipUrl) && (
                          <a
                            className="admin-slip-link"
                            href={safeSlipHref(o.slipUrl)!}
                            target="_blank"
                            rel="noopener noreferrer"
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
                    {i + 1}. {p.name} · เบอร์ {p.jerseyNumber || "-"} · ไซส์{" "}
                    {p.size} · {BASE_PRICE} ฿
                  </li>
                ))}
              </ul>
              {safeSlipHref(r.slipUrl) && (
                <a
                  className="admin-slip-link"
                  href={safeSlipHref(r.slipUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
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
