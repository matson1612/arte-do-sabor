// src/app/(shop)/profile/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, MapPin, ShoppingBag, User, ChevronRight, Settings, ShieldCheck } from "lucide-react"; // Importar ShieldCheck ou User
import Link from "next/link";

export default function ProfilePage() {
  const { user, profile, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* Cabeçalho do Perfil */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-2xl font-bold text-pink-600 border-2 border-pink-200">
            {user.displayName ? user.displayName[0].toUpperCase() : <User/>}
        </div>
        <div>
            <h1 className="text-xl font-bold text-slate-800">{user.displayName || "Cliente"}</h1>
            <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        
        {/* NOVO BOTÃO: MEUS DADOS */}
        <Link href="/profile/details" className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition group">
            <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:bg-blue-100 transition"><User size={20}/></div>
                <div>
                    <h3 className="font-bold text-slate-700">Meus Dados</h3>
                    <p className="text-xs text-slate-400">Nome, Telefone e Notificações</p>
                </div>
            </div>
            <ChevronRight className="text-gray-300"/>
        </Link>

        {/* Meus Endereços */}
        <Link href="/profile/addresses" className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition group">
            <div className="flex items-center gap-4">
                <div className="bg-orange-50 p-3 rounded-xl text-orange-600 group-hover:bg-orange-100 transition"><MapPin size={20}/></div>
                <div>
                    <h3 className="font-bold text-slate-700">Meus Endereços</h3>
                    <p className="text-xs text-slate-400">Gerenciar locais de entrega</p>
                </div>
            </div>
            <ChevronRight className="text-gray-300"/>
        </Link>

        {/* Meus Pedidos */}
        <Link href="/orders" className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition group">
            <div className="flex items-center gap-4">
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition"><ShoppingBag size={20}/></div>
                <div>
                    <h3 className="font-bold text-slate-700">Meus Pedidos</h3>
                    <p className="text-xs text-slate-400">Histórico e status</p>
                </div>
            </div>
            <ChevronRight className="text-gray-300"/>
        </Link>

        {/* Área Admin (Só se for admin) */}
        {profile?.role === 'admin' && (
            <Link href="/admin" className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-2xl shadow-sm hover:bg-slate-900 transition mt-6">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-700 p-3 rounded-xl text-white"><Settings size={20}/></div>
                    <div>
                        <h3 className="font-bold text-white">Painel Admin</h3>
                        <p className="text-xs text-slate-400">Gerenciar loja</p>
                    </div>
                </div>
                <ChevronRight className="text-slate-500"/>
            </Link>
        )}

        {/* Botão Sair */}
        <button onClick={logout} className="w-full mt-6 p-4 flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-50 rounded-xl transition">
            <LogOut size={20}/> Sair da Conta
        </button>
      </div>
    </div>
  );
}