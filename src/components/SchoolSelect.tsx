"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { filterSchools, type School } from "@/lib/schools";

type Props = {
  value: School | null;
  onChange: (school: School | null) => void;
};

export function SchoolSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => filterSchools(query), [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
        โรงเรียน (สพม.มุกดาหาร)
      </label>
      <input
        type="text"
        value={open ? query : value?.name ?? query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery(value?.name ?? "");
        }}
        placeholder="พิมพ์ค้นหาชื่อโรงเรียน..."
        autoComplete="off"
        className="field"
        required={!value}
      />
      {value && (
        <p className="mt-1 text-xs text-[var(--muted)]">
          อ.{value.district} · รหัส {value.id}
        </p>
      )}
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[var(--line)] bg-white shadow-lg">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--muted)]">
              ไม่พบโรงเรียน
            </li>
          ) : (
            results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-[var(--pink-soft)]"
                  onClick={() => {
                    onChange(s);
                    setQuery(s.name);
                    setOpen(false);
                  }}
                >
                  <span className="text-sm font-medium text-[var(--ink)]">
                    {s.name}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    อ.{s.district}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
