// src/components/NotificationInit.tsx
"use client";

import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export default function NotificationInit() {
  const { user } = useAuth();

  useEffect(() => {
    // Função para escutar mensagens quando o site está ABERTO
    const listenToForegroundMessages = async () => {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          const messaging = getMessaging(app);

          // 1. OUVIR MENSAGENS EM PRIMEIRO PLANO (FOREGROUND)
          onMessage(messaging, (payload) => {
            console.log("Mensagem recebida em 1º plano:", payload);
            
            // Como o site está aberto, o banner do sistema não aparece sozinho.
            // Vamos forçar um alerta visual ou notificação do navegador.
            const { title, body } = payload.notification || {};
            
            // Tenta criar uma notificação do sistema mesmo com a tela aberta
            if (Notification.permission === "granted") {
                new Notification(title || "Nova Mensagem", {
                    body: body,
                    icon: "/logo.png" // Se tiver logo na public
                });
            } else {
                // Fallback simples se o navegador bloquear
                alert(`${title}\n\n${body}`);
            }
          });

          // 2. REGISTRAR TOKEN (Igual anterior)
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            
            // Registra o Service Worker explicitamente para garantir
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            
            const token = await getToken(messaging, {
              vapidKey: "BK4P_jAAMJKFEkbJ6oTqt6OZd1oxZmF7rPPWIpTiQn2lmUIjuXWh6SatjL4736nagf4fVblWMGOvBeUTVNxdloM", // <--- PREENCHA ISSO
              serviceWorkerRegistration: registration
            });
            
            if (token && user) {
              console.log("Token Atualizado:", token);
              await setDoc(doc(db, "users", user.uid), { pushToken: token }, { merge: true });
            }
          }

        } catch (error) {
          console.error("Erro no fluxo de notificação:", error);
        }
      }
    };

    listenToForegroundMessages();
  }, [user]);

  return null;
}