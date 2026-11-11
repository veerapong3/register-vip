"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BASE_PRICE } from "@/lib/sizes";

type SchoolSummary = {
  schoolId: string;
  schoolName: string;
  totalQty: number;
  totalAmount: number;
  sizes: Record<string, number>;
  paymentStatus: "รอตรวจสอบ" | "ชำระแล้ว" | "ไม่ครบ/มีปัญหา";
  paymentNote: string;
  updatedAt: string;
};

type SummaryResponse = {
  ok: boolean;
  error?: string;
  schools?: SchoolSummary[];
  totals?: {
    schools: number;
    shirts: number;
    amount: number;
    paidShirts: number;
    pendingSchools: number;
  };
};

function statusClass(status: string) {
  if (status === "ชำระแล้ว") return "status-paid";
  if (status === "ไม่ครบ/มีปัญหา") return "status-issue";
  return "status-pending";
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

  return (
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

      {loading && <p className="mt-8 text-[var(--muted)]">กำลังโหลด...</p>}
      {!loading && data && !data.ok && (
        <div className="error-box mt-6">{data.error}</div>
      )}

      {data?.ok && data.totals && (
        <>
          <div className="summary-kpis">
            <div>
              <span>โรงเรียนที่สั่ง</span>
              <strong>{data.totals.schools}</strong>
            </div>
            <div>
              <span>เสื้อทั้งหมด</span>
              <strong>{data.totals.shirts} ตัว</strong>
            </div>
            <div>
              <span>ยอดรวม</span>
              <strong>{data.totals.amount.toLocaleString("th-TH")} ฿</strong>
            </div>
            <div>
              <span>รอตรวจชำระ</span>
              <strong>{data.totals.pendingSchools} รร.</strong>
            </div>
          </div>

          <div className="summary-list">
            {(data.schools || []).map((school) => (
              <article key={school.schoolId} className="summary-card">
                <div className="summary-card-head">
                  <h2>{school.schoolName}</h2>
                  <span className={`status-badge ${statusClass(school.paymentStatus)}`}>
                    {school.paymentStatus}
                  </span>
                </div>
                <p className="summary-amount">
                  {school.totalQty} ตัว ·{" "}
                  {school.totalAmount.toLocaleString("th-TH")} บาท
                </p>
                <div className="size-guide">
                  {Object.entries(school.sizes).map(([size, qty]) => (
                    <div key={size} className="size-pill">
                      <strong>{size}</strong>
                      <span>{qty} ตัว</span>
                    </div>
                  ))}
                </div>
                {school.paymentNote && (
                  <p className="summary-note">หมายเหตุ: {school.paymentNote}</p>
                )}
              </article>
            ))}
            {(data.schools || []).length === 0 && (
              <p className="text-[var(--muted)]">ยังไม่มีรายการสั่งจอง</p>
            )}
          </div>
        </>
      )}

      <footer className="footer">
        โรงเรียนดอนตาลวิทยา × สพม.มุกดาหาร
        <br />
        ผู้ประสานงาน ผอ.บุญเลี่ยม บุญศรี และ รองฯ วีระพงศ์ ตะโกนอก · 087-946-3192
      </footer>
    </div>
  );
}
