import { pbkdf2 } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";
import { gcm } from "@noble/ciphers/aes";
import * as Crypto from "expo-crypto";
import {
  BACKUP_MAGIC,
  BACKUP_VERSION,
  SALT_SIZE,
  NONCE_SIZE,
  PBKDF2_ITERATIONS,
} from "./config";

const MAGIC_BYTES = new TextEncoder().encode(BACKUP_MAGIC); // 8 bytes

function randomBytes(len: number): Uint8Array {
  return Crypto.getRandomBytes(len);
}

function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  return pbkdf2(sha256, new TextEncoder().encode(password), salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: 32,
  });
}

/**
 * Encrypts `data` with `password`, producing bytes identical in structure
 * to backup_service.py's encrypt_payload():
 *   MAGIC(8) + VERSION(1) + SALT(16) + NONCE(12) + CIPHERTEXT(includes GCM tag)
 */
export function encryptPayload(data: Uint8Array, password: string): Uint8Array {
  const salt = randomBytes(SALT_SIZE);
  const nonce = randomBytes(NONCE_SIZE);
  const key = deriveKey(password, salt);
  const ciphertext = gcm(key, nonce).encrypt(data);

  const out = new Uint8Array(
    MAGIC_BYTES.length + 1 + SALT_SIZE + NONCE_SIZE + ciphertext.length
  );
  let offset = 0;
  out.set(MAGIC_BYTES, offset);
  offset += MAGIC_BYTES.length;
  out[offset] = BACKUP_VERSION;
  offset += 1;
  out.set(salt, offset);
  offset += SALT_SIZE;
  out.set(nonce, offset);
  offset += NONCE_SIZE;
  out.set(ciphertext, offset);
  return out;
}

/** Reverses encryptPayload(). Throws if the password is wrong or file is corrupt. */
export function decryptPayload(blob: Uint8Array, password: string): Uint8Array {
  const magic = blob.slice(0, MAGIC_BYTES.length);
  for (let i = 0; i < MAGIC_BYTES.length; i++) {
    if (magic[i] !== MAGIC_BYTES[i]) {
      throw new Error("Not a VAULT backup file (bad magic header).");
    }
  }
  let offset = MAGIC_BYTES.length;
  const version = blob[offset];
  offset += 1;
  if (version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${version}`);
  }
  const salt = blob.slice(offset, offset + SALT_SIZE);
  offset += SALT_SIZE;
  const nonce = blob.slice(offset, offset + NONCE_SIZE);
  offset += NONCE_SIZE;
  const ciphertext = blob.slice(offset);

  const key = deriveKey(password, salt);
  try {
    return gcm(key, nonce).decrypt(ciphertext);
  } catch (e) {
    throw new Error("Wrong password, or backup file is corrupted.");
  }
}
