// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');
// COPIE AS MESMAS CHAVES DO SEU src/lib/firebase.ts AQUI
firebase.initializeApp({
  apiKey: "AIzaSyDGs-PYm2FkWbfvrGW1LhtLOQ_lH_PTegM",
    authDomain: "artedosabor-9193e.firebaseapp.com",
    projectId: "artedosabor-9193e",
    storageBucket: "artedosabor-9193e.firebasestorage.app",
    messagingSenderId: "579533738740",
    appId: "1:579533738740:web:abcde0be58c191db8f84a1",
    measurementId: "G-SXEJ9LTWF4"
});

const messaging = firebase.messaging();

// --- CORREÇÃO 1: FIM DA DUPLICIDADE ---
// Removemos o "messaging.onBackgroundMessage" que forçava a exibição manual.
// O Firebase SDK já exibe automaticamente quando o payload tem "notification".

// --- CORREÇÃO 2: CLIQUE NA NOTIFICAÇÃO ---
self.addEventListener('notificationclick', function(event) {
  console.log('Notificação clicada', event);
  
  // 1. Fecha a notificação no celular
  event.notification.close();

  // 2. Define para onde vai (Home ou link específico)
  // Tenta pegar o link enviado no "data", se não tiver, vai para a raiz "/"
  const urlToOpen = event.notification.data?.url || '/';

  // 3. Abre o app ou foca na aba aberta
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Se já houver uma aba aberta, foca nela
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        // Verifica se a aba pertence ao mesmo site
        if (client.url.indexOf(self.registration.scope) > -1 && 'focus' in client) {
          return client.focus().then(focusedClient => {
             // Opcional: Navegar para a URL específica se não estiver nela
             if (focusedClient && 'navigate' in focusedClient) {
                 return focusedClient.navigate(urlToOpen);
             }
          });
        }
      }
      // Se não tiver aba aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});