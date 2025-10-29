// lib/firebaseConfig.ts
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

// You don’t need to manually initialize the app with config JSON,
// because RNFirebase auto-detects from google-services files.
export { auth, firebase };

