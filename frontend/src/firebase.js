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

if (!firebaseConfig.apiKey) {
  console.warn("ERRO: Variável NEXT_PUBLIC_FIREBASE_API_KEY não foi encontrada.");
}

if (!firebaseConfig.appId) {
  console.warn("ERRO: Variável NEXT_PUBLIC_FIREBASE_APP_ID não foi encontrada.");
}

// Initialize Firebase only if we have a valid config
let app;
try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined") {
    console.log("Firebase initializing with Key:", firebaseConfig.apiKey.substring(0, 10) + "...");
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  } else {
    console.error("Firebase: Configuração incompleta ou 'undefined'.");
  }
} catch (error) {
  console.error("Erro ao inicializar Firebase App:", error);
}

// Exportações protegidas para evitar erros ao importar em outros componentes
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
