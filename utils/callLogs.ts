import { PermissionsAndroid } from "react-native";

export async function requestCallLogPermissions() {
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE, // recommended for full access
    ]);

    const readGranted =
      granted["android.permission.READ_CALL_LOG"] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (readGranted) {
      console.log("✅ Call Log permissions granted");
      return true;
    } else {
      console.warn("❌ Call Log permissions denied:", granted);
      return false;
    }
  } catch (error) {
    console.error("Error requesting Call Log permissions:", error);
    return false;
  }
}

export async function getCallLogsSafe() {
  try {
    // Dynamically import so it won’t break in Expo Go
    const CallLogs = require("react-native-call-log");
    if (!CallLogs?.loadAll) {
      console.warn("⚠️ Call Log module not available. Run via prebuild + run:android");
      return [];
    }

    const logs = await CallLogs.loadAll();
    console.log("📞 Sample Call Logs:", logs.slice(0, 5));
    return logs;
  } catch (error) {
    console.error("❌ Error fetching call logs:", error);
    return [];
  }
}