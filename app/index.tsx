import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Dimensions, FlatList, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuth } from "@/lib/AuthContext";
import { generateHeaders } from "@/lib/generateHeaders";
import auth from "@react-native-firebase/auth";
import axios from "axios";

const { width } = Dimensions.get('window');

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
  const [greeting, setGreeting] = useState("Good afternoon");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (!loading && user) {
      fetchmeetings();
    }
  }, []);

  const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const FETCH_MEETINGS = `${baseURL}/meeting/get-all-meetings`;
  const DELETE_MEETING = `${baseURL}/meeting/delete-meeting`;

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
    const today = new Date();
    const next7 = new Date();
    next7.setDate(today.getDate() + 7);

    let count = 0;

    meetings.forEach((meeting) => {
      const meetingDate = new Date(meeting.date);
      if (meetingDate >= today && meetingDate <= next7) {
        count++;
      }
    });

    return count;
  }

  const thisWeekCount = countMeetingsThisWeek(meetings);
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Top Gradient Header */}
      <LinearGradient
        colors={["#ffffff", "#f9fafb", "#f3f4f6"]}
        className="pb-6"
      >
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-4">
            {/* Header Row */}
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                  {greeting}
                </Text>
                <Text className="text-gray-900 text-3xl font-bold">
                  Royal Palace
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => auth().signOut()}
                className="bg-gray-100 w-12 h-12 rounded-2xl items-center justify-center border border-gray-200"
              >
                <Ionicons name="log-out-outline" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Horizontal Stats Scroll */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <View className="bg-white rounded-3xl p-5 border border-gray-200"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="bg-blue-50 rounded-2xl p-3">
                      <Ionicons name="calendar" size={24} color="#3b82f6" />
                    </View>
                    <Text className="text-gray-900 text-4xl font-bold">
                      {meetings.length}
                    </Text>
                  </View>
                  <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                    Total Meetings
                  </Text>
                </View>
              </View>

              <View className="flex-1">
                <View className="bg-white rounded-3xl p-5 border border-gray-200"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="bg-emerald-50 rounded-2xl p-3">
                      <Ionicons name="time" size={24} color="#10b981" />
                    </View>
                    <Text className="text-gray-900 text-4xl font-bold">
                      {thisWeekCount}
                    </Text>
                  </View>
                  <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                    This Week
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Content */}
      <View className="flex-1 bg-gray-50 pt-6 px-5">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-gray-900 text-2xl font-bold">
              Your Schedule
            </Text>
            <Text className="text-gray-500 text-sm mt-0.5">
              {meetings.length} upcoming {meetings.length === 1 ? 'meeting' : 'meetings'}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => router.push("/schedule" as any)}
            activeOpacity={0.8}
            className="bg-blue-600 rounded-2xl px-5 py-3 flex-row items-center"
            style={{
              shadowColor: "#3b82f6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text className="text-white text-sm font-bold ml-1.5">
              New
            </Text>
          </TouchableOpacity>
        </View>

        {meetings.length > 0 ? (
          <FlatList
            data={meetings}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View 
                className="bg-white rounded-3xl p-5 mb-4 border border-gray-200"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 4,
                }}
              >
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-1 pr-3">
                    <Text className="text-gray-900 text-lg font-bold mb-1.5">
                      {item.title.charAt(0).toUpperCase() + item.title.slice(1)}
                    </Text>
                    <Text
                      className="text-gray-600 text-sm leading-5"
                      numberOfLines={2}
                    >
                      {item.description.charAt(0).toUpperCase() + item.description.slice(1)}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => confirmDelete(item._id)}
                    activeOpacity={0.7}
                    className="bg-red-50 w-10 h-10 rounded-xl items-center justify-center border border-red-100"
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
                  <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center">
                      <View className="bg-blue-50 rounded-lg p-2 mr-2">
                        <Ionicons name="calendar-outline" size={16} color="#3b82f6" />
                      </View>
                      <Text className="text-gray-700 text-sm font-medium">
                        {formatDate(item.date)}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <View className="bg-emerald-50 rounded-lg p-2 mr-2">
                        <Ionicons name="time-outline" size={16} color="#10b981" />
                      </View>
                      <Text className="text-gray-700 text-sm font-medium">
                        {formatTime(item.appointment_taken_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          />
        ) : (
          <View className="flex-1 items-center justify-center py-16">
            <View className="bg-gray-100 w-24 h-24 rounded-full items-center justify-center mb-5">
              <Ionicons name="calendar-outline" size={40} color="#9ca3af" />
            </View>
            <Text className="text-gray-900 text-xl font-bold mb-2">
              No meetings yet
            </Text>
            <Text className="text-gray-500 text-sm text-center px-10 mb-6">
              Start scheduling your appointments with Royal Palace
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/schedule" as any)}
              className="bg-blue-600 rounded-2xl px-6 py-3"
            >
              <Text className="text-white text-sm font-bold">
                Create First Meeting
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Toast />
    </View>
  );
}