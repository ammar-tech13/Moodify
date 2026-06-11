import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Actual web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBt-rO8lwWJ4gG4giMC9MjdpSlAYNcHrpY",
  authDomain: "musicplayer-d9c08.firebaseapp.com",
  projectId: "musicplayer-d9c08",
  storageBucket: "musicplayer-d9c08.firebasestorage.app",
  messagingSenderId: "466602067613",
  appId: "1:466602067613:web:0aaa36d79dfb9fedeff674",
  measurementId: "G-9M2ZTRCLTQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize & Export Analytics and Auth helpers
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
