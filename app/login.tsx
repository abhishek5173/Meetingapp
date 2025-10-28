import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import { auth } from "../lib/firebaseConfig";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: "error", text1: "All fields are required" });
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      Toast.show({ type: "error", text1: "Please enter a valid email" });
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      Toast.show({ type: "success", text1: "Welcome back!" });
      router.replace("/");
    } catch (error: any) {
      let message = "Login failed. Please try again.";
      if (error.code === "auth/user-not-found")
        message = "No user found with this email.";
      else if (error.code === "auth/wrong-password")
        message = "Incorrect password.";
      else if (error.code === "auth/invalid-email")
        message = "Invalid email address.";

      Toast.show({ type: "error", text1: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#fefce8", "#fafafa"]}
      className="flex-1 justify-center"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* background glow */}
      <View className="absolute top-32 left-10 w-64 h-64 bg-yellow-200/40 rounded-full blur-3xl" />
      <View className="absolute bottom-20 right-0 w-72 h-72 bg-yellow-100/40 rounded-full blur-3xl" />

      <View className="mx-6 bg-white/90 p-6 rounded-3xl shadow-md border border-neutral-200">
        
          <Text className="text-3xl font-extrabold text-center mb-6 text-gray-900">
            Welcome Back
          </Text>

          {/* Email */}
          <View className="flex-row items-center bg-neutral-50 border border-neutral-300 rounded-xl px-3 mb-3">
            <Ionicons
              name="mail-outline"
              size={18}
              color="#a3a3a3"
              style={{ marginRight: 6 }}
            />
            <TextInput
              className="flex-1 py-3 px-1 text-gray-800"
              placeholder="Email Address"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <View className="flex-row items-center bg-neutral-50 border border-neutral-300 rounded-xl px-3 mb-5">
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#a3a3a3"
              style={{ marginRight: 6 }}
            />
            <TextInput
              className="flex-1 py-3 px-1 text-gray-800"
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Login button */}
          <TouchableOpacity
            disabled={loading}
            onPress={handleLogin}
            activeOpacity={0.8}
            className={`rounded-xl py-3 ${
              loading ? "bg-yellow-300" : "bg-yellow-400"
            } flex-row justify-center`}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text className="text-base font-bold text-gray-900">Login</Text>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity
            onPress={() => router.push("/register")}
            activeOpacity={0.7}
          >
            <Text className="text-blue-600 text-center mt-5 font-medium">
              Don’t have an account? Register
            </Text>
          </TouchableOpacity>
        

        {/* Toast container */}
      </View>

      <Toast />
    </LinearGradient>
  );
}
