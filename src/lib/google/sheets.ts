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
  totalQty: number;
  totalAmount: number;
  sizes: Record<string, number>;
  paymentStatus: PaymentStatus;
  paymentNote: string;
  updatedAt: string;
  registrationCount: number;
};

async function ensureHeaderRow() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A1:O1",
  });
  const first = res.data.values?.[0]?.[0];
  if (first === HEADERS[0]) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "A1:O1",
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
    range: "A:O",
    valueInputOption: "USER_ENTERED",
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
      range: "A2:O",
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
    totalQty: number;
    sizes: Record<string, number>;
    registrationIds: Set<string>;
  };

  const bySchool = new Map<string, Acc>();

  for (const row of ordersRes.data.values ?? []) {
    const schoolName = String(row[2] || "").trim();
    const schoolId = String(row[3] || "").trim() || schoolName;
    const registrationId = String(row[1] || "");
    const size = String(row[8] || "").trim();
    if (!schoolName || !size) continue;

    let acc = bySchool.get(schoolId);
    if (!acc) {
      acc = {
        schoolId,
        schoolName,
        totalQty: 0,
        sizes: {},
        registrationIds: new Set(),
      };
      bySchool.set(schoolId, acc);
    }
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
