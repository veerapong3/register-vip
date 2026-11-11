"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageLoader } from "@/components/PageLoader";

type Props = {
  children: ReactNode;
  minMs?: number;
  label?: string;
};

/** แสดงเนื้อหาไว้ข้างใต้ตั้งแต่แรก แล้วค่อยเฟด loader ออก — รูปจะเริ่มโหลดทันที */
export function PageEnter({
  children,
  minMs = 650,
  label = "กำลังเปิดหน้า...",
}: Props) {
  const [showLoader, setShowLoader] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), minMs);
    const hide = window.setTimeout(() => setShowLoader(false), minMs + 320);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(hide);
    };
  }, [minMs]);

  return (
    <div className="page-enter-root">
      <div className={`page-enter-content${showLoader ? " is-dimmed" : ""}`}>
        {children}
      </div>
      {showLoader && (
        <div
          className={`page-enter-overlay${leaving ? " is-leaving" : ""}`}
          aria-hidden={leaving}
        >
          <PageLoader fullScreen label={label} />
        </div>
      )}
    </div>
  );
}
