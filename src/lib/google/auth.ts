import { google } from "googleapis";

export function getServiceAccountAuth(scopes?: string[]) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY are required",
    );
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: scopes ?? [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

export function getSheetsClient() {
  return google.sheets({
    version: "v4",
    auth: getServiceAccountAuth([
      "https://www.googleapis.com/auth/spreadsheets",
    ]),
  });
}

export function hasDriveUserOAuth() {
  return Boolean(
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN?.trim(),
  );
}

export function getDriveUserAuth() {
  const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า Drive OAuth (GOOGLE_DRIVE_OAUTH_*) — ใช้บัญชี academic@dontanwit.ac.th",
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

export function getDriveClient() {
  if (hasDriveUserOAuth()) {
    return google.drive({ version: "v3", auth: getDriveUserAuth() });
  }
  return google.drive({
    version: "v3",
    auth: getServiceAccountAuth(["https://www.googleapis.com/auth/drive"]),
  });
}

export function getSheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID is not set");
  return id;
}

export function getSlipFolderId() {
  const id = process.env.GOOGLE_DRIVE_SLIP_FOLDER_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_SLIP_FOLDER_ID is not set");
  return id;
}
