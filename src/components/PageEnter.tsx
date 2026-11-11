"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageLoader } from "@/components/PageLoader";

type Props = {
  children: ReactNode;
  minMs?: number;
  label?: string;
};

export function PageEnter({
  children,
  minMs = 700,
  label = "กำลังเปิดหน้า...",
}: Props) {
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const show = window.setTimeout(() => setLeaving(true), minMs);
    const done = window.setTimeout(() => setReady(true), minMs + 380);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(done);
    };
  }, [minMs]);

  if (ready) {
    return <div className="page-enter-content">{children}</div>;
  }

  return (
    <div className={`page-enter-shell${leaving ? " is-leaving" : ""}`}>
      <PageLoader fullScreen label={label} />
    </div>
  );
}
