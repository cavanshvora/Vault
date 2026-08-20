import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import { readDbFileBytes } from "../db";
import { buildBackupZip, extractBackupZip } from "../zip";
import { encryptPayload, decryptPayload } from "../crypto";
import { uploadBackup, listBackups, downloadBackup, DriveBackupFile } from "../driveService";
import { GoogleAuthState } from "../googleAuth";

const DOCUMENTS_DIR = `${FileSystem.documentDirectory}documents`;

export default function BackupScreen({ auth }: { auth: GoogleAuthState }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [backups, setBackups] = useState<DriveBackupFile[]>([]);

  const requireAuth = (): string | null => {
    if (!auth.accessToken) {
      Alert.alert("Not connected", "Connect your Google account first.");
      return null;
    }
    return auth.accessToken;
  };

  const requirePassword = (): string | null => {
    if (!password || password.length < 6) {
      Alert.alert("Password required", "Enter a backup password (6+ characters). You'll need it to restore.");
      return null;
    }
    return password;
  };

  const handleBackupNow = async () => {
    const token = requireAuth();
    const pw = requirePassword();
    if (!token || !pw) return;

    setBusy("backup");
    try {
      await FileSystem.makeDirectoryAsync(DOCUMENTS_DIR, { intermediates: true }).catch(() => {});
      const dbBytes = await readDbFileBytes();
      const zipBytes = await buildBackupZip(dbBytes, DOCUMENTS_DIR);
      const encrypted = encryptPayload(zipBytes, pw);
      const fileName = `vault_backup_${new Date().toISOString().slice(0, 10)}.vaultbak`;
      await uploadBackup(token, fileName, encrypted);
      Alert.alert("Backup complete", `Uploaded ${fileName} to "VAULT Backups" in Drive.`);
      await handleRefreshList();
    } catch (e: any) {
      Alert.alert("Backup failed", e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleRefreshList = async () => {
    const token = requireAuth();
    if (!token) return;
    setBusy("list");
    try {
      const files = await listBackups(token);
      setBackups(files);
    } catch (e: any) {
      Alert.alert("Couldn't list backups", e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (file: DriveBackupFile) => {
    const token = requireAuth();
    const pw = requirePassword();
    if (!token || !pw) return;

    setBusy(`restore-${file.id}`);
    try {
      const encrypted = await downloadBackup(token, file.id);
      const zipBytes = decryptPayload(encrypted, pw);
      const { documents } = extractBackupZip(zipBytes);
      Alert.alert(
        "Restore ready",
        `Decrypted "${file.name}" successfully (${Object.keys(documents).length} document file(s) inside). ` +
          `Full DB restore-in-place is the next build step \u2014 for now this confirms the backup and password are valid.`
      );
    } catch (e: any) {
      Alert.alert("Restore failed", e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={styles.title}>Encrypted Drive Backup</Text>
      <Text style={styles.subtitle}>
        Same AES-256-GCM format as the desktop app \u2014 a backup made here can be restored by
        VAULT on desktop, and vice versa.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Backup password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.button} onPress={handleBackupNow} disabled={busy === "backup"}>
        <Text style={styles.buttonText}>{busy === "backup" ? "Backing up\u2026" : "Backup now"}</Text>
      </Pressable>

      <Pressable style={styles.buttonSecondary} onPress={handleRefreshList} disabled={busy === "list"}>
        <Text style={styles.buttonSecondaryText}>{busy === "list" ? "Loading\u2026" : "Refresh backup list"}</Text>
      </Pressable>

      {backups.map((f) => (
        <View style={styles.row} key={f.id}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{f.name}</Text>
            <Text style={styles.rowSub}>{f.createdTime?.slice(0, 10)}</Text>
          </View>
          <Pressable
            style={styles.restoreButton}
            onPress={() => handleRestore(f)}
            disabled={busy === `restore-${f.id}`}
          >
            <Text style={styles.restoreButtonText}>
              {busy === `restore-${f.id}` ? "\u2026" : "Restore"}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700", color: "#1a2233" },
  subtitle: { fontSize: 13, color: "#5b6472", lineHeight: 18 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d8dce4",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: { backgroundColor: "#2454ff", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: "#d8dce4",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonSecondaryText: { color: "#1a2233", fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eceff3",
    padding: 12,
  },
  rowTitle: { fontWeight: "600", color: "#1a2233" },
  rowSub: { fontSize: 12, color: "#8a90a0", marginTop: 2 },
  restoreButton: { backgroundColor: "#1a2233", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  restoreButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
