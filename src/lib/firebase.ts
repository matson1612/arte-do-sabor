// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore"; // Importe initializeFirestore
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

// --- CORREÇÃO DE TRAVAMENTO AQUI ---
// Usamos initializeFirestore para forçar Long Polling se necessário
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Força HTTP se WebSockets estiverem travando
});

// Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };