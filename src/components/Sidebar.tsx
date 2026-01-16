"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { X, User, ShoppingBag, LogOut, Home, LogIn, Settings, Users, BarChart3, ListOrdered } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, loginGoogle, logout, isAdmin } = useAuth();

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <div className={`fixed top-0 left-0 h-full w-[80%] max-w-[300px] bg-white z-50 shadow-2xl transition-transform duration-300 transform ${isOpen ? "translate-x-0" : "-translate-x-full"} overflow-y-auto`}>
        
        <div className="p-6 bg-pink-600 text-white flex flex-col justify-between h-[160px]">
            <button onClick={onClose} className="self-end"><X /></button>
            
            {user ? (
                <div>
                    <img src={user.photoURL || ""} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-white mb-2"/>
                    <p className="font-bold text-lg line-clamp-1">{user.displayName}</p>
                    <p className="text-xs opacity-80 text-ellipsis overflow-hidden">{user.email}</p>
                </div>
            ) : (
                <div>
                    <User size={40} className="mb-2 opacity-50"/>
                    <p className="font-bold text-lg">Bem-vindo(a)!</p>
                    <button onClick={() => { loginGoogle(); onClose(); }} className="mt-2 text-xs bg-white text-pink-600 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <LogIn size={12}/> Entrar
                    </button>
                </div>
            )}
        </div>

        <nav className="p-4 space-y-2">
            <Link href="/" onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl text-gray-700 font-medium">
                <Home size={20}/> Cardápio
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

            {/* SEÇÃO DO ADMIN */}
            {isAdmin && (
                <div className="mt-6 border-t pt-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2 px-3">Gestão da Loja</p>
                    
                    <Link href="/admin/dashboard" onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-pink-50 text-pink-700 rounded-xl font-bold">
                        <BarChart3 size={20}/> Dashboard
                    </Link>
                    <Link href="/admin" onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-pink-50 text-pink-700 rounded-xl font-bold">
                        <Settings size={20}/> Produtos / Config
                    </Link>
                    <Link href="/admin/orders" onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-pink-50 text-pink-700 rounded-xl font-bold">
                        <ListOrdered size={20}/> Pedidos
                    </Link>
                    <Link href="/admin/customers" onClick={onClose} className="flex items-center gap-4 p-3 hover:bg-pink-50 text-pink-700 rounded-xl font-bold">
                        <Users size={20}/> Clientes
                    </Link>
                </div>
            )}

            {user && (
                <button onClick={() => { logout(); onClose(); }} className="flex w-full items-center gap-4 p-3 hover:bg-red-50 text-red-600 rounded-xl font-medium mt-6 border-t">
                    <LogOut size={20}/> Sair da Conta
                </button>
            )}
        </nav>
      </div>
    </>
  );
}