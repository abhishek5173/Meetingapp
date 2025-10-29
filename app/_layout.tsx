import { Stack, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../lib/AuthContext";
import "../styles/global.css";

function RootNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
  if (loading) return; // Wait until Firebase finishes checking session

  if (user) {
    router.replace("/"); // logged in → go home
  } else {
    router.replace("/register"); // not logged in → go to register
  }
}, [user, loading]);


  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="schedule" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
