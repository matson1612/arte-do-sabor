// src/app/(shop)/profile/details/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, app } from "@/lib/firebase"; // Importe app para o messaging
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getMessaging, getToken } from "firebase/messaging";
import { ArrowLeft, Save, User, Phone, Bell, Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

// Cole sua chave VAPID aqui novamente
const VAPID_KEY = "BK4P_jAAMJKFEkbJ6oTqt6OZd1oxZmF7rPPWIpTiQn2lmUIjuXWh6SatjL4736nagf4fVblWMGOvBeUTVNxdloM";

export default function MyDataPage() {
  const { user } = useAuth();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Estado da Notificação
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Carregar Dados do Usuário
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || user.displayName || "");
          setPhone(data.phone || "");
          // Se tiver token salvo, consideramos ativado
          if (data.pushToken) setNotificationsEnabled(true);
        }
      }
      
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermissionStatus(Notification.permission);
      }
      
      setLoading(false);
    };
    loadData();
  }, [user]);

  // 2. Função para Ligar/Desligar Notificações
  const handleToggleNotifications = async () => {
    if (!user) return;

    // A. SE O USUÁRIO QUER DESATIVAR
    if (notificationsEnabled) {
        if(confirm("Deseja parar de receber promoções e avisos de pedidos?")) {
            setNotificationsEnabled(false);
            // Remove o token do banco
            await updateDoc(doc(db, "users", user.uid), { pushToken: null });
        }
        return;
    }

    // B. SE O USUÁRIO QUER ATIVAR
    try {
        // Pedir permissão ao navegador
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);

        if (permission === 'granted') {
            const messaging = getMessaging(app);
            
            // Registra Service Worker
            let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
            if (!registration) {
                registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            }

            // Pega o Token
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });

            if (token) {
                console.log("Token gerado manualmente:", token);
                await updateDoc(doc(db, "users", user.uid), { pushToken: token });
                setNotificationsEnabled(true);
                alert("✅ Notificações Ativadas! Você receberá avisos sobre seus pedidos.");
            }
        } else {
            alert("🚫 Você bloqueou as notificações. Para ativar, clique no cadeado 🔒 na barra de endereço do navegador e permita 'Notificações'.");
        }
    } catch (error) {
        console.error("Erro ao ativar:", error);
        alert("Erro ao ativar notificações. Tente recarregar a página.");
    }
  };

  // 3. Salvar Dados Pessoais
  const handleSaveData = async () => {
      if(!name || !phone) return alert("Preencha nome e telefone.");
      setSaving(true);
      try {
          if (user) {
              await updateDoc(doc(db, "users", user.uid), {
                  name: name,
                  phone: phone
              });
              alert("Dados atualizados com sucesso!");
          }
      } catch (e) {
          alert("Erro ao salvar.");
      } finally {
          setSaving(false);
      }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-pink-600"/></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center gap-4 mb-8">
            <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full text-slate-600">
                <ArrowLeft size={24}/>
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">Meus Dados</h1>
        </div>

        <div className="space-y-6">
            
            {/* CARD DE NOTIFICAÇÕES */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${notificationsEnabled ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${notificationsEnabled ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            <Bell size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Notificações e Promoções</h3>
                            <p className="text-xs text-slate-500 max-w-[200px] sm:max-w-full">
                                {notificationsEnabled 
                                    ? "Ativado. Você receberá avisos do seu pedido." 
                                    : "Toque para ativar e acompanhar seus pedidos em tempo real."}
                            </p>
                        </div>
                    </div>
                    
                    {/* TOGGLE SWITCH */}
                    <button 
                        onClick={handleToggleNotifications}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center ${notificationsEnabled ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}
                    >
                        <div className="w-6 h-6 bg-white rounded-full shadow-md"></div>
                    </button>
                </div>
                {permissionStatus === 'denied' && (
                    <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex gap-2 items-center">
                        <XCircle size={14}/> Seu navegador bloqueou notificações. Desbloqueie nas configurações do site.
                    </div>
                )}
            </div>

            {/* FORMULÁRIO DE DADOS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h2 className="font-bold text-lg text-slate-700 border-b pb-2 mb-4">Informações Pessoais</h2>
                
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100 transition">
                        <User className="text-gray-400" size={20}/>
                        <input 
                            className="bg-transparent outline-none w-full text-slate-800 font-medium"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Seu nome"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp / Telefone</label>
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100 transition">
                        <Phone className="text-gray-400" size={20}/>
                        <input 
                            className="bg-transparent outline-none w-full text-slate-800 font-medium"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            type="tel"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleSaveData} 
                    disabled={saving}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 mt-4 shadow-lg disabled:opacity-70"
                >
                    {saving ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Salvar Dados</>}
                </button>
            </div>

        </div>
    </div>
  );
}