// src/components/NotificationBell.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { Bell, Check, X } from "lucide-react";

interface Campaign {
    id: string;
    title: string;
    body: string;
    createdAt: Timestamp;
}

export default function NotificationBell() {
  const [messages, setMessages] = useState<Campaign[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  // Refs para clicar fora e fechar
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Busca as últimas 10 campanhas
    const q = query(
        collection(db, "campaigns"), 
        orderBy("createdAt", "desc"), 
        limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Campaign));

        setMessages(msgs);

        // Verificar quantas não foram lidas (usando LocalStorage)
        if (typeof window !== "undefined") {
            const readIds = JSON.parse(localStorage.getItem("read_notifications") || "[]");
            const unread = msgs.filter(m => !readIds.includes(m.id)).length;
            setUnreadCount(unread);
        }
    });

    // Fechar ao clicar fora
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        unsubscribe();
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOpen = () => {
      setIsOpen(!isOpen);
      // Ao abrir, marca todas visíveis como lidas
      if (!isOpen && messages.length > 0) {
          const ids = messages.map(m => m.id);
          localStorage.setItem("read_notifications", JSON.stringify(ids));
          setUnreadCount(0);
      }
  };

  return (
    <div className="relative" ref={menuRef}>
        {/* Botão do Sino */}
        <button 
            onClick={handleOpen} 
            className="p-2 rounded-full hover:bg-gray-100 transition relative text-slate-600"
        >
            <Bell size={24} />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-bounce shadow-sm border-2 border-white">
                    {unreadCount}
                </span>
            )}
        </button>

        {/* Dropdown de Mensagens */}
        {isOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Notificações</h3>
                    <button onClick={() => setIsOpen(false)}><X size={16} className="text-gray-400"/></button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <Bell className="mx-auto mb-2 opacity-20" size={32}/>
                            Nenhuma notificação por enquanto.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {messages.map(msg => (
                                <div key={msg.id} className="p-4 hover:bg-gray-50 transition">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-sm text-slate-800">{msg.title}</h4>
                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                            {msg.createdAt?.toDate().toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">{msg.body}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {messages.length > 0 && (
                    <div className="p-2 bg-gray-50 text-center border-t">
                        <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                            <Check size={12}/> Todas as mensagens lidas
                        </span>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}