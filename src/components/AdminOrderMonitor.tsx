// src/components/AdminOrderMonitor.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from "firebase/firestore";
import { BellRing, X } from "lucide-react";

export default function AdminOrderMonitor() {
  const [newOrders, setNewOrders] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Cria o áudio da campainha (você pode trocar a URL por um arquivo local em /public/sounds/)
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    
    // Solicita permissão para notificação do navegador
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // Monitora apenas pedidos criados nos últimos 5 minutos (para evitar apitar velhos ao recarregar)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const q = query(
      collection(db, "orders"),
      where("createdAt", ">=", fiveMinutesAgo),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Ignora a primeira carga (dados que já existiam)
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const order = change.doc.data();
          // Só alerta se o status for 'em_aberto'
          if (order.status === 'em_aberto') {
            triggerAlert(order, change.doc.id);
          }
        }
      });
    });

    return () => unsubscribe();
  }, []);

  const triggerAlert = (order: any, id: string) => {
    // 1. Toca Som
    if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Interaja com a página para tocar som"));
    }

    // 2. Notificação do Navegador (Sistema)
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Novo Pedido Chegou!", {
            body: `Pedido #${order.shortId} - R$ ${order.total.toFixed(2)}`,
            icon: "/logo.jpg"
        });
    }

    // 3. Adiciona ao Toast Visual
    setNewOrders(prev => [...prev, { id, ...order }]);
  };

  const removeAlert = (id: string) => {
      setNewOrders(prev => prev.filter(o => o.id !== id));
  };

  if (newOrders.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-auto">
      {newOrders.map(order => (
        <div key={order.id} className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right border-l-4 border-pink-500 max-w-sm">
            <div className="bg-pink-600 p-2 rounded-full animate-pulse">
                <BellRing size={24} className="text-white"/>
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-sm text-pink-300">NOVO PEDIDO #{order.shortId}</h4>
                <p className="text-xs text-gray-300">{order.userName}</p>
                <p className="font-bold text-lg">R$ {order.total?.toFixed(2)}</p>
            </div>
            <button onClick={() => removeAlert(order.id)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
        </div>
      ))}
    </div>
  );
}