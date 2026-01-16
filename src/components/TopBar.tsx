"use client";

import { useState } from "react";
import { Menu, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import Sidebar from "./Sidebar";

export default function TopBar() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { cartCount } = useCart();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm h-16 flex items-center justify-between px-4 z-40">
        {/* Botão Menu */}
        <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-700">
            <Menu size={26} />
        </button>

        {/* Logo / Nome */}
        <Link href="/" className="text-xl font-bold text-pink-600">
            Arte do Sabor
        </Link>

        {/* Carrinho */}
        <Link href="/cart" className="p-2 relative text-gray-700">
            <ShoppingCart size={26} />
            {cartCount > 0 && (
                <span className="absolute top-1 right-0 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full">
                    {cartCount}
                </span>
            )}
        </Link>
      </header>

      {/* Injeta a Sidebar aqui para ser controlada pelo TopBar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Espaçador para o conteúdo não ficar escondido atrás do Header */}
      <div className="h-16"></div> 
    </>
  );
}