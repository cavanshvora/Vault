import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { initDb } from "./src/db";
import { useGoogleAuth } from "./src/googleAuth";
import ConnectScreen from "./src/screens/ConnectScreen";
import SyncScreen from "./src/screens/SyncScreen";
import BackupScreen from "./src/screens/BackupScreen";

type Tab = "connect" | "sync" | "backup";

export default function App() {
  const [tab, setTab] = useState<Tab>("connect");
  const [ready, setReady] = useState(false);
  const auth = useGoogleAuth();

  useEffect(() => {
    initDb();
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VAULT</Text>
        <Text style={styles.headerSub}>Google sync \u00b7 MVP</Text>
      </View>

      <View style={styles.body}>
        {tab === "connect" && <ConnectScreen auth={auth} />}
        {tab === "sync" && <SyncScreen auth={auth} />}
        {tab === "backup" && <BackupScreen auth={auth} />}
      </View>

      <View style={styles.tabBar}>
        <TabButton label="Connect" active={tab === "connect"} onPress={() => setTab("connect")} />
        <TabButton label="FDs & Sync" active={tab === "sync"} onPress={() => setTab("sync")} />
        <TabButton label="Backup" active={tab === "backup"} onPress={() => setTab("backup")} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#1a2233" },
  headerSub: { fontSize: 12, color: "#8a90a0" },
  body: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eceff3",
    paddingVertical: 10,
    paddingBottom: 16,
  },
  tabButton: { flex: 1, alignItems: "center" },
  tabButtonText: { fontSize: 13, color: "#8a90a0", fontWeight: "600" },
  tabButtonTextActive: { color: "#2454ff" },
});
