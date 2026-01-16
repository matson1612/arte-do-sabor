// src/app/(admin)/layout.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { getStoreSettings } from "@/services/settingsService";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, ShieldAlert, Settings, LayoutDashboard, LogOut, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, loginGoogle, logout } = useAuth();
  const [authorizedEmail, setAuthorizedEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();

  // Busca o email autorizado no banco
  useEffect(() => {
    getStoreSettings().then(settings => {
      // Se não tiver configuração ainda, libera o acesso para criar a primeira
      if (!settings || !settings.authorizedEmail) {
        setAuthorizedEmail("LIVRE"); 
      } else {
        setAuthorizedEmail(settings.authorizedEmail);
      }
      setChecking(false);
    });
  }, []);

  if (loading || checking) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-pink-600"/></div>;
  }

  // TELA DE LOGIN DO ADMIN
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6">
            <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto text-pink-600">
                <LayoutDashboard size={40}/>
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Painel Administrativo</h1>
                <p className="text-gray-500">Área restrita para gestão.</p>
            </div>
            <button onClick={() => loginGoogle()} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                <LogIn size={20}/> Entrar com Google
            </button>
            <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600">Voltar para Loja</Link>
        </div>
      </div>
    );
  }

  // TELA DE ACESSO NEGADO (Se o email não bater)
  if (authorizedEmail !== "LIVRE" && user.email !== authorizedEmail) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center space-y-4">
        <ShieldAlert size={64} className="text-red-500"/>
        <h1 className="text-2xl font-bold text-gray-800">Acesso Negado</h1>
        <p className="text-gray-600 max-w-md">O e-mail <b>{user.email}</b> não tem permissão para acessar este painel.</p>
        <button onClick={() => logout()} className="text-red-600 font-bold underline">Sair e tentar outra conta</button>
      </div>
    );
  }

  // TELA ADMIN LIBERADA
  return (
    <div className="min-h-screen bg-gray-50">
        {/* Barra Superior do Admin */}
        <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-lg">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <span className="font-bold text-lg hidden sm:block">Painel Admin</span>
                    <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                        <Link href="/admin" className={`px-3 py-1 rounded-md text-sm transition ${pathname === '/admin' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:text-white'}`}>Produtos</Link>
                        <Link href="/admin/settings" className={`px-3 py-1 rounded-md text-sm transition ${pathname === '/admin/settings' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:text-white'}`}>Empresa</Link>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/" target="_blank" className="text-sm text-gray-300 hover:text-white hidden sm:block">Ver Loja</Link>
                    <button onClick={() => logout()} title="Sair" className="p-2 hover:bg-slate-800 rounded-full"><LogOut size={18}/></button>
                </div>
            </div>
        </nav>
        
        <main className="p-6 max-w-6xl mx-auto">
            {authorizedEmail === "LIVRE" && (
                <div className="mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-sm">
                    <b>Atenção:</b> Seu painel está desprotegido! Vá em <u>Empresa</u> e configure seu e-mail de acesso.
                </div>
            )}
            {children}
        </main>
    </div>
  );
}