import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import {
  FD,
  InsurancePolicy,
  addFD,
  listFDs,
  updateFDCalendarEventId,
  addInsurance,
  listInsurance,
  updateInsuranceCalendarEventId,
} from "../db";
import { createOrUpdateMaturityEvent, createOrUpdateInsuranceEvent } from "../calendarService";
import { GoogleAuthState } from "../googleAuth";

export default function SyncScreen({ auth }: { auth: GoogleAuthState }) {
  const [fds, setFds] = useState<FD[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [bank, setBank] = useState("");
  const [amount, setAmount] = useState("");
  const [maturityDate, setMaturityDate] = useState("");

  const refresh = useCallback(() => {
    setFds(listFDs());
    setPolicies(listInsurance());
  }, []);

  React.useEffect(refresh, [refresh]);

  const handleAddFD = () => {
    if (!bank || !amount || !maturityDate) {
      Alert.alert("Missing info", "Bank, amount and maturity date (YYYY-MM-DD) are required.");
      return;
    }
    const amt = parseFloat(amount);
    addFD({
      profile_name: "Family",
      bank,
      fd_number: "",
      amount: amt,
      interest: 7,
      maturity_date: maturityDate,
      maturity_amount: amt * 1.07,
      net_maturity: amt * 1.06,
    });
    setBank("");
    setAmount("");
    setMaturityDate("");
    refresh();
  };

  const syncFD = async (fd: FD) => {
    if (!auth.accessToken) {
      Alert.alert("Not connected", "Connect your Google account first.");
      return;
    }
    setSyncingId(`fd-${fd.id}`);
    try {
      const eventId = await createOrUpdateMaturityEvent(auth.accessToken, fd);
      updateFDCalendarEventId(fd.id, eventId);
      refresh();
    } catch (e: any) {
      Alert.alert("Sync failed", e?.message ?? String(e));
    } finally {
      setSyncingId(null);
    }
  };

  const syncPolicy = async (policy: InsurancePolicy) => {
    if (!auth.accessToken) {
      Alert.alert("Not connected", "Connect your Google account first.");
      return;
    }
    setSyncingId(`ins-${policy.id}`);
    try {
      const eventId = await createOrUpdateInsuranceEvent(auth.accessToken, policy);
      updateInsuranceCalendarEventId(policy.id, eventId);
      refresh();
    } catch (e: any) {
      Alert.alert("Sync failed", e?.message ?? String(e));
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={styles.title}>Fixed Deposits</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Add FD</Text>
        <TextInput style={styles.input} placeholder="Bank" value={bank} onChangeText={setBank} />
        <TextInput
          style={styles.input}
          placeholder="Amount"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Maturity date (YYYY-MM-DD)"
          value={maturityDate}
          onChangeText={setMaturityDate}
        />
        <Pressable style={styles.addButton} onPress={handleAddFD}>
          <Text style={styles.addButtonText}>Add FD</Text>
        </Pressable>
      </View>

      {fds.map((fd) => (
        <View style={styles.row} key={fd.id}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{fd.bank}</Text>
            <Text style={styles.rowSub}>
              Matures {fd.maturity_date} \u00b7 {fd.calendar_event_id ? "synced" : "not synced"}
            </Text>
          </View>
          <Pressable
            style={styles.syncButton}
            onPress={() => syncFD(fd)}
            disabled={syncingId === `fd-${fd.id}`}
          >
            <Text style={styles.syncButtonText}>
              {syncingId === `fd-${fd.id}` ? "\u2026" : fd.calendar_event_id ? "Re-sync" : "Sync"}
            </Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.title}>Insurance</Text>
      {policies.length === 0 ? (
        <Text style={styles.rowSub}>No policies yet \u2014 add support for this in the next phase.</Text>
      ) : (
        policies.map((p) => (
          <View style={styles.row} key={p.id}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{p.company}</Text>
              <Text style={styles.rowSub}>
                Due {p.next_premium_date} \u00b7 {p.calendar_event_id ? "synced" : "not synced"}
              </Text>
            </View>
            <Pressable
              style={styles.syncButton}
              onPress={() => syncPolicy(p)}
              disabled={syncingId === `ins-${p.id}`}
            >
              <Text style={styles.syncButtonText}>
                {syncingId === `ins-${p.id}` ? "\u2026" : p.calendar_event_id ? "Re-sync" : "Sync"}
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700", color: "#1a2233" },
  card: { backgroundColor: "#f5f6f9", borderRadius: 12, padding: 14, gap: 8 },
  cardLabel: { fontWeight: "600", color: "#1a2233", marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d8dce4",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButton: {
    backgroundColor: "#1a2233",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
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
  syncButton: {
    backgroundColor: "#2454ff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  syncButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
