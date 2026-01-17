// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDGs-PYm2FkWbfvrGW1LhtLOQ_lH_PTegM",
  authDomain: "artedosabor-9193e.firebaseapp.com",
  projectId: "artedosabor-9193e",
  storageBucket: "artedosabor-9193e.firebasestorage.app",
  messagingSenderId: "579533738740",
  appId: "1:579533738740:web:abcde0be58c191db8f84a1",
  measurementId: "G-SXEJ9LTWF4"
};

// Inicializa o App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Configuração do Firestore
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Note que removemos o 'storage' daqui pois usaremos ImgBB
export { db, auth, provider };