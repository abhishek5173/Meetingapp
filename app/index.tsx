import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuth } from "@/lib/AuthContext";
import { generateHeaders } from "@/lib/generateHeaders";
import auth from "@react-native-firebase/auth";
import axios from "axios";


type Meeting = {
  _id: string;
  title: string;
  description: string;
  appointment_taken_at: string;
  date: string;
  timestamp: string;
  firebase_user_id: string;
};

export default function HomeScreen() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      fetchmeetings();
    //  requestAllPermissions();
    }
  }, []);

  const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const FETCH_MEETINGS = `${baseURL}/meeting/get-all-meetings`;
  const DELETE_MEETING = `${baseURL}/meeting/delete-meeting`;

  // useEffect(() => {
  //   const headers = async () => {
  //     const token = await generateHeaders();
  //     console.log("Generated Token:", token["X-Auth-Token"]);
  //   };
  //   headers();
  // }, []);

  //

  const [meetings, setmeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!state.isConnected) {
        Alert.alert(
          "No Internet Connection",
          "Please connect to the internet to continue."
        );
      }
    });

    // Optionally check once on mount
    NetInfo.fetch().then((state) => {
      if (!state.isConnected) {
        Alert.alert(
          "No Internet Connection",
          "Please connect to the internet to continue."
        );
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchmeetings = async () => {
    try {
      const headers = await generateHeaders();
      const response = await axios.get(FETCH_MEETINGS, { headers });
    //  console.log("Meetings fetched:", response.data);
      setmeetings(response.data);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    try {
      const headers = await generateHeaders();

      await axios.delete(`${DELETE_MEETING}?meeting_id=${meetingId}`, {
        headers,
      });

      Toast.show({
        type: "success",
        text1: "Meeting deleted successfully!",
      });

      // Refresh meetings after deletion
      fetchmeetings();
    } catch (error) {
      console.error("Error deleting meeting:", error);
      Toast.show({
        type: "error",
        text1: "Failed to delete meeting",
        text2: "Please try again later",
      });
    }
  };

  const confirmDelete = (meetingId: string) => {
    Alert.alert(
      "Delete Meeting",
      "Are you sure you want to delete this meeting?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMeeting(meetingId),
        },
      ]
    );
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  function countMeetingsThisWeek(meetings: Meeting[]) {
    // meetings = array of objects like [{ date: "2025-10-28", title: "..." }, ...]

    const today = new Date();
    const next7 = new Date();
    next7.setDate(today.getDate() + 7);

    let count = 0;

    meetings.forEach((meeting) => {
      const meetingDate = new Date(meeting.date);

      // Compare date (ignore time)
      if (meetingDate >= today && meetingDate <= next7) {
        count++;
      }
    });

    return count;
  }

  const thisWeekCount = countMeetingsThisWeek(meetings);

  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-500">
      <LinearGradient
        colors={["#6b7280", "#f9fafb"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative background glow */}
        <View className="absolute top-20 right-0 w-72 h-72 bg-yellow-100/40 rounded-full blur-3xl" />
        <View className="absolute bottom-40 -left-20 w-80 h-80 bg-yellow-50/40 rounded-full blur-3xl" />

        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="px-6 pt-4 pb-6">
            <View className="flex-row justify-between items-start mb-8">
              <View>
                <Text className="text-white text-lg font-bold mb-1">
                  Good afternoon
                </Text>
                <Text className="text-neutral-900 text-xl font-bold tracking-tight">
                  Welcome to Royal Palace
                </Text>
              </View>
              <TouchableOpacity className="w-11 h-11  items-center justify-center ">
                <Ionicons
                  onPress={() => auth().signOut()}
                  name="log-out-outline"
                  size={30}
                  color="#dc2626"
                />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View className="flex-row gap-3">
              <View className="flex-1 bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-neutral-900 text-2xl font-bold">
                    {meetings.length}
                  </Text>
                  <View className="bg-yellow-100 rounded-full p-1.5">
                    <Ionicons name="calendar" size={14} color="#b8860b" />
                  </View>
                </View>
                <Text className="text-neutral-500 text-xs font-medium">
                  Total Meetings
                </Text>
              </View>

              <View className="flex-1 bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-neutral-900 text-2xl font-bold">
                    {thisWeekCount}
                  </Text>
                  <View className="bg-yellow-100 rounded-full p-1.5">
                    <Ionicons name="time" size={14} color="#b8860b" />
                  </View>
                </View>
                <Text className="text-neutral-500 text-xs font-medium">
                  This Week
                </Text>
              </View>
            </View>
          </View>

          {/* Meetings Section */}
          <View className="flex-1 bg-neutral-100 rounded-t-3xl pt-6 px-6 border-t border-neutral-200">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-neutral-900 text-xl font-bold">
                Upcoming
              </Text>
              {/* <TouchableOpacity className="flex-row items-center gap-1">
                <Text className="text-neutral-500 text-sm font-semibold">
                  View All
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#a3a3a3" />
              </TouchableOpacity> */}
            </View>

            {meetings.length > 0 ? (
              <FlatList
                data={meetings}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View className="bg-white rounded-2xl p-4 mb-3 border border-neutral-200 shadow-sm">
                    <View className="flex-row items-start justify-between">
                      <LinearGradient
                        colors={["#facc15", "#fde68a"]}
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4 mt-1"
                      >
                        <Ionicons name="calendar" size={22} color="#0a0a0a" />
                      </LinearGradient>

                      <View className="flex-1">
                        {/* Title */}
                        <Text className="text-neutral-900 text-base font-semibold mb-1.5">
                          {item.title}
                        </Text>

                        {/* Description (one line only) */}
                        <Text
                          className="text-neutral-500 text-sm mb-2"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.description}
                        </Text>

                        {/* Appointment details */}
                        <View className="flex-row items-center gap-x-2">
                          <View className="flex-row items-center bg-yellow-50 rounded-full px-2 py-0.5">
                            <Ionicons
                              name="calendar-outline"
                              size={10}
                              color="#b8860b"
                            />
                            <Text className="text-xs text-neutral-700 ml-1">
                              Date: {formatDate(item.date)}
                            </Text>
                          </View>

                          <View className="flex-row items-center bg-yellow-50 rounded-full px-2 py-0.5">
                            <Ionicons
                              name="time-outline"
                              size={10}
                              color="#b8860b"
                            />
                            <Text className="text-xs text-neutral-700 ml-1">
                              Taken At: {formatTime(item.appointment_taken_at)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Right icon */}
                      <TouchableOpacity
                        onPress={() => confirmDelete(item._id)}
                        activeOpacity={0.7}
                        style={{
                          width: 32,
                          height: 32,
                          backgroundColor: "#fee2e2", // red-100
                          borderRadius: 9999,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#dc2626"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            ) : (
              <View className="flex-1 items-center justify-center py-16">
                <View className="w-24 h-24 bg-neutral-200 rounded-full items-center justify-center mb-5 border border-neutral-300">
                  <Ionicons name="calendar-outline" size={40} color="#9ca3af" />
                </View>
                <Text className="text-neutral-800 text-lg font-semibold mb-2">
                  No meetings yet
                </Text>
                <Text className="text-neutral-500 text-sm text-center px-8">
                  Schedule your first meeting to get started
                </Text>
              </View>
            )}
          </View>

          {/* Schedule Button */}
          <View className="px-6 py-5 bg-white border-t border-neutral-200">
            <TouchableOpacity
              onPress={() => {
                router.push("/schedule" as any);
              }}
              className="rounded-lg"
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#facc15", "#eab308"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl py-4 flex-row items-center justify-center shadow-sm"
              >
                <Ionicons name="add-circle" size={22} color="#0a0a0a" />
                <Text className="text-neutral-950 text-base font-bold ml-2">
                  Schedule New Meeting
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* <View className="px-6 py-5 bg-white border-t border-neutral-200">
            <TouchableOpacity onPress={()=> {
              router.push('/permission' as any)
            }} className="rounded-lg" activeOpacity={0.8}>
              <LinearGradient
                colors={["#facc15", "#eab308"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl py-4 flex-row items-center justify-center shadow-sm"
              >
                <Ionicons name="add-circle" size={22} color="#0a0a0a" />
                <Text className="text-neutral-950 text-base font-bold ml-2">
                  Schedule New Meeting
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View> */}
        </SafeAreaView>
      </LinearGradient>
      <Toast />
    </View>
  );
}
