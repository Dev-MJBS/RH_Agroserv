'use client';
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ia-agroserv.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ia-agroserv",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ia-agroserv.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "331490395989",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Verificação de segurança para ajudar no debug
if (firebaseConfig.apiKey === "COLE_AQUI_SUA_API_KEY" || !firebaseConfig.apiKey) {
  console.error("ERRO CRÍTICO: Você ainda não configurou a API Key do Firebase no Netlify!");
}

// Initialize Firebase only if no apps are initialized (for Next.js SSR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
