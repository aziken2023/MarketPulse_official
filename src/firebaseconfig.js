// firebaseconfig.js

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJGVszvthelZA9PgY5tAhf0SItlHm-fzA",
  authDomain: "moneypulse-49a0b.firebaseapp.com",
  projectId: "moneypulse-49a0b",
  storageBucket: "moneypulse-49a0b.firebasestorage.app",
  messagingSenderId: "735211452333",
  appId: "1:735211452333:web:0e6c343482e5010e59d324",
  measurementId: "G-QW0200G7RP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Export firebaseConfig, auth, and db
export { firebaseConfig, auth, db, analytics };
