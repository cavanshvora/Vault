// -----------------------------------------------------------------------
// Fill these in after creating OAuth clients in Google Cloud Console.
// See README.md -> "Google Cloud Console setup" for exact steps.
// -----------------------------------------------------------------------
export const GOOGLE_ANDROID_CLIENT_ID = "1043547753947-eefejglnbji3parmhue1bqiigekr9mu0.apps.googleusercontent.com";

// Same scopes the desktop app (VAULT F15) requests, so a token issued here
// behaves identically against Drive/Calendar.
export const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar",
];

export const DRIVE_BACKUP_FOLDER_NAME = "VAULT Backups";

// Binary backup format — MUST match backup_service.py exactly so backups
// made on phone/desktop are interchangeable.
export const BACKUP_MAGIC = "VAULT256"; // 8 bytes, ASCII
export const BACKUP_VERSION = 0x01;
export const SALT_SIZE = 16;
export const NONCE_SIZE = 12;
export const PBKDF2_ITERATIONS = 600_000;
