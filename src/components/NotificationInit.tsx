// src/components/NotificationInit.tsx
"use client";

import { useEffect } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import { app } from "@/lib/firebase";

export default function NotificationInit() {
  useEffect(() => {
    const setupNotifications = async () => {
      // Verifica se está no navegador e se suporta Service Worker
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          const messaging = getMessaging(app);
          
          // Solicita permissão ao usuário
          const permission = await Notification.requestPermission();
          
          if (permission === 'granted') {
            // Obtém o Token (Necessário gerar a VAPID Key no Firebase Console > Cloud Messaging)
            const token = await getToken(messaging, {
              vapidKey: "INSIRA_SUA_VAPID_KEY_AQUI" 
            });
            
            if (token) {
              console.log("Token de Notificação (FCM):", token);
              // Futuramente aqui você salva este token no perfil do usuário no Firestore
            }
          }
        } catch (error) {
          console.error("Erro ao ativar notificações:", error);
        }
      }
    };

    setupNotifications();
  }, []);

  return null; // Este componente não renderiza nada visualmente
}