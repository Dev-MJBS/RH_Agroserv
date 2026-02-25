import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", 
  authDomain: "ia-agroserv.firebaseapp.com",
  projectId: "ia-agroserv",
  storageBucket: "ia-agroserv.appspot.com",
  messagingSenderId: "331490395989",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase only if no apps are initialized (for Next.js SSR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
