// src/components/NotificationInit.tsx
"use client";

import { useEffect } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import { app, db } from "@/lib/firebase";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext"; // Importe seu contexto de auth

export default function NotificationInit() {
  const { user } = useAuth(); // Precisa do usuário logado

  useEffect(() => {
    const setupNotifications = async () => {
      if (typeof window !== "undefined" && "serviceWorker" in navigator && user) {
        try {
          const messaging = getMessaging(app);
          
          // Solicita permissão
          const permission = await Notification.requestPermission();
          
          if (permission === 'granted') {
            // Pegue sua VAPID Key nas Configurações do Projeto no Firebase Console > Cloud Messaging
            const token = await getToken(messaging, {
              vapidKey: "SUA_CHAVE_VAPID_AQUI" 
            });
            
            if (token) {
              console.log("Token FCM salvo:", token);
              // Salva o token no perfil do usuário no Firestore
              const userRef = doc(db, "users", user.uid);
              // Usa setDoc com merge para criar se não existir ou update se existir
              await setDoc(userRef, { pushToken: token }, { merge: true });
            }
          }
        } catch (error) {
          console.error("Erro notificação:", error);
        }
      }
    };

    setupNotifications();
  }, [user]); // Roda quando o usuário logar

  return null;
}