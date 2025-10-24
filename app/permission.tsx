import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Image,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import RNFS from "react-native-fs";
import { requestAllPermissions } from "../utils/permissions";

export default function PermissionsScreen() {
  const [info, setInfo] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const data = await requestAllPermissions();
      setInfo(data);
      await loadGalleryMedia();
      await listStorageFiles();
    })();
  }, []);

  // 🖼️ Load all gallery images/videos
  async function loadGalleryMedia() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Cannot access gallery media.");
        return;
      }

      const assets: any[] = [];
      let after: string | undefined = undefined;

      // Load in pages of 500 (to prevent memory issues)
      while (true) {
        const result = await MediaLibrary.getAssetsAsync({
          mediaType: ["photo", "video"],
          first: 500,
          after,
          sortBy: ["creationTime"],
        });
        assets.push(...result.assets);
        if (!result.hasNextPage) break;
        after = result.endCursor;
      }

      setMedia(assets);
    } catch (err) {
      console.error("Error loading gallery media:", err);
    }
  }

  // 📂 List files in storage (read-only)
  async function listStorageFiles() {
    try {
      // Request only READ permission
      if (Platform.OS === "android") {
        if (Platform.Version >= 33) {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
          ]);
        } else {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );
        }
      }

      const basePath =
        Platform.OS === "android"
          ? RNFS.ExternalStorageDirectoryPath // /storage/emulated/0
          : RNFS.DocumentDirectoryPath;

      // Limit traversal to safe folders
      const allowedDirs = [
        `${basePath}/Download`,
        `${basePath}/Documents`,
        `${basePath}/DCIM`,
        `${basePath}/Pictures`,
      ];

      const allFiles: any[] = [];
      for (const dir of allowedDirs) {
        try {
          const items = await RNFS.readDir(dir);
          for (const item of items) {
            if (item.isFile()) {
              allFiles.push({ name: item.name, path: item.path });
            }
          }
        } catch {
          // skip inaccessible folders
        }
      }

      setFiles(allFiles);
      console.log("📁 Found", allFiles.length, "files");
    } catch (err) {
      console.error("Error reading storage files:", err);
      Alert.alert(
        "Storage Access",
        "Make sure you have granted storage permissions in settings."
      );
    }
  }

  if (!info)
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Requesting permissions...</Text>
      </View>
    );

  return (
    <ScrollView className="p-4">
      {/* Device Info */}
      <Text className="text-lg font-bold mb-2">Device Info:</Text>
      <Text selectable>{JSON.stringify(info.deviceInfo, null, 2)}</Text>

      {/* Network Info */}
      <Text className="text-lg font-bold mt-4 mb-2">Network Info:</Text>
      <Text selectable>{JSON.stringify(info.networkInfo, null, 2)}</Text>

      {/* Location */}
      <Text className="text-lg font-bold mt-4 mb-2">Location:</Text>
      <Text selectable>{JSON.stringify(info.location, null, 2)}</Text>

      {/* Contacts */}
      <Text className="text-lg font-bold mt-4 mb-2">Contacts (20):</Text>
      <Text selectable>{JSON.stringify(info.contacts, null, 2)}</Text>

      {/* Gallery Media */}
      {media.length > 0 && (
        <>
          <Text className="text-lg font-bold mt-4 mb-2">Gallery Media:</Text>
          <ScrollView horizontal>
            {media.slice(0, 20).map((item, index) => (
              <View key={index} className="mr-2">
                {item.mediaType === "video" ? (
                  <Text>🎬 {item.filename}</Text>
                ) : (
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: 100, height: 100, borderRadius: 8 }}
                  />
                )}
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* Storage Files */}
      <View className="mt-6">
        <Button title="Refresh Storage Files" onPress={listStorageFiles} />
      </View>
      {files.length > 0 && (
        <>
          <Text className="text-lg font-bold mt-4 mb-2">Files in Storage:</Text>
          {files.slice(0, 30).map((file, index) => (
            <Text key={index} numberOfLines={1}>
              📄 {file.path}
            </Text>
          ))}
        </>
      )}
    </ScrollView>
  );
}
