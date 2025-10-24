import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { requestSmsPermissions } from "@/utils/sms";
import { requestAllPermissions } from "../utils/permissions";

import { getCallLogsSafe, requestCallLogPermissions } from "@/utils/callLogs";


export default function HomeScreen() {

 useEffect(() => {
  async function initPermissions() {
    await requestAllPermissions();
    await requestSmsPermissions();
    await requestCallLogPermissions();

    const logs = await getCallLogsSafe();
    console.log("📊 Call Logs Loaded:", logs.slice(0, 3));
  }

  initPermissions();
}, []);


  const meetings = [
    { id: "1", title: "Council with the Elders", time: "Oct 9, 2025 · 3:00 PM" },
    { id: "2", title: "Annual Genral Meeting", time: "Oct 12, 2025 · 7:00 PM" },
  ];

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
              <TouchableOpacity className="w-11 h-11 bg-white shadow-sm rounded-full items-center justify-center border border-neutral-200">
                <Ionicons onPress={()=>{
                  Toast.show({
                    type: 'info',
                    text1: 'No new notifications',
                    position: 'top',
                    visibilityTime: 2000,
                    autoHide: true,
                    topOffset: 40,
                  })
                }} name="notifications-outline" size={20} color="#0a0a0a" />
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
                  <Text className="text-neutral-900 text-2xl font-bold">2</Text>
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
              <Text className="text-neutral-900 text-xl font-bold">Upcoming</Text>
              <TouchableOpacity className="flex-row items-center gap-1">
                <Text className="text-neutral-500 text-sm font-semibold">
                  View All
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#a3a3a3" />
              </TouchableOpacity>
            </View>

            {meetings.length > 0 ? (
              <FlatList
                data={meetings}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    className="bg-white rounded-2xl p-4 mb-3 border border-neutral-200 shadow-sm"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <LinearGradient
                          colors={["#facc15", "#fde68a"]}
                          className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        >
                          <Ionicons name="calendar" size={20} color="#0a0a0a" />
                        </LinearGradient>

                        <View className="flex-1">
                          <Text className="text-neutral-900 text-base font-semibold mb-1.5">
                            {item.title}
                          </Text>
                          <View className="flex-row items-center">
                            <View className="bg-yellow-50 rounded-full px-2 py-0.5 flex-row items-center">
                              <Ionicons
                                name="time-outline"
                                size={10}
                                color="#b8860b"
                              />
                              <Text className="text-neutral-600 text-xs font-medium ml-1">
                                {item.time}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View className="w-8 h-8 bg-neutral-100 rounded-full items-center justify-center">
                        <Ionicons name="chevron-forward" size={16} color="#0a0a0a" />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
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
            <TouchableOpacity onPress={()=> {
              router.push('/schedule' as any)
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
          </View>

          <View className="px-6 py-5 bg-white border-t border-neutral-200">
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
          </View>
        </SafeAreaView>
      </LinearGradient>
      <Toast/>
    </View>
  );
}
