import { Readable } from "stream";
import {
  getDriveClient,
  getSlipFolderId,
  hasDriveUserOAuth,
} from "@/lib/google/auth";

function safeFileName(base: string, originalName: string): string {
  const ext = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf("."))
    : "";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w\u0E00-\u0E7F.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return `${Date.now()}_${cleaned || "slip"}${ext}`;
}

export async function uploadSlip(params: {
  registrationId: string;
  schoolName: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ fileId: string; fileUrl: string; fileName: string }> {
  if (!hasDriveUserOAuth()) {
    throw new Error(
      "อัปโหลดสลิปยังใช้ไม่ได้: ตั้งค่า GOOGLE_DRIVE_OAUTH_* ด้วยบัญชี academic@dontanwit.ac.th",
    );
  }

  const drive = getDriveClient();
  const folderId = getSlipFolderId();
  const name = safeFileName(
    `${params.registrationId}_${params.schoolName}`,
    params.fileName,
  );

  let res;
  try {
    res = await drive.files.create({
      requestBody: {
        name,
        parents: [folderId],
      },
      media: {
        mimeType: params.mimeType,
        body: Readable.from(params.buffer),
      },
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/storage quota|Service Accounts do not have storage/i.test(msg)) {
      throw new Error(
        "อัปโหลดสลิปไม่สำเร็จเพราะโควต้า Drive — ตรวจ Drive OAuth ของ academic@dontanwit.ac.th",
      );
    }
    throw err;
  }

  const fileId = res.data.id;
  if (!fileId) throw new Error("อัปโหลดสลิปไม่สำเร็จ");

  // เปิดAnyone with the link (reader) ให้แอดมินเปิดดูสลิปได้โดยไม่ต้อง login Google
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
        allowFileDiscovery: false,
      },
      sendNotificationEmail: false,
      supportsAllDrives: true,
    });
  } catch (err) {
    console.error("[drive] share anyone failed", err);
  }

  return {
    fileId,
    fileName: res.data.name || name,
    fileUrl: `https://drive.google.com/file/d/${fileId}/view`,
  };
}
