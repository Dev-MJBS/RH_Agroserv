import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "project-580294378501.firebaseapp.com",
  projectId: "project-580294378501",
  storageBucket: "project-580294378501.appspot.com",
  messagingSenderId: "580294378501",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
