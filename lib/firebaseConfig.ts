// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCndTPW58_58YG0V7S6MuEjby00oX56Tcw",
  authDomain: "meet-scheduler-1fabf.firebaseapp.com",
  projectId: "meet-scheduler-1fabf",
  storageBucket: "meet-scheduler-1fabf.firebasestorage.app",
  messagingSenderId: "923641075503",
  appId: "1:923641075503:web:5032b30e0640cf547433da"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);
