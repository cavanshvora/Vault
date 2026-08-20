import { DRIVE_BACKUP_FOLDER_NAME } from "./config";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export type DriveBackupFile = {
  id: string;
  name: string;
  createdTime: string;
  size: string;
};

async function getOrCreateFolder(accessToken: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${DRIVE_BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const listRes = await fetch(`${DRIVE_API}/files?q=${q}&fields=files(id,name)`, {
    headers: authHeaders(accessToken),
  });
  const listJson = await listRes.json();
  if (listJson.files?.length) return listJson.files[0].id;

  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: DRIVE_BACKUP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  const createJson = await createRes.json();
  return createJson.id;
}

/** Uploads an encrypted backup blob (Uint8Array) as a new file, or overwrites one with the same name. */
export async function uploadBackup(
  accessToken: string,
  fileName: string,
  bytes: Uint8Array
): Promise<{ id: string; name: string }> {
  const folderId = await getOrCreateFolder(accessToken);

  const q = encodeURIComponent(`name='${fileName}' and '${folderId}' in parents and trashed=false`);
  const listRes = await fetch(`${DRIVE_API}/files?q=${q}&fields=files(id,name)`, {
    headers: authHeaders(accessToken),
  });
  const listJson = await listRes.json();
  const existingId: string | undefined = listJson.files?.[0]?.id;

  const boundary = "vault-backup-boundary";
  const metadata = existingId
    ? {}
    : { name: fileName, parents: [folderId] };
  const bodyParts = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
  ];
  const tail = `\r\n--${boundary}--`;

  const bodyBytes = concatBytes([
    new TextEncoder().encode(bodyParts[0]),
    new TextEncoder().encode(bodyParts[1]),
    bytes,
    new TextEncoder().encode(tail),
  ]);

  const url = existingId
    ? `${DRIVE_UPLOAD_API}/files/${existingId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_API}/files?uploadType=multipart`;

  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: bodyBytes as unknown as BodyInit,
  });
  if (!res.ok) {
    throw new Error(`Drive upload failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function listBackups(accessToken: string): Promise<DriveBackupFile[]> {
  const folderId = await getOrCreateFolder(accessToken);
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await fetch(
    `${DRIVE_API}/files?q=${q}&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`,
    { headers: authHeaders(accessToken) }
  );
  const json = await res.json();
  return json.files ?? [];
}

export async function downloadBackup(accessToken: string, fileId: string): Promise<Uint8Array> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    throw new Error(`Drive download failed: ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
