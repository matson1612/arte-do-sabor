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
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Escuta as últimas 10 notificações
    const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
        setMessages(msgs);

        if (typeof window !== "undefined") {
            const readIds = JSON.parse(localStorage.getItem("read_notifications") || "[]");
            const unread = msgs.filter(m => !readIds.includes(m.id)).length;
            setUnreadCount(unread);
        }
    });

    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => { unsubscribe(); document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const handleOpen = () => {
      setIsOpen(!isOpen);
      if (!isOpen && messages.length > 0) {
          const ids = messages.map(m => m.id);
          localStorage.setItem("read_notifications", JSON.stringify(ids));
          setUnreadCount(0);
      }
  };

  return (
    <div className="relative" ref={menuRef}>
        <button 
            onClick={handleOpen} 
            className="p-2 rounded-full hover:bg-gray-100 transition relative text-slate-600"
        >
            <Bell size={26} />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-bounce border-2 border-white shadow-sm">
                    {unreadCount}
                </span>
            )}
        </button>

        {isOpen && (
            <div className={`
                /* MOBILE: Fixo na tela, margens laterais, logo abaixo do header */
                fixed top-[70px] left-4 right-4 w-auto
                
                /* DESKTOP (sm para cima): Absoluto, alinhado à direita, largura fixa */
                sm:absolute sm:top-12 sm:right-0 sm:left-auto sm:w-80
                
                bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2
            `}>
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm">Notificações</h3>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={16} className="text-gray-400"/></button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center">
                            <Bell className="mb-2 opacity-20" size={32}/>
                            Nenhuma notificação por enquanto.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {messages.map(msg => (
                                <div key={msg.id} className="p-4 hover:bg-gray-50 transition">
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <h4 className="font-bold text-sm text-slate-800 leading-tight">{msg.title}</h4>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded">
                                            {msg.createdAt?.toDate().toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">{msg.body}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {messages.length > 0 && (
                    <div className="p-2 bg-gray-50 text-center border-t">
                        <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                            <Check size={12}/> Marcadas como lidas
                        </span>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}