import React, { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import SmsAndroid from "react-native-get-sms-android";

export default function PermissionsScreen() {
  const [smsList, setSmsList] = useState<any[]>([]);

  // async function reqsms() {
  //   try {
  //     const granted = await PermissionsAndroid.requestMultiple([
  //       PermissionsAndroid.PERMISSIONS.READ_SMS,
  //       PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  //       PermissionsAndroid.PERMISSIONS.SEND_SMS,
  //     ]);

  //     const readGranted =
  //       granted["android.permission.READ_SMS"] ===
  //       PermissionsAndroid.RESULTS.GRANTED;

  //     if (readGranted) {
  //       console.log("✅ SMS permissions granted");
  //       return true;
  //     } else {
  //       console.warn("❌ SMS permissions denied:", granted);
  //       return false;
  //     }
  //   } catch (error) {
  //     console.error("Error requesting SMS permissions:", error);
  //     return false;
  //   }
  // }

  useEffect(() => {
    async function fetchSMS() {
      // const hasPermission = await reqsms();
     
        (SmsAndroid as any).list(
          JSON.stringify({ box: "inbox", maxCount: 20 }),
          (fail: any) => {
            console.log("Failed to fetch SMS messages", fail);
          },
          (count: number, smsList: string) => {
            console.log("Fetched", count, "messages");
            const messages = JSON.parse(smsList);
            setSmsList(messages);
          }
        );
    
    }

    fetchSMS();
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View
        style={{
          padding: 10,
          backgroundColor: "#f9f9f9",
          margin: 10,
          borderRadius: 5,
        }}
      >
        <Text>From: {item.address}</Text>
        <Text>Body: {item.body}</Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <FlatList
        data={smsList}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        ListEmptyComponent={<Text>NO SMS FOUND</Text>}
      />
    </View>
  );
}
