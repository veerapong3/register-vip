"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageEnter } from "@/components/PageEnter";
import { PageLoader } from "@/components/PageLoader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  confirmAction,
  toastError,
  toastInfo,
  toastSuccess,
} from "@/lib/alerts";
import { downloadCsv, stamp } from "@/lib/exportCsv";
import { SCHOOLS } from "@/lib/schools";
import { BASE_PRICE, SHIRT_SIZES } from "@/lib/sizes";

type PaymentStatus =
  | "รอตรวจสอบ"
  | "ชำระแล้ว"
  | "ไม่ต้องชำระเงิน"
  | "ไม่ครบ/มีปัญหา";

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

type EditPerson = {
  name: string;
  jerseyNumber: string;
  size: string;
  noJersey: boolean;
};

function isNoJersey(value: string) {
  const v = String(value || "").trim();
  return !v || v === "-" || v === "ไม่มี" || v === "ไม่ใส่เบอร์";
}

function formatJersey(value: string) {
  return isNoJersey(value) ? "ไม่ใส่เบอร์" : `#${value.trim()}`;
}

type Totals = {
  schools: number;
  shirts: number;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  paidSchools: number;
  pendingSchools: number;
  issueSchools: number;
  freeSchools: number;
  registrations: number;
};

type Tab = "overview" | "schools" | "orders";

function statusClass(status: string) {
  if (status === "ชำระแล้ว") return "status-paid";
  if (status === "ไม่ต้องชำระเงิน") return "status-free";
  if (status === "ไม่ครบ/มีปัญหา") return "status-issue";
  return "status-pending";
}

function cardToneClass(status: string) {
  if (status === "ชำระแล้ว") return "is-paid";
  if (status === "ไม่ต้องชำระเงิน") return "is-free";
  if (status === "ไม่ครบ/มีปัญหา") return "is-issue";
  return "is-pending";
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
  const [editing, setEditing] = useState<Registration | null>(null);
  const [editSchoolId, setEditSchoolId] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editPeople, setEditPeople] = useState<EditPerson[]>([]);
  const [editSaving, setEditSaving] = useState(false);

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
          isNoJersey(p.jerseyNumber) ? "ไม่ใส่เบอร์" : p.jerseyNumber || "",
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
          : status === "ไม่ต้องชำระเงิน"
            ? `ตั้งเป็นไม่ต้องชำระเงิน · ${school.schoolName}`
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
      icon:
        draft.status === "ชำระแล้ว" || draft.status === "ไม่ต้องชำระเงิน"
          ? "question"
          : "warning",
    });
    if (!ok) return;
    await persistSchoolStatus(school, draft.status, draft.note);
  }

  async function markNoPayment(school: SchoolSummary) {
    const ok = await confirmAction({
      title: "ตั้งเป็นไม่ต้องชำระเงิน?",
      text: `${school.schoolName} · ${school.totalQty} ตัว · จะไม่นับเป็นยอดรอชำระ`,
      confirmText: "ไม่ต้องชำระเงิน",
      icon: "question",
    });
    if (!ok) return;
    await persistSchoolStatus(
      school,
      "ไม่ต้องชำระเงิน",
      drafts[school.schoolId]?.note ||
        school.paymentNote ||
        "แอดมินยกเว้นการชำระเงิน",
    );
  }

  function openEdit(reg: Registration) {
    setEditing(reg);
    setEditSchoolId(reg.schoolId);
    setEditContactName(reg.contactName);
    setEditContactPhone(reg.contactPhone);
    setEditNote(reg.note || "");
    setEditPeople(
      reg.people.map((p) => {
        const noJersey = isNoJersey(p.jerseyNumber);
        return {
          name: p.name,
          jerseyNumber: noJersey ? "" : p.jerseyNumber || "",
          size: p.size,
          noJersey,
        };
      }),
    );
  }

  function closeEdit() {
    if (editSaving) return;
    setEditing(null);
  }

  function updateEditPerson(index: number, patch: Partial<EditPerson>) {
    setEditPeople((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  }

  function addEditPerson() {
    setEditPeople((prev) => [
      ...prev,
      { name: "", jerseyNumber: "", size: "L", noJersey: false },
    ]);
  }

  function removeEditPerson(index: number) {
    setEditPeople((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editSchoolId || !editContactName.trim() || !editContactPhone.trim()) {
      toastError("กรุณากรอกโรงเรียน ผู้ประสานงาน และเบอร์โทร");
      return;
    }
    if (editPeople.some((p) => !p.name.trim() || !p.size)) {
      toastError("กรุณากรอกชื่อและไซส์ให้ครบทุกคน");
      return;
    }
    if (editPeople.some((p) => !p.noJersey && !p.jerseyNumber.trim())) {
      toastError("กรุณากรอกเบอร์หลังเสื้อ หรือเลือกไม่ใส่เบอร์");
      return;
    }
    const ok = await confirmAction({
      title: "บันทึกการแก้ไขรายการ?",
      text: `${editing.registrationId} · ${editPeople.length} ตัว`,
      confirmText: "บันทึก",
      icon: "question",
    });
    if (!ok) return;

    setEditSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: editing.registrationId,
          schoolId: editSchoolId,
          contactName: editContactName.trim(),
          contactPhone: editContactPhone.trim(),
          note: editNote.trim(),
          people: editPeople.map((p) => ({
            name: p.name.trim(),
            jerseyNumber: p.noJersey ? "" : p.jerseyNumber.trim(),
            noJersey: p.noJersey,
            size: p.size,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "บันทึกไม่สำเร็จ");
      }
      setEditing(null);
      await load();
      toastSuccess(`แก้ไขรายการแล้ว · ${editing.registrationId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "บันทึกไม่สำเร็จ";
      setError(msg);
      toastError(msg);
      if (/(รหัสผ่าน|ชื่อผู้ใช้|ไม่ถูกต้อง)/.test(msg)) {
        setAuthed(false);
        setEditing(null);
      }
    } finally {
      setEditSaving(false);
    }
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
    return <PageLoader fullScreen label="กำลังตรวจสอบสิทธิ์แอดมิน..." />;
  }

  if (!authed) {
    return (
      <PageEnter label="กำลังเปิดหน้าแอดมิน...">
        <div className="shell">
          <p className="step-kicker">Admin</p>
          <h1 className="step-title">ศูนย์ข้อมูลแอดมิน</h1>
          <p className="step-desc">
            ดูสรุปยอด แก้ไขรายการสั่งจอง รายชื่อ และอัปเดตสถานะชำระเงิน
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
      </PageEnter>
    );
  }

  return (
    <div className="shell summary-page page-enter-content">
      <div className="admin-topbar">
        <div className="admin-topbar-user">
          <span className="admin-topbar-label">Admin</span>
          <strong>{username || "admin"}</strong>
        </div>
        <div className="admin-topbar-actions">
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
          <button type="button" className="btn-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mt-4">
        <div>
          <p className="step-kicker">Admin Dashboard</p>
          <h1 className="step-title">ศูนย์ข้อมูล VIP</h1>
          <p className="step-desc mb-0">
            ดูภาพรวม · แก้ไขรายการ · รายโรงเรียน และตรวจสลิป
          </p>
        </div>
        <button type="button" className="btn-logout" onClick={onLogout}>
          ออกจากระบบ
        </button>
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
          <div>
            <span>ไม่ต้องชำระ</span>
            <strong>{totals.freeSchools || 0} รร.</strong>
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
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={savingId === school.schoolId}
                      onClick={() => markNoPayment(school)}
                    >
                      ไม่ต้องชำระเงิน
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
            {registrations.slice(0, 5).map((r) => {
              const schoolStatus =
                schools.find((s) => s.schoolId === r.schoolId)?.paymentStatus ||
                "รอตรวจสอบ";
              return (
              <article
                key={r.registrationId}
                className={`summary-card admin-card ${cardToneClass(schoolStatus)}`}
              >
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
                <div className="admin-card-actions">
                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() => {
                      setTab("orders");
                      openEdit(r);
                    }}
                  >
                    แก้ไขรายการ
                  </button>
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
                </div>
              </article>
            );
            })}
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
              <option value="ไม่ต้องชำระเงิน">ไม่ต้องชำระเงิน</option>
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
              <article
                key={school.schoolId}
                className={`summary-card admin-card ${cardToneClass(school.paymentStatus)}`}
              >
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
                                `${p.name} ${formatJersey(p.jerseyNumber)} (${p.size})`,
                            )
                            .join(" · ")}
                        </p>
                        <div className="admin-card-actions">
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={() => {
                              setTab("orders");
                              openEdit(o);
                            }}
                          >
                            แก้ไข
                          </button>
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
                      <option value="ไม่ต้องชำระเงิน">ไม่ต้องชำระเงิน</option>
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
          {filteredOrders.map((r) => {
            const schoolStatus =
              schools.find((s) => s.schoolId === r.schoolId)?.paymentStatus ||
              "รอตรวจสอบ";
            return (
            <article
              key={r.registrationId}
              className={`summary-card admin-card ${cardToneClass(schoolStatus)}`}
            >
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
                    {i + 1}. {p.name} · {formatJersey(p.jerseyNumber)} · ไซส์{" "}
                    {p.size} · {BASE_PRICE} ฿
                  </li>
                ))}
              </ul>
              <div className="admin-card-actions">
                <button
                  type="button"
                  className="btn-edit"
                  onClick={() => openEdit(r)}
                >
                  แก้ไขรายการ
                </button>
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
              </div>
            </article>
            );
          })}
          {filteredOrders.length === 0 && (
            <p className="text-[var(--muted)]">ไม่พบรายการ</p>
          )}
        </div>
      )}

      {editing && (
        <div className="admin-edit-overlay" role="dialog" aria-modal="true">
          <div className="admin-edit-panel">
            <div className="admin-edit-head">
              <div>
                <p className="step-kicker mb-0">แก้ไขรายการจอง</p>
                <h2 className="admin-section-title mb-0">
                  {editing.registrationId}
                </h2>
                <p className="admin-meta mb-0">{editing.timestamp}</p>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={closeEdit}
                disabled={editSaving}
              >
                ปิด
              </button>
            </div>

            <div className="admin-edit-grid">
              <div>
                <label className="field-label">โรงเรียน</label>
                <select
                  className="field field-solid"
                  value={editSchoolId}
                  onChange={(e) => setEditSchoolId(e.target.value)}
                >
                  {SCHOOLS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">ผู้ประสานงาน</label>
                <input
                  className="field field-solid"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">เบอร์โทร</label>
                <input
                  className="field field-solid"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">หมายเหตุ</label>
                <input
                  className="field field-solid"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="ถ้ามี"
                />
              </div>
            </div>

            <div className="admin-edit-people-head">
              <h3 className="admin-section-title mb-0">
                รายชื่อผู้สวมใส่ ({editPeople.length} คน ·{" "}
                {(editPeople.length * BASE_PRICE).toLocaleString("th-TH")} ฿)
              </h3>
              <button
                type="button"
                className="btn-ghost"
                onClick={addEditPerson}
                disabled={editSaving}
              >
                + เพิ่มคน
              </button>
            </div>

            <div className="admin-edit-people">
              {editPeople.map((p, i) => (
                <div key={`edit-person-${i}`} className="admin-edit-person">
                  <span className="admin-edit-index">{i + 1}</span>
                  <input
                    className="field field-solid"
                    placeholder="ชื่อผู้สวมใส่"
                    value={p.name}
                    onChange={(e) =>
                      updateEditPerson(i, { name: e.target.value })
                    }
                  />
                  <div className="admin-edit-jersey">
                    <input
                      className="field field-solid"
                      placeholder={p.noJersey ? "ไม่ใส่เบอร์" : "เบอร์เสื้อ"}
                      value={p.noJersey ? "" : p.jerseyNumber}
                      disabled={p.noJersey}
                      onChange={(e) =>
                        updateEditPerson(i, {
                          noJersey: false,
                          jerseyNumber: e.target.value
                            .toUpperCase()
                            .replace(/[^0-9A-Za-z]/g, "")
                            .slice(0, 3),
                        })
                      }
                    />
                    <label className="no-jersey-option">
                      <input
                        type="checkbox"
                        checked={p.noJersey}
                        onChange={(e) =>
                          updateEditPerson(i, {
                            noJersey: e.target.checked,
                            jerseyNumber: e.target.checked
                              ? ""
                              : p.jerseyNumber,
                          })
                        }
                      />
                      <span>ไม่ใส่เบอร์</span>
                    </label>
                  </div>
                  <select
                    className="field field-solid"
                    value={p.size}
                    onChange={(e) =>
                      updateEditPerson(i, { size: e.target.value })
                    }
                  >
                    {SHIRT_SIZES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-remove-person"
                    onClick={() => removeEditPerson(i)}
                    disabled={editSaving || editPeople.length <= 1}
                    aria-label={`ลบคนที่ ${i + 1}`}
                  >
                    ลบ
                  </button>
                </div>
              ))}
            </div>

            <div className="admin-edit-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={closeEdit}
                disabled={editSaving}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn-add"
                onClick={saveEdit}
                disabled={editSaving}
              >
                {editSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
