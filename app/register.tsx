import { useAuth } from "@/lib/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/");
  }, [user]);

  const createUserProfile = async (user: any, name: string) => {
    await firestore().collection("users").doc(user.uid).set({
      uid: user.uid,
      name,
      email: user.email,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Toast.show({ type: "error", text1: "All fields are required" });
      return;
    }
    if (!email.includes("@")) {
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
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const createdUser = userCredential.user;

      await createdUser.updateProfile({ displayName: name });
      await createUserProfile(createdUser, name);

      Toast.show({ type: "success", text1: "Account created successfully!" });
      router.replace("/");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Toast.show({ type: "error", text1: "Email already registered" });
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
      colors={["#ffffff", "#f9fafb", "#f3f4f6"]}
      className="flex-1"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card */}
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

            {/* Header Icon Bubble */}
            <View className="items-center mb-6">
              <View className="bg-blue-50 w-20 h-20 rounded-full items-center justify-center mb-4">
                <Ionicons name="person-add" size={32} color="#3b82f6" />
              </View>

              <Text className="text-gray-900 text-3xl font-bold">Create Account</Text>
              <Text className="text-gray-500 text-sm mt-1">Join the Royal Palace Community</Text>
            </View>

            {/* Name */}
            <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-2xl px-3 py-3 mb-4">
              <View className="bg-blue-50 p-2 rounded-xl mr-3">
                <Ionicons name="person-outline" size={18} color="#3b82f6" />
              </View>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#9ca3af"
                className="flex-1 text-gray-800"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email */}
            <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-2xl px-3 py-3 mb-4">
              <View className="bg-blue-50 p-2 rounded-xl mr-3">
                <Ionicons name="mail-outline" size={18} color="#3b82f6" />
              </View>
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#9ca3af"
                className="flex-1 text-gray-800"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password */}
            <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-2xl px-3 py-3 mb-6">
              <View className="bg-emerald-50 p-2 rounded-xl mr-3">
                <Ionicons name="lock-closed-outline" size={18} color="#10b981" />
              </View>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                className="flex-1 text-gray-800"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              disabled={loading}
              onPress={handleRegister}
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
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text className="text-white text-base font-bold ml-2">Register</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Login Redirect */}
            <TouchableOpacity
              onPress={() => router.push("/login")}
              className="mt-5"
            >
              <Text className="text-blue-600 text-center font-medium">
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast />
    </LinearGradient>
  );
}
