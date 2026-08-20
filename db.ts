import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";

export type FD = {
  id: number;
  profile_name: string;
  bank: string;
  fd_number: string;
  amount: number;
  interest: number;
  maturity_date: string; // YYYY-MM-DD
  maturity_amount: number;
  net_maturity: number;
  calendar_event_id: string | null;
};

export type InsurancePolicy = {
  id: number;
  profile_name: string;
  company: string;
  policy_number: string;
  policy_type: string;
  insured_name: string;
  premium_amount: number;
  premium_frequency: string;
  next_premium_date: string; // YYYY-MM-DD
  calendar_event_id: string | null;
};

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync("vault.db");
  }
  return dbInstance;
}

export function initDb(): void {
  const db = getDb();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS fds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_name TEXT NOT NULL DEFAULT 'Family',
      bank TEXT NOT NULL,
      fd_number TEXT,
      amount REAL NOT NULL DEFAULT 0,
      interest REAL NOT NULL DEFAULT 0,
      maturity_date TEXT NOT NULL,
      maturity_amount REAL NOT NULL DEFAULT 0,
      net_maturity REAL NOT NULL DEFAULT 0,
      calendar_event_id TEXT
    );
    CREATE TABLE IF NOT EXISTS insurance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_name TEXT NOT NULL DEFAULT 'Family',
      company TEXT NOT NULL,
      policy_number TEXT,
      policy_type TEXT,
      insured_name TEXT,
      premium_amount REAL NOT NULL DEFAULT 0,
      premium_frequency TEXT,
      next_premium_date TEXT NOT NULL,
      calendar_event_id TEXT
    );
  `);
}

export function addFD(fd: Omit<FD, "id" | "calendar_event_id">): number {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO fds (profile_name, bank, fd_number, amount, interest, maturity_date, maturity_amount, net_maturity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [fd.profile_name, fd.bank, fd.fd_number, fd.amount, fd.interest, fd.maturity_date, fd.maturity_amount, fd.net_maturity]
  );
  return result.lastInsertRowId;
}

export function listFDs(): FD[] {
  return getDb().getAllSync<FD>("SELECT * FROM fds ORDER BY maturity_date ASC");
}

export function updateFDCalendarEventId(id: number, eventId: string): void {
  getDb().runSync("UPDATE fds SET calendar_event_id = ? WHERE id = ?", [eventId, id]);
}

export function addInsurance(policy: Omit<InsurancePolicy, "id" | "calendar_event_id">): number {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO insurance (profile_name, company, policy_number, policy_type, insured_name, premium_amount, premium_frequency, next_premium_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      policy.profile_name,
      policy.company,
      policy.policy_number,
      policy.policy_type,
      policy.insured_name,
      policy.premium_amount,
      policy.premium_frequency,
      policy.next_premium_date,
    ]
  );
  return result.lastInsertRowId;
}

export function listInsurance(): InsurancePolicy[] {
  return getDb().getAllSync<InsurancePolicy>("SELECT * FROM insurance ORDER BY next_premium_date ASC");
}

export function updateInsuranceCalendarEventId(id: number, eventId: string): void {
  getDb().runSync("UPDATE insurance SET calendar_event_id = ? WHERE id = ?", [eventId, id]);
}

/** Reads the raw .db file bytes for backup — mirrors sqlite3 .backup() in backup_service.py. */
export async function readDbFileBytes(): Promise<Uint8Array> {
  const dbUri = `${FileSystem.documentDirectory}SQLite/vault.db`;
  const b64 = await FileSystem.readAsStringAsync(dbUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
