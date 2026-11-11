/**
 * Share Sheet + Slip folder with the Service Account using academic OAuth.
 * Run: node --env-file=.env.local scripts/setup-google.mjs
 */
import { google } from "googleapis";

const sheetId = process.env.GOOGLE_SHEET_ID;
const folderId = process.env.GOOGLE_DRIVE_SLIP_FOLDER_ID;
const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN;

if (!sheetId || !folderId || !saEmail || !clientId || !clientSecret || !refreshToken) {
  console.error("Missing env vars");
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
oauth2.setCredentials({ refresh_token: refreshToken });
const drive = google.drive({ version: "v3", auth: oauth2 });

async function share(fileId, role, label) {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: "user",
        role,
        emailAddress: saEmail,
      },
      sendNotificationEmail: false,
      supportsAllDrives: true,
    });
    console.log(`OK share ${label} → ${saEmail} (${role})`);
  } catch (err) {
    const msg = err?.message || String(err);
    if (/already|duplicate/i.test(msg)) {
      console.log(`Already shared ${label}`);
      return;
    }
    throw err;
  }
}

const sheetMeta = await drive.files.get({
  fileId: sheetId,
  fields: "id,name,mimeType",
  supportsAllDrives: true,
});
console.log("Sheet:", sheetMeta.data.name);

const folderMeta = await drive.files.get({
  fileId: folderId,
  fields: "id,name,mimeType",
  supportsAllDrives: true,
});
console.log("Folder:", folderMeta.data.name);

await share(sheetId, "writer", "sheet");
await share(folderId, "writer", "slip folder");

// Write header row via Sheets API with SA after share
const { google: g2 } = await import("googleapis");
const sa = new g2.auth.JWT({
  email: saEmail,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = g2.sheets({ version: "v4", auth: sa });
const headers = [
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
];
const existing = await sheets.spreadsheets.values.get({
  spreadsheetId: sheetId,
  range: "A1:O1",
});
if (existing.data.values?.[0]?.[0] !== headers[0]) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "A1:O1",
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
  console.log("Header row written");
} else {
  console.log("Header already present");
}

console.log("Setup complete");
