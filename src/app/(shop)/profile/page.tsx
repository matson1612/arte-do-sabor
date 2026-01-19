// src/app/(shop)/profile/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { User, Package, FileText, MapPin, LogOut, Settings } from "lucide-react";

export default function ProfilePage() {
  const { user, profile, logout } = useAuth();

  if (!user) return <div className="p-20 text-center text-stone-500">Faça login para acessar.</div>;

  const isMonthly = profile?.clientType === 'monthly';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header Perfil */}
      <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-white shadow-md overflow-hidden">
            {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover"/> : <User className="w-full h-full p-4 text-stone-300"/>}
        </div>
        <div>
            <h1 className="text-2xl font-bold text-stone-800">{profile?.name || user.displayName}</h1>
            <p className="text-stone-500 text-sm">{user.email}</p>
            {isMonthly && <span className="inline-block mt-2 bg-purple-100 text-purple-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Cliente Mensalista</span>}
        </div>
      </div>

      {/* Grid de Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/orders" className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md hover:border-pink-200 transition group">
            <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition"><Package size={24}/></div>
            <h3 className="font-bold text-lg text-stone-800">Meus Pedidos</h3>
            <p className="text-sm text-stone-500 mt-1">Acompanhe o status e histórico.</p>
        </Link>

        {/* Botão de Fatura (Destaque se for mensalista) */}
        <Link href="/invoices" className={`p-6 rounded-3xl border shadow-sm hover:shadow-md transition group ${isMonthly ? 'bg-purple-50 border-purple-100 hover:border-purple-300' : 'bg-white border-stone-100 hover:border-blue-200'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition ${isMonthly ? 'bg-purple-200 text-purple-700' : 'bg-blue-50 text-blue-600'}`}><FileText size={24}/></div>
            <h3 className={`font-bold text-lg ${isMonthly ? 'text-purple-900' : 'text-stone-800'}`}>Minha Fatura</h3>
            <p className={`text-sm mt-1 ${isMonthly ? 'text-purple-700' : 'text-stone-500'}`}>{isMonthly ? "Verifique seus débitos em aberto." : "Histórico de pagamentos."}</p>
        </Link>

        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mb-4"><MapPin size={24}/></div>
            <h3 className="font-bold text-lg text-stone-800">Endereços</h3>
            <p className="text-sm text-stone-500 mt-1">Gerenciar locais de entrega.</p>
        </div>

        <button onClick={logout} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:bg-red-50 hover:border-red-100 transition group text-left">
            <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-red-100 group-hover:text-red-500 transition"><LogOut size={24}/></div>
            <h3 className="font-bold text-lg text-stone-800 group-hover:text-red-600">Sair da Conta</h3>
            <p className="text-sm text-stone-500 mt-1 group-hover:text-red-400">Desconectar do dispositivo.</p>
        </button>
      </div>
    </div>
  );
}