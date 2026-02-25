'use client';
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ia-agroserv.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ia-agroserv",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ia-agroserv.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "580294378501",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: "G-0ER0BZ3G9B"
};

// Verificação de segurança para ajudar no debug
if (!firebaseConfig.apiKey) {
  console.error("ERRO CRÍTICO: Variável NEXT_PUBLIC_FIREBASE_API_KEY não foi encontrada.");
}

if (!firebaseConfig.appId) {
  console.error("ERRO CRÍTICO: Variável NEXT_PUBLIC_FIREBASE_APP_ID não foi encontrada.");
}

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined") {
  console.log("Firebase initialized successfully with Key starting with:", firebaseConfig.apiKey.substring(0, 10));
} else {
  console.error("Firebase API Key is missing or invalid. Check your Netlify environment variables.");
}

// Initialize Firebase only if no apps are initialized (for Next.js SSR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
