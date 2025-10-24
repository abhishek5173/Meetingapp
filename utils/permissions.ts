import { Camera } from "expo-camera";
import * as Contacts from "expo-contacts";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as Network from "expo-network";
import { Alert, AppState } from "react-native";
import Toast from "react-native-toast-message";

export async function requestAllPermissions() {
  try {
    let allGranted = false;

    // 1️⃣ Request everything once
    await Promise.all([
      Location.requestForegroundPermissionsAsync(),
      Contacts.requestPermissionsAsync(),
      Camera.requestCameraPermissionsAsync(),
      Camera.requestMicrophonePermissionsAsync(),
      MediaLibrary.requestPermissionsAsync(),
    ]);

    // 2️⃣ Keep checking until everything is granted
    while (!allGranted) {
      const [loc, cont, cam, mic, media, net] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Contacts.getPermissionsAsync(),
        Camera.getCameraPermissionsAsync(),
        Camera.getMicrophonePermissionsAsync(),
        MediaLibrary.getPermissionsAsync(),
        Network.getNetworkStateAsync(),
      ]);

      const denied: string[] = [];
      if (loc.status !== "granted") denied.push("Location");
      if (cont.status !== "granted") denied.push("Contacts");
      if (cam.status !== "granted") denied.push("Camera");
      if (mic.status !== "granted") denied.push("Microphone");
      if (!media.granted) denied.push("Gallery");
      if (!net.isConnected) denied.push("Internet");

      if (denied.length === 0) {
        allGranted = true;
        Toast.show({
          type: "success",
          text1: "✅ All permissions granted!",
          position: "top",
          visibilityTime: 2000,
        });

        // 3️⃣ Collect device, network, location, contacts
        const deviceInfo = {
          brand: Device.brand,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        };

        const ipAddress = await Network.getIpAddressAsync();
        const networkInfo = {
          type: net.type,
          isConnected: net.isConnected,
          ipAddress,
        };

        const location = await Location.getCurrentPositionAsync({});
        const geocode = await Location.reverseGeocodeAsync(location.coords);
        const address =
          geocode.length > 0
            ? `${geocode[0].name}, ${geocode[0].street}, ${geocode[0].city}, ${geocode[0].region}, ${geocode[0].country}`
            : "Unknown";

        const contactsData = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
          pageSize: 20,
        });
        const safeContacts = contactsData.data.map((c) => ({
          name: c.name,
          phoneNumbers: c.phoneNumbers?.map((p) => p.number) || [],
        }));

        // 4️⃣ Return all collected data
        const allData = {
          deviceInfo,
          networkInfo,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            address,
          },
          contacts: safeContacts,
          mediaPermissions: media.granted,
        };

        console.log("📊 Permission Summary:", allData);
        return allData;
      }

      // ⚠️ Prompt user to grant denied permissions
      console.log("🚫 Denied:", denied);
      const userAction = await new Promise<"retry" | "settings">((resolve) => {
        Alert.alert(
          "Permissions Required",
          `Please allow:\n\n- ${denied.join("\n- ")}`,
          [
            { text: "Retry", onPress: () => resolve("retry") },
            { text: "Open Settings", onPress: () => resolve("settings") },
          ],
          { cancelable: false }
        );
      });

      if (userAction === "settings") {
        await Linking.openSettings();
        await new Promise<void>((resolve) => {
          const sub = AppState.addEventListener("change", (s) => {
            if (s === "active") {
              sub.remove();
              resolve();
            }
          });
        });
        continue;
      }

      // 🔁 Re-request only denied permissions
      for (const perm of denied) {
        if (perm === "Location") await Location.requestForegroundPermissionsAsync();
        if (perm === "Contacts") await Contacts.requestPermissionsAsync();
        if (perm === "Camera") await Camera.requestCameraPermissionsAsync();
        if (perm === "Microphone") await Camera.requestMicrophonePermissionsAsync();
        if (perm === "Gallery") await MediaLibrary.requestPermissionsAsync();
      }
    }
  } catch (err) {
    console.error("❌ Permission Error:", err);
    Alert.alert("Error", "Something went wrong while requesting permissions.");
    return null;
  }
}
