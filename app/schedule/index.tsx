import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [data, setData] = useState<{
    date: string;
    title: string;
    description: string;
  } | null>(null);  

  const router = useRouter();

  const handleSave = () => {
    if (!selectedDate || !title || !description) {
      Toast.show({
        type: "error",
        text1: !selectedDate
          ? "Please select a date."
          : !title
            ? "Please enter a title."
            : "Please enter a description.",
        position: "top",
        visibilityTime: 2000,
        autoHide: true,
      });
      return;
    }
    console.log({ selectedDate, title, description });
    setData({
      date: selectedDate,
      title: title,
      description: description,
    });
    setSelectedDate("");
    setTitle("");
    setDescription("");
    // Add API call or navigation logic here
  };

  return (
    <SafeAreaView className="bg-neutral-100">
      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <Text className="text-neutral-900 text-3xl font-bold mb-1">
          Schedule Meeting
        </Text>
        <Text className="text-neutral-500 text-sm">
          Select a date and add details for your meeting
        </Text>
      </View>

      {/* Calendar */}
      <View className="px-6 mb-6">
        <Calendar
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: "#facc15" },
          }}
          theme={{
            calendarBackground: "#f5f5f5",
            selectedDayBackgroundColor: "#facc15",
            todayTextColor: "#b8860b",
            arrowColor: "#b8860b",
            monthTextColor: "#0a0a0a",
            textDayFontWeight: "500",
            textMonthFontWeight: "bold",
            textDayHeaderFontWeight: "500",
          }}
        />
      </View>

      {/* Form Inputs */}
      <View className="px-6 space-y-4">
        <View>
          <Text className="text-neutral-700 text-sm font-semibold mb-1">
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter meeting title"
            className="bg-white rounded-xl p-3 border border-neutral-200 text-neutral-900"
          />
        </View>

        <View>
          <Text className="text-neutral-700 text-sm font-semibold mb-1">
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Enter description"
            className="bg-white rounded-xl p-3 border border-neutral-200 text-neutral-900 h-24"
            multiline
          />
        </View>
      </View>

      <View className="px-6 mt-6">
        {data && (
          <Text className="text-sm ">
            Meeting Scheduled on {data.date} with title {data.title} and
            description {data.description}
          </Text>
        )}
      </View>

      {/* Save Button */}
      <View className="px-6 py-4 mt-4">
        <TouchableOpacity
          className="rounded-lg"
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#facc15", "#eab308"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl py-4 flex-row items-center justify-center"
          >
            <Ionicons name="save-outline" size={22} color="#0a0a0a" />
            <Text className="text-neutral-950 text-base font-bold ml-2">
              Save Meeting
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* <View className="px-6">
        <TouchableOpacity onPress={()=>{
            router.push('/' as any)
        }} className="rounded-lg" activeOpacity={0.8}>
          <LinearGradient
            colors={["#facc15", "#eab308"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl py-4 flex-row items-center justify-center"
          >
            <Ionicons name="home" size={22} color="#0a0a0a" />
            <Text className="text-neutral-950 text-base font-bold ml-2">Home</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View> */}
      <Toast />
    </SafeAreaView>
  );
}
