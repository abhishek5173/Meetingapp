import { useAuth } from "@/lib/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saveloading, setsaveLoading] = useState(false);
  const router = useRouter();

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: "error", text1: "All fields are required" });
      return;
    }
    if (!email.includes("@")) {
      Toast.show({ type: "error", text1: "Please enter a valid email" });
      return;
    }

    try {
      setsaveLoading(true);
      await auth().signInWithEmailAndPassword(email, password);
      Toast.show({ type: "success", text1: "Welcome back!" });
      router.replace("/");
    } catch (error: any) {
      let message = "Login failed. Please try again.";

      if (error.code === "auth/user-not-found") message = "No user found.";
      else if (error.code === "auth/wrong-password") message = "Incorrect password.";
      else if (error.code === "auth/invalid-email") message = "Invalid email address.";

      Toast.show({ type: "error", text1: message });
    } finally {
      setsaveLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#ffffff", "#f9fafb", "#f3f4f6"]}
      className="flex-1"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View className="flex-1 justify-center px-6">
        {/* CARD */}
        <View
          className="bg-white rounded-3xl p-6 border border-gray-200"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <Text className="text-gray-900 text-3xl font-bold text-center mb-6">
            Welcome Back
          </Text>

          {/* EMAIL INPUT */}
          <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-2xl px-3 py-3 mb-4">
            <View className="bg-blue-50 p-2 rounded-xl mr-3">
              <Ionicons name="mail-outline" size={18} color="#3b82f6" />
            </View>

            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              className="flex-1 text-gray-800"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* PASSWORD INPUT */}
          <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-2xl px-3 py-3 mb-5">
            <View className="bg-emerald-50 p-2 rounded-xl mr-3">
              <Ionicons name="lock-closed-outline" size={18} color="#10b981" />
            </View>

            <TextInput
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              className="flex-1 text-gray-800"
            />
          </View>

          {/* LOGIN BUTTON */}
          <TouchableOpacity
            disabled={saveloading}
            onPress={handleLogin}
            activeOpacity={0.9}
            className="bg-blue-600 rounded-2xl py-4 flex-row justify-center items-center"
            style={{
              shadowColor: "#3b82f6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.28,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            {saveloading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-bold">Login</Text>
            )}
          </TouchableOpacity>

          {/* REGISTER LINK */}
          <TouchableOpacity
            onPress={() => router.push("/register")}
            className="mt-5"
          >
            <Text className="text-blue-600 text-center font-medium">
              Don’t have an account? Register
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Toast />
    </LinearGradient>
  );
}
