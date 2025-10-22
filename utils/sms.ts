import { PermissionsAndroid } from "react-native";

export async function requestSmsPermissions() {
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
    ]);

    const readGranted =
      granted["android.permission.READ_SMS"] === PermissionsAndroid.RESULTS.GRANTED;

    if (readGranted) {
      console.log("✅ SMS permissions granted");
      return true;
    } else {
      console.warn("❌ SMS permissions denied:", granted);
      return false;
    }
  } catch (error) {
    console.error("Error requesting SMS permissions:", error);
    return false;
  }
}
