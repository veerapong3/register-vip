import { getSheetId, getSheetsClient } from "@/lib/google/auth";
import { BASE_PRICE, SHIRT_SIZES } from "@/lib/sizes";

const HEADERS = [
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
  "รอบอก (นิ้ว)",
  "ราคา (บาท)",
  "จำนวนตัวในรายการ",
  "ยอดรวมทั้งรายการ (บาท)",
  "ลิงก์สลิป",
  "หมายเหตุ",
] as const;

const PAYMENT_HEADERS = [
  "รหัสโรงเรียน",
  "โรงเรียน",
  "สถานะชำระเงิน",
  "หมายเหตุแอดมิน",
  "อัปเดตล่าสุด",
] as const;

export type PaymentStatus = "รอตรวจสอบ" | "ชำระแล้ว" | "ไม่ครบ/มีปัญหา";

export type SheetPersonRow = {
  timestamp: string;
  registrationId: string;
  schoolName: string;
  schoolId: string;
  contactName: string;
  contactPhone: string;
  index: number;
  personName: string;
  jerseyNumber: string;
  size: string;
  chestInches: string;
  price: number;
  quantity: number;
  totalAmount: number;
  slipUrl: string;
  note: string;
};

export type SchoolOrderSummary = {
  schoolId: string;
  schoolName: string;
  contactName: string;
  totalQty: number;
  totalAmount: number;
  sizes: Record<string, number>;
  paymentStatus: PaymentStatus;
  paymentNote: string;
  updatedAt: string;
  registrationCount: number;
};

export type AdminRegistration = {
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

export type AdminDashboard = {
  schools: SchoolOrderSummary[];
  registrations: AdminRegistration[];
  sizeTotals: Record<string, number>;
  totals: {
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
};

const SIZE_CODES = new Set(SHIRT_SIZES.map((s) => s.code));

/** รองรับชีตแบบเก่า (ไม่มีคอลัมน์เบอร์หลังเสื้อ) และแบบใหม่ */
function parsePersonFromRow(row: string[]) {
  const personName = String(row[7] || "").trim();
  const col8 = String(row[8] || "").trim();
  const col9 = String(row[9] || "").trim();
  const looksOld =
    SIZE_CODES.has(col8) && !SIZE_CODES.has(col9) && row.length <= 15;
  if (looksOld) {
    return {
      personName,
      jerseyNumber: "",
      size: col8,
      slipUrl: String(row[13] || ""),
      note: String(row[14] || ""),
    };
  }
  return {
    personName,
    jerseyNumber: col8,
    size: col9,
    slipUrl: String(row[14] || ""),
    note: String(row[15] || ""),
  };
}

async function ensureHeaderRow() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A1:P1",
  });
  const header = res.data.values?.[0] || [];
  const matches =
    header.length >= HEADERS.length &&
    HEADERS.every((h, i) => header[i] === h);
  if (matches) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "A1:P1",
    valueInputOption: "RAW",
    requestBody: { values: [[...HEADERS]] },
  });
}

async function ensurePaymentsSheet() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === "Payments",
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "Payments" } } }],
      },
    });
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Payments!A1:E1",
  });
  if (res.data.values?.[0]?.[0] === PAYMENT_HEADERS[0]) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Payments!A1:E1",
    valueInputOption: "RAW",
    requestBody: { values: [[...PAYMENT_HEADERS]] },
  });
}

export async function appendRegistrationRows(rows: SheetPersonRow[]) {
  await ensureHeaderRow();
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const values = rows.map((r) => [
    r.timestamp,
    r.registrationId,
    r.schoolName,
    r.schoolId,
    r.contactName,
    r.contactPhone,
    r.index,
    r.personName,
    r.jerseyNumber,
    r.size,
    r.chestInches,
    r.price,
    r.quantity,
    r.totalAmount,
    r.slipUrl,
    r.note,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A:P",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  // ensure payment row exists as pending
  if (rows[0]) {
    await ensureSchoolPaymentRow(rows[0].schoolId, rows[0].schoolName);
  }
}

async function ensureSchoolPaymentRow(schoolId: string, schoolName: string) {
  await ensurePaymentsSheet();
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Payments!A:E",
  });
  const rows = res.data.values ?? [];
  const found = rows.slice(1).find((r) => r[0] === schoolId);
  if (found) return;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Payments!A:E",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[schoolId, schoolName, "รอตรวจสอบ", "", ""]],
    },
  });
}

export async function getSchoolOrderSummaries(): Promise<SchoolOrderSummary[]> {
  await ensureHeaderRow();
  await ensurePaymentsSheet();
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const [ordersRes, payRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A2:P",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Payments!A2:E",
    }),
  ]);

  const paymentMap = new Map<
    string,
    { status: PaymentStatus; note: string; updatedAt: string; schoolName: string }
  >();
  for (const row of payRes.data.values ?? []) {
    const schoolId = String(row[0] || "");
    if (!schoolId) continue;
    paymentMap.set(schoolId, {
      schoolName: String(row[1] || ""),
      status: (String(row[2] || "รอตรวจสอบ") as PaymentStatus) || "รอตรวจสอบ",
      note: String(row[3] || ""),
      updatedAt: String(row[4] || ""),
    });
  }

  type Acc = {
    schoolId: string;
    schoolName: string;
    contactName: string;
    totalQty: number;
    sizes: Record<string, number>;
    registrationIds: Set<string>;
  };

  const bySchool = new Map<string, Acc>();

  for (const row of ordersRes.data.values ?? []) {
    const schoolName = String(row[2] || "").trim();
    const schoolId = String(row[3] || "").trim() || schoolName;
    const registrationId = String(row[1] || "");
    const contactName = String(row[4] || "").trim();
    const { size } = parsePersonFromRow(row);
    if (!schoolName || !size) continue;

    let acc = bySchool.get(schoolId);
    if (!acc) {
      acc = {
        schoolId,
        schoolName,
        contactName,
        totalQty: 0,
        sizes: {},
        registrationIds: new Set(),
      };
      bySchool.set(schoolId, acc);
    }
    if (!acc.contactName && contactName) acc.contactName = contactName;
    acc.totalQty += 1;
    acc.sizes[size] = (acc.sizes[size] || 0) + 1;
    if (registrationId) acc.registrationIds.add(registrationId);
  }

  const sizeOrder = SHIRT_SIZES.map((s) => s.code);

  return [...bySchool.values()]
    .map((acc) => {
      const pay = paymentMap.get(acc.schoolId);
      const orderedSizes: Record<string, number> = {};
      for (const code of sizeOrder) {
        if (acc.sizes[code]) orderedSizes[code] = acc.sizes[code];
      }
      for (const [code, qty] of Object.entries(acc.sizes)) {
        if (!(code in orderedSizes)) orderedSizes[code] = qty;
      }
      return {
        schoolId: acc.schoolId,
        schoolName: acc.schoolName,
        contactName: acc.contactName,
        totalQty: acc.totalQty,
        totalAmount: acc.totalQty * BASE_PRICE,
        sizes: orderedSizes,
        paymentStatus: pay?.status || "รอตรวจสอบ",
        paymentNote: pay?.note || "",
        updatedAt: pay?.updatedAt || "",
        registrationCount: acc.registrationIds.size,
      };
    })
    .sort((a, b) => a.schoolName.localeCompare(b.schoolName, "th"));
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const schools = await getSchoolOrderSummaries();
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();
  const ordersRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A2:P",
  });

  const byReg = new Map<string, AdminRegistration>();
  const sizeTotals: Record<string, number> = {};

  for (const row of ordersRes.data.values ?? []) {
    const timestamp = String(row[0] || "");
    const registrationId = String(row[1] || "").trim();
    const schoolName = String(row[2] || "").trim();
    const schoolId = String(row[3] || "").trim() || schoolName;
    const contactName = String(row[4] || "");
    const contactPhone = String(row[5] || "");
    const { personName, jerseyNumber, size, slipUrl, note } =
      parsePersonFromRow(row);
    if (!registrationId || !schoolName) continue;

    if (size) sizeTotals[size] = (sizeTotals[size] || 0) + 1;

    let reg = byReg.get(registrationId);
    if (!reg) {
      reg = {
        registrationId,
        timestamp,
        schoolId,
        schoolName,
        contactName,
        contactPhone,
        note,
        slipUrl,
        quantity: 0,
        totalAmount: 0,
        people: [],
      };
      byReg.set(registrationId, reg);
    }
    if (personName && size) {
      reg.people.push({ name: personName, jerseyNumber, size });
      reg.quantity += 1;
      reg.totalAmount = reg.quantity * BASE_PRICE;
    }
    if (!reg.slipUrl && slipUrl) reg.slipUrl = slipUrl;
  }

  const registrations = [...byReg.values()].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );

  const paidAmount = schools
    .filter((s) => s.paymentStatus === "ชำระแล้ว")
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const pendingAmount = schools
    .filter((s) => s.paymentStatus !== "ชำระแล้ว")
    .reduce((sum, s) => sum + s.totalAmount, 0);

  return {
    schools,
    registrations,
    sizeTotals,
    totals: {
      schools: schools.length,
      shirts: schools.reduce((s, x) => s + x.totalQty, 0),
      amount: schools.reduce((s, x) => s + x.totalAmount, 0),
      paidAmount,
      pendingAmount,
      paidSchools: schools.filter((s) => s.paymentStatus === "ชำระแล้ว").length,
      pendingSchools: schools.filter((s) => s.paymentStatus === "รอตรวจสอบ")
        .length,
      issueSchools: schools.filter((s) => s.paymentStatus === "ไม่ครบ/มีปัญหา")
        .length,
      registrations: registrations.length,
    },
  };
}

export type RegistrationPersonUpdate = {
  name: string;
  jerseyNumber: string;
  size: string;
};

export type RegistrationUpdateInput = {
  registrationId: string;
  schoolId: string;
  schoolName: string;
  contactName: string;
  contactPhone: string;
  note: string;
  people: RegistrationPersonUpdate[];
};

/** อัปเดตรายการจองทั้งชุดตามรหัสลงทะเบียน (แก้ผู้ประสานงาน / รายชื่อ / ไซส์ / เบอร์เสื้อ) */
export async function updateRegistration(
  input: RegistrationUpdateInput,
): Promise<AdminRegistration> {
  await ensureHeaderRow();
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A2:P",
  });
  const rows = res.data.values ?? [];
  const matches: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i]?.[1] || "").trim() === input.registrationId) {
      matches.push(i);
    }
  }
  if (matches.length === 0) {
    throw new Error("ไม่พบรหัสลงทะเบียนนี้");
  }

  const first = rows[matches[0]] || [];
  const timestamp = String(first[0] || "");
  const { slipUrl } = parsePersonFromRow(first);
  const quantity = input.people.length;
  const totalAmount = quantity * BASE_PRICE;

  const built = input.people.map((p, idx) => {
    const sizeMeta = SHIRT_SIZES.find((s) => s.code === p.size);
    const chest =
      sizeMeta?.chestInches != null ? String(sizeMeta.chestInches) : "";
    return [
      timestamp,
      input.registrationId,
      input.schoolName,
      input.schoolId,
      input.contactName,
      input.contactPhone,
      idx + 1,
      p.name,
      p.jerseyNumber,
      p.size,
      chest,
      BASE_PRICE,
      quantity,
      totalAmount,
      slipUrl,
      input.note,
    ];
  });

  const updateCount = Math.min(matches.length, built.length);
  if (updateCount > 0) {
    const data = built.slice(0, updateCount).map((values, i) => {
      const sheetRow = matches[i] + 2; // A2 = index 0
      return {
        range: `A${sheetRow}:P${sheetRow}`,
        values: [values],
      };
    });
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data,
      },
    });
  }

  if (built.length > matches.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "A:P",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: built.slice(matches.length) },
    });
  } else if (matches.length > built.length) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = meta.data.sheets?.[0]?.properties?.sheetId;
    if (sheetId == null) {
      throw new Error("ไม่พบชีตหลักสำหรับลบแถว");
    }
    // ลบจากล่างขึ้นบน เพื่อไม่ให้ index เพี้ยน (sheet row = index+2, 0-based start/end)
    const toDelete = matches.slice(built.length).sort((a, b) => b - a);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: toDelete.map((rowIndex) => ({
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex + 1, // +1 เพราะมี header ที่แถว 0
              endIndex: rowIndex + 2,
            },
          },
        })),
      },
    });
  }

  await ensureSchoolPaymentRow(input.schoolId, input.schoolName);

  return {
    registrationId: input.registrationId,
    timestamp,
    schoolId: input.schoolId,
    schoolName: input.schoolName,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    note: input.note,
    slipUrl,
    quantity,
    totalAmount,
    people: input.people.map((p) => ({
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      size: p.size,
    })),
  };
}

export async function updateSchoolPaymentStatus(params: {
  schoolId: string;
  schoolName: string;
  status: PaymentStatus;
  note?: string;
}) {
  await ensurePaymentsSheet();
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Payments!A:E",
  });
  const rows = res.data.values ?? [];
  const now = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(" ", "T");

  const idx = rows.findIndex(
    (r, i) => i > 0 && String(r[0] || "") === params.schoolId,
  );
  const value = [
    params.schoolId,
    params.schoolName,
    params.status,
    params.note || "",
    now,
  ];

  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Payments!A:E",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [value] },
    });
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Payments!A${idx + 1}:E${idx + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [value] },
  });
}
