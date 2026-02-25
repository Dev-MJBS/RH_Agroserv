import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Encontre no Project Settings -> Your Apps -> Web App
  authDomain: "ia-agroserv.firebaseapp.com",
  projectId: "ia-agroserv",
  storageBucket: "ia-agroserv.appspot.com",
  messagingSenderId: "331490395989",
  appId: "YOUR_APP_ID" // Encontre no Project Settings -> Your Apps -> Web App
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
