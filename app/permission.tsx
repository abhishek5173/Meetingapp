import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";

export default function BgLogsScreen() {
  const [logs, setLogs] = useState<string>("");

  const loadLogs = async () => {
    const savedLogs = (await AsyncStorage.getItem("bgLogs")) || "";
    setLogs(savedLogs);
  };

  const clearLogs = async () => {
    await AsyncStorage.removeItem("bgLogs");
    setLogs("");
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Button title="Refresh Logs" onPress={loadLogs} />
      <Button title="Clear Logs" onPress={clearLogs} />
      <ScrollView style={{ marginTop: 10 }}>
        <Text>{logs || "No logs yet"}</Text>
      </ScrollView>
    </View>
  );
}
