"use client";

import { SCHOOLS, type School } from "@/lib/schools";

type Props = {
  value: School | null;
  onChange: (school: School | null) => void;
};

export function SchoolSelect({ value, onChange }: Props) {
  return (
    <div className="school-select">
      <label className="field-label" htmlFor="school-select">
        โรงเรียน / หน่วยงาน ({SCHOOLS.length} รายการ)
      </label>
      <select
        id="school-select"
        className="field field-solid school-native"
        value={value?.id ?? ""}
        onChange={(e) => {
          const school = SCHOOLS.find((s) => s.id === e.target.value) || null;
          onChange(school);
        }}
        required
      >
        <option value="" disabled>
          — เลือกโรงเรียน —
        </option>
        {SCHOOLS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
