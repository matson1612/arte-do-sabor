// src/components/TopBar.tsx (ou onde estiver seu arquivo)
"use client";

import { useState } from "react";
import { Menu, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import Sidebar from "./Sidebar";
import NotificationBell from "@/components/NotificationBell"; // <--- 1. Importar o componente

export default function TopBar() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { cartCount } = useCart();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm h-16 flex items-center justify-between px-4 z-40">
        
        {/* Lado Esquerdo: Menu e Logo */}
        <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-700 hover:bg-gray-50 rounded-full transition">
                <Menu size={26} />
            </button>

            <Link href="/" className="text-xl font-bold text-pink-600">
                Arte do Sabor
            </Link>
        </div>

        {/* Lado Direito: Notificações e Carrinho */}
        <div className="flex items-center gap-1">
            
            {/* 2. ADICIONAR O SININHO AQUI */}
            <NotificationBell />

            {/* Carrinho */}
            <Link href="/cart" className="p-2 relative text-gray-700 hover:bg-gray-50 rounded-full transition">
                <ShoppingCart size={26} />
                {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-sm border border-white">
                        {cartCount}
                    </span>
                )}
            </Link>
        </div>

      </header>

      {/* Sidebar (Menu Lateral) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Espaçador para o conteúdo não ficar escondido atrás do Header */}
      <div className="h-16"></div> 
    </>
  );
}