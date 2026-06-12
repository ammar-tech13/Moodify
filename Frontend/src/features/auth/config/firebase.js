import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD41mRiIo649X8H6xkcD7p7HsrF4NsyYuA",
  authDomain: "moodify-a656a.firebaseapp.com",
  projectId: "moodify-a656a",
  storageBucket: "moodify-a656a.firebasestorage.app",
  messagingSenderId: "385322699204",
  appId: "1:385322699204:web:530c0a3995773b554e7c91",
  measurementId: "G-YDCZHTP6RP"
};

const app = initializeApp(firebaseConfig);

export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;