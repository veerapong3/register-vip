"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SCHOOLS, filterSchools, type School } from "@/lib/schools";

type Props = {
  value: School | null;
  onChange: (school: School | null) => void;
};

export function SchoolSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => filterSchools(query), [query]);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  function openList(clearSearch = true) {
    setOpen(true);
    if (clearSearch) setQuery("");
  }

  function pick(school: School) {
    onChange(school);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="school-select">
      <label className="field-label" htmlFor="school-search">
        โรงเรียนใน สพม.มุกดาหาร ({SCHOOLS.length} โรง)
      </label>

      <div className="school-select-row">
        <input
          id="school-search"
          ref={inputRef}
          type="text"
          value={open ? query : (value?.name ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          onFocus={() => openList(true)}
          onClick={() => openList(true)}
          placeholder="กดเพื่อเลือกรายชื่อ หรือพิมพ์ค้นหา..."
          autoComplete="off"
          className="field field-solid"
          required={!value}
          aria-expanded={open}
          aria-controls="school-list"
          role="combobox"
        />
        <button
          type="button"
          className="school-select-toggle"
          aria-label="เปิดรายชื่อโรงเรียน"
          onClick={() => {
            if (open) {
              setOpen(false);
            } else {
              openList(true);
              inputRef.current?.focus();
            }
          }}
        >
          {open ? "▲" : "▼"}
        </button>
      </div>

      {value && !open && (
        <p className="school-selected-hint">เลือกแล้ว: {value.name}</p>
      )}

      {open && (
        <div className="school-menu" id="school-list" role="listbox">
          <div className="school-menu-head">
            แสดง {results.length} จาก {SCHOOLS.length} โรงเรียน
            {query ? " · กรองจากคำค้น" : " · เลื่อนดูได้ทั้งหมด"}
          </div>
          {results.length === 0 ? (
            <p className="school-menu-empty">ไม่พบโรงเรียน</p>
          ) : (
            <ul className="school-menu-list">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value?.id === s.id}
                    className={value?.id === s.id ? "is-selected" : undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(s)}
                  >
                    <span className="block text-sm font-medium">{s.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* สำรอง: select เนทีฟ เผื่อกรณีที่ต้องการเลือกจากรายการระบบ */}
      <label className="school-native-wrap">
        <span className="field-label">หรือเลือกจากรายการ</span>
        <select
          className="field field-solid school-native"
          value={value?.id ?? ""}
          onChange={(e) => {
            const school = SCHOOLS.find((s) => s.id === e.target.value) || null;
            onChange(school);
            setQuery("");
            setOpen(false);
          }}
          required={!value}
        >
          <option value="" disabled>
            — เลือกโรงเรียน (ครบ {SCHOOLS.length} โรง) —
          </option>
          {SCHOOLS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
