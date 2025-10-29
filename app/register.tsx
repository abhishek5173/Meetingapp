import { useAuth } from "@/lib/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { auth } from "../lib/firebaseConfig";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {user} = useAuth();

  if (user) {
    router.replace("/");
  }

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Toast.show({ type: "error", text1: "All fields are required" });
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      Toast.show({ type: "error", text1: "Please enter a valid email" });
      return;
    }
    if (password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Password must be at least 6 characters",
      });
      return;
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: name });
      Toast.show({
        type: "success",
        text1: "Account created successfully!",
      });
      router.replace("/");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Toast.show({
          type: "error",
          text1: "Email already registered",
          text2: "Try logging in instead",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Registration Failed",
          text2: error.message,
        });
      }
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mx-6 bg-white/90 p-6 rounded-3xl shadow-md border border-neutral-200">
            {/* Header */}
            <View className="items-center mb-6">
              <LinearGradient
                colors={["#facc15", "#fde047"]}
                className="w-20 h-20 rounded-full items-center justify-center shadow-sm mb-4"
              >
                <Ionicons name="person-add" size={28} color="#0a0a0a" />
              </LinearGradient>
              <Text className="text-2xl font-extrabold text-gray-900">
                Create Account
              </Text>
              <Text className="text-gray-500 mt-1 text-sm">
                Join the Royal Palace Community
              </Text>
            </View>

            {/* Name */}
            <View className="flex-row items-center bg-neutral-50 border border-neutral-300 rounded-xl px-3 mb-3">
              <Ionicons
                name="person-outline"
                size={18}
                color="#a3a3a3"
                style={{ marginRight: 6 }}
              />
              <TextInput
                className="flex-1 py-3 px-1 text-gray-800"
                placeholder="Full Name"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
              />
            </View>

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

            {/* Register Button */}
            <TouchableOpacity
              disabled={loading}
              onPress={handleRegister}
              activeOpacity={0.8}
              className="rounded-2xl overflow-hidden mb-4"
            >
              <LinearGradient
                colors={loading ? ["#fde68a", "#facc15"] : ["#facc15", "#eab308"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="py-3 flex-row items-center justify-center"
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#000" />
                    <Text className="text-gray-900 font-bold text-base ml-2">
                      Register
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity
              onPress={() => router.push("/login")}
              activeOpacity={0.7}
              className="items-center"
            >
              <Text className="text-blue-600 text-center text-sm font-medium">
                Already have an account?{" "}
                <Text className="font-semibold underline">Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast />
    </LinearGradient>
  );
}
