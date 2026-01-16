"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { X, User, ShoppingBag, LogOut, Home, LogIn, Settings } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, loginGoogle, logout, isAdmin } = useAuth();

  return (
    <>
      {/* Fundo Escuro (Overlay) */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* O Menu em Si */}
      <div className={`fixed top-0 left-0 h-full w-[80%] max-w-[300px] bg-white z-50 shadow-2xl transition-transform duration-300 transform ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        {/* Cabeçalho do Menu */}
        <div className="p-6 bg-pink-600 text-white flex flex-col justify-between h-[180px]">
            <button onClick={onClose} className="self-end"><X /></button>
            
            {user ? (
                <div>
                    <img src={user.photoURL || ""} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-white mb-2"/>
                    <p className="font-bold text-lg">{user.displayName}</p>
                    <p className="text-xs opacity-80 text-ellipsis overflow-hidden">{user.email}</p>
                </div>
            ) : (
                <div>
                    <User size={40} className="mb-2 opacity-50"/>
                    <p className="font-bold text-lg">Bem-vindo(a)!</p>
                    <button onClick={() => { loginGoogle(); onClose(); }} className="mt-2 text-xs bg-white text-pink-600 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <LogIn size={12}/> Entrar ou Cadastrar
                    </button>
                </div>
            )}
        </div>

        {/* Links de Navegação */}
        <nav className="p-4 space-y-2">
            <Link href="/" onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl text-gray-700 font-medium">
                <Home size={20}/> Início / Cardápio
            </Link>

            {user && (
                <>
                    <Link href="/orders" onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl text-gray-700 font-medium">
                        <ShoppingBag size={20}/> Meus Pedidos
                    </Link>
                    <Link href="/profile" onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl text-gray-700 font-medium">
                        <User size={20}/> Meu Perfil
                    </Link>
                </>
            )}

            {/* Link Secreto do Admin (só aparece se for admin) */}
            {isAdmin && (
                <Link href="/admin/dashboard" onClick={onClose} className="flex items-center gap-4 p-3 bg-slate-100 rounded-xl text-slate-800 font-bold mt-4 border border-slate-200">
                    <Settings size={20}/> Painel da Loja
                </Link>
            )}

            {user && (
                <button onClick={() => { logout(); onClose(); }} className="flex w-full items-center gap-4 p-3 hover:bg-red-50 text-red-600 rounded-xl font-medium mt-4">
                    <LogOut size={20}/> Sair da Conta
                </button>
            )}
        </nav>
      </div>
    </>
  );
}