import { zipSync, unzipSync, Zippable } from "fflate";
import * as FileSystem from "expo-file-system";

/**
 * Builds the same payload.zip layout as backup_service.py:
 *   vault_database.db
 *   documents/...
 *   qr_labels/...   (mobile has no QR labels yet, folder stays empty/omitted)
 */
export async function buildBackupZip(
  dbBytes: Uint8Array,
  documentsDirUri: string
): Promise<Uint8Array> {
  const files: Zippable = {
    "vault_database.db": dbBytes,
  };

  const dirInfo = await FileSystem.getInfoAsync(documentsDirUri);
  if (dirInfo.exists && dirInfo.isDirectory) {
    const entries = await FileSystem.readDirectoryAsync(documentsDirUri);
    for (const name of entries) {
      const fileUri = `${documentsDirUri}/${name}`;
      const b64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      files[`documents/${name}`] = base64ToBytes(b64);
    }
  }

  return zipSync(files, { level: 6 });
}

/** Extracts a restored payload.zip; returns the db bytes plus a map of document files. */
export function extractBackupZip(zipBytes: Uint8Array): {
  dbBytes: Uint8Array;
  documents: Record<string, Uint8Array>;
} {
  const unzipped = unzipSync(zipBytes);
  const dbBytes = unzipped["vault_database.db"];
  if (!dbBytes) {
    throw new Error("Backup archive is missing vault_database.db");
  }
  const documents: Record<string, Uint8Array> = {};
  for (const [path, bytes] of Object.entries(unzipped)) {
    if (path.startsWith("documents/") && !path.endsWith("/")) {
      documents[path.slice("documents/".length)] = bytes;
    }
  }
  return { dbBytes, documents };
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = globalThis.atob
    ? globalThis.atob(b64)
    : Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
