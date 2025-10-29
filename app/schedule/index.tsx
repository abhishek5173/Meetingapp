import { generateHeaders } from "@/lib/generateHeaders";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type Dates = {
  date: string;
  available: boolean;
};

export default function Schedule() {
  const base_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const AVAILABLE_DATES = `${base_URL}/meeting/get-meeting-availability`;
  const BOOK_MEETING = `${base_URL}/meeting/create-meeting`;

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [data, setData] = useState<{
    date: string;
    title: string;
    description: string;
    appointment_taken_at: string;
    timestamp: string;
  } | null>(null);

  const [availableDates, setAvailableDates] = useState<Dates[]>([]);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(false);

  const router = useRouter();

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

        // Out of range (grey)
        if (dateObj < today || dateObj > ninetyDaysLater) {
          marked[item.date] = {
            customStyles: {
              container: {
                backgroundColor: "#e5e7eb", // light grey
              },
              text: {
                color: "#9ca3af",
              },
            },
            disabled: true,
            disableTouchEvent: true,
          };
        }
        // Booked (red)
        else if (!item.available) {
          marked[item.date] = {
            customStyles: {
              container: {
                backgroundColor: "#ef4444", // red
                borderRadius: 8,
              },
              text: {
                color: "#fff",
              },
            },
            disabled: true,
            disableTouchEvent: true,
          };
        }
        // Available (green)
        else {
          marked[item.date] = {
            customStyles: {
              container: {
                backgroundColor: "#22c55e", // green
                borderRadius: 8,
              },
              text: {
                color: "#fff",
              },
            },
          };
        }
      });

      setMarkedDates(marked);
      console.log("Available Dates:", data);
    } catch (error) {
      console.error("Error fetching available dates:", error);
    }
  };

  useEffect(() => {
    fetchdates();
  }, []);

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

    try {
      setLoading(true);
      const headers = await generateHeaders();
      const response = await axios.post(
        BOOK_MEETING,
        {
          date: selectedDate,
          title: title,
          description: description,
          appointment_taken_at: getLocalISOTimeMicro(),
          timestamp: getLocalISOTimeMicro(),
        },
        { headers }
      );
      setLoading(false);
      console.log("Meeting booked successfully:", response.data);
      Toast.show({
        type: "success",
        text1: "Meeting booked successfully!",
        position: "top",
        visibilityTime: 1500,
      });

      setTimeout(() => {
        router.replace("/");
      }, 1000);
    } catch (error) {
      setLoading(false);
      console.error("Error booking meeting:", error);
      Toast.show({
        type: "error",
        text1: "Error booking meeting. Please try again.",
      });
    }

    setData({
      date: selectedDate,
      title: title,
      description: description,
      appointment_taken_at: getLocalISOTimeMicro(),
      timestamp: getLocalISOTimeMicro(),
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
          markingType="custom"
          minDate={new Date().toISOString().split("T")[0]}
          maxDate={
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]
          }
          onDayPress={(day) => {
            if (!markedDates[day.dateString]?.disabled) {
              setSelectedDate(day.dateString);
            }
          }}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              customStyles: {
                container: {
                  backgroundColor: "#facc15", // yellow for selected
                  borderRadius: 8,
                },
                text: {
                  color: "#0a0a0a",
                  fontWeight: "700",
                },
              },
            },
          }}
          theme={{
            calendarBackground: "#f5f5f5",
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

      {/* <View className="px-6 mt-6">
        {data && (
          <Text className="text-sm ">
            Meeting Scheduled on {data.date} with title {data.title} and
            description {data.description}
          </Text>
        )}
      </View> */}

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
            {loading ? null : (
              <Ionicons name="save-outline" size={22} color="#0a0a0a" />
            )}
            <Text className="text-neutral-950 text-base font-bold ml-2">
              {loading ? <ActivityIndicator color="#0a0a0a" /> : "Save Meeting"}
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
