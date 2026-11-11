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
      <label className="field-label">โรงเรียนใน สพม.มุกดาหาร</label>
      <input
        type="text"
        value={open ? query : (value?.name ?? query)}
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
        className="field field-solid"
        required={!value}
      />
      {open && (
        <ul className="school-menu">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--muted)]">ไม่พบโรงเรียน</li>
          ) : (
            results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setQuery(s.name);
                    setOpen(false);
                  }}
                >
                  <span className="block text-sm font-medium">{s.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
