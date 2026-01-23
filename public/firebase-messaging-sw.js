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

// Evento de Clique na Notificação
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notificação clicada');
  
  // 1. Fecha a notificação
  event.notification.close();

  // 2. Define a URL de destino (padrão para a raiz se não vier nada)
  // Tenta pegar do payload 'data', senão usa a origem do site
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : self.registration.scope;

  // 3. Tenta focar numa aba aberta ou abrir uma nova
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Se houver aba aberta do mesmo site, foca nela e navega
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        // Verifica se a aba é do nosso site
        if (client.url.indexOf(self.registration.scope) > -1 && 'focus' in client) {
          return client.focus().then(c => {
             // Redireciona para a URL certa (ex: /promo) se suportado
             if(c && 'navigate' in c) return c.navigate(targetUrl);
          });
        }
      }
      // Se não tiver aba aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});