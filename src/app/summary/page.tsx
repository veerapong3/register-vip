"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageEnter } from "@/components/PageEnter";
import { PageLoader } from "@/components/PageLoader";
import { SiteFooter } from "@/components/SiteFooter";
import { BASE_PRICE, SHIRT_SIZES } from "@/lib/sizes";

type SchoolSummary = {
  schoolId: string;
  schoolName: string;
  contactName?: string;
  totalQty: number;
  sizes: Record<string, number>;
  paymentStatus: "รอตรวจสอบ" | "ชำระแล้ว" | "ไม่ครบ/มีปัญหา";
  updatedAt: string;
};

type SummaryResponse = {
  ok: boolean;
  error?: string;
  schools?: SchoolSummary[];
  totals?: {
    schools: number;
    shirts: number;
    paidShirts: number;
    paidSchools: number;
    pendingSchools: number;
  };
};

function statusClass(status: string) {
  if (status === "ชำระแล้ว") return "status-paid";
  if (status === "ไม่ครบ/มีปัญหา") return "status-issue";
  return "status-pending";
}

function cardToneClass(status: string) {
  if (status === "ชำระแล้ว") return "is-paid";
  if (status === "ไม่ครบ/มีปัญหา") return "is-issue";
  return "is-pending";
}

export default function SummaryPage() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/summary", { cache: "no-store" });
        const json = (await res.json()) as SummaryResponse;
        if (alive) setData(json);
      } catch {
        if (alive) setData({ ok: false, error: "โหลดข้อมูลไม่สำเร็จ" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const sizeTotals = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const school of data?.schools || []) {
      for (const [size, qty] of Object.entries(school.sizes || {})) {
        counts[size] = (counts[size] || 0) + qty;
      }
    }
    return SHIRT_SIZES.filter((s) => counts[s.code]).map((s) => ({
      code: s.code,
      qty: counts[s.code],
    }));
  }, [data?.schools]);

  return (
    <PageEnter label="กำลังเปิดหน้าสรุป...">
      <div className="shell summary-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="step-kicker">Order Summary</p>
            <h1 className="step-title">สรุปการสั่งเสื้อตามโรงเรียน</h1>
            <p className="step-desc mb-0">
              แสดงจำนวนตามไซส์เท่านั้น ไม่แสดงรายชื่อ · ตัวละ {BASE_PRICE} บาท
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/" className="btn-ghost">
              ← ลงทะเบียน
            </Link>
            <Link href="/admin" className="btn-ghost">
              แอดมินตรวจชำระเงิน
            </Link>
          </div>
        </div>

        {loading && (
          <div className="mt-10">
            <PageLoader label="กำลังโหลดสรุปรายการ..." />
          </div>
        )}
        {!loading && data && !data.ok && (
          <div className="error-box mt-6">{data.error}</div>
        )}

        {data?.ok && data.totals && (
          <div className="page-enter-content">
            <div className="summary-kpis">
              <div>
                <span>โรงเรียนที่สั่ง</span>
                <strong>{data.totals.schools}</strong>
              </div>
              <div>
                <span>เสื้อทั้งหมด</span>
                <strong>{data.totals.shirts} ตัว</strong>
              </div>
              <div className="kpi-paid">
                <span>ชำระแล้ว</span>
                <strong>{data.totals.paidSchools} รร.</strong>
              </div>
              <div className="kpi-pending">
                <span>รอชำระ</span>
                <strong>{data.totals.pendingSchools} รร.</strong>
              </div>
            </div>

            {sizeTotals.length > 0 && (
              <section className="summary-size-box">
                <div className="summary-size-head">
                  <p className="school-total-label">สรุปไซส์ทั้งหมด</p>
                  <p className="summary-size-total">
                    รวม {data.totals.shirts} ตัว
                  </p>
                </div>
                <div className="size-guide">
                  {sizeTotals.map((s) => (
                    <div key={s.code} className="size-pill">
                      <strong>{s.code}</strong>
                      <span>{s.qty} ตัว</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="summary-list">
              {(data.schools || []).map((school) => (
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
                  {school.contactName ? (
                    <p className="summary-contact">
                      ผู้ประสานงาน · {school.contactName}
                    </p>
                  ) : null}
                  <p className="summary-amount">{school.totalQty} ตัว</p>
                  <div className="size-guide">
                    {Object.entries(school.sizes).map(([size, qty]) => (
                      <div key={size} className="size-pill">
                        <strong>{size}</strong>
                        <span>{qty} ตัว</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
              {(data.schools || []).length === 0 && (
                <p className="text-[var(--muted)]">ยังไม่มีรายการสั่งจอง</p>
              )}
            </div>
          </div>
        )}

        <SiteFooter />
      </div>
    </PageEnter>
  );
}
