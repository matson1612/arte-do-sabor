// src/components/TopBar.tsx
"use client";

import { useState } from "react";
import { Menu, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import Sidebar from "./Sidebar";
import NotificationBell from "@/components/NotificationBell"; // <--- 1. IMPORTAR

export default function TopBar() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { cartCount } = useCart();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm h-16 flex items-center justify-between px-4 z-40">
        
        {/* Esquerda: Menu e Logo */}
        <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-700 hover:bg-gray-100 rounded-full">
                <Menu size={26} />
            </button>
            <Link href="/" className="text-xl font-bold text-pink-600">
                Arte do Sabor
            </Link>
        </div>

        {/* Direita: Sino e Carrinho */}
        <div className="flex items-center gap-1">
            
            {/* 2. O SININHO ENTRA AQUI */}
            <NotificationBell />

            {/* Carrinho */}
            <Link href="/cart" className="p-2 relative text-gray-700 hover:bg-gray-100 rounded-full">
                <ShoppingCart size={26} />
                {cartCount > 0 && (
                    <span className="absolute top-1 right-0 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white">
                        {cartCount}
                    </span>
                )}
            </Link>
        </div>
      </header>

      {/* Sidebar e Espaçador */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="h-16"></div> 
    </>
  );
}