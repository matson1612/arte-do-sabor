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

// Configura o comportamento quando chega notificação em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('Notificação em Background recebida:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png', // Coloque um icone na pasta public se quiser
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});