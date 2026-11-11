import { getSheetId, getSheetsClient } from "@/lib/google/auth";

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
}
