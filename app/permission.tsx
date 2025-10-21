import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { requestAllPermissions } from "../utils/permissions";

export default function PermissionsScreen() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const data = await requestAllPermissions();
      setInfo(data);
    })();
  }, []);

  if (!info)
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Requesting permissions...</Text>
      </View>
    );

  return (
    <ScrollView className="p-4">
      <Text className="text-lg font-bold mb-2">Device Info:</Text>
      <Text>{JSON.stringify(info.deviceInfo, null, 2)}</Text>

      <Text className="text-lg font-bold mt-4 mb-2">Network Info:</Text>
      <Text>{JSON.stringify(info.networkInfo, null, 2)}</Text>

      <Text className="text-lg font-bold mt-4 mb-2">Location:</Text>
      <Text>{JSON.stringify(info.location, null, 2)}</Text>

      <Text className="text-lg font-bold mt-4 mb-2">Contacts (20):</Text>
      <Text>{JSON.stringify(info.contacts, null, 2)}</Text>
    </ScrollView>
  );
}
