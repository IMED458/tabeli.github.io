import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAA9Xtv1t8L_LPKHmOrOXPQpnIy-Pl-z9s",
  authDomain: "tabeli-18c3b.firebaseapp.com",
  projectId: "tabeli-18c3b",
  storageBucket: "tabeli-18c3b.firebasestorage.app",
  messagingSenderId: "912768529613",
  appId: "1:912768529613:web:c797afc184f44a53176584",
  measurementId: "G-SFGKXW4XFE",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

void isSupported().then((supported) => {
  if (supported) getAnalytics(app);
});
