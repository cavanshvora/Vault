import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { GoogleAuthState } from "../googleAuth";

export default function ConnectScreen({ auth }: { auth: GoogleAuthState }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Account</Text>
      <Text style={styles.subtitle}>
        Connect to enable encrypted Drive backups and Calendar reminders for FD
        maturities and insurance premiums.
      </Text>

      {auth.accessToken ? (
        <>
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>Connected \u2014 token active</Text>
          </View>
          <Pressable style={styles.buttonSecondary} onPress={auth.disconnect}>
            <Text style={styles.buttonSecondaryText}>Disconnect</Text>
          </Pressable>
        </>
      ) : (
        <Pressable style={styles.button} onPress={auth.connect} disabled={auth.isConnecting}>
          {auth.isConnecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect Google Account</Text>
          )}
        </Pressable>
      )}

      {auth.error ? <Text style={styles.error}>{auth.error}</Text> : null}

      <Text style={styles.note}>
        Note: tokens last about an hour in this MVP build. Re-tap Connect if a
        backup or sync fails with an auth error.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 14 },
  title: { fontSize: 22, fontWeight: "700", color: "#1a2233" },
  subtitle: { fontSize: 14, color: "#5b6472", lineHeight: 20 },
  button: {
    backgroundColor: "#2454ff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: "#d8dce4",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonSecondaryText: { color: "#1a2233", fontWeight: "600" },
  statusBox: {
    backgroundColor: "#e7f6ec",
    padding: 12,
    borderRadius: 10,
  },
  statusText: { color: "#1e7a3d", fontWeight: "600" },
  error: { color: "#c0392b" },
  note: { fontSize: 12, color: "#8a90a0", marginTop: 8 },
});
