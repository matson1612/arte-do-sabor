// src/components/ClientHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext"; // Se tiver login
import { ShoppingBag, Menu, User, LogOut } from "lucide-react";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar"; // Reutilizando a sidebar para mobile se necessário

export default function ClientHeader() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { name: "Delivery", href: "/" },
    { name: "Encomendas", href: "/encomendas" },
    { name: "Especiais", href: "/especiais" },
  ];

  return (
    <>
      {/* Header Fixo */}
      <header className="sticky top-0 z-50 bg-[#FFFBF7]/95 backdrop-blur-md border-b border-stone-100 shadow-sm h-20">
        <div className="container mx-auto px-4 h-full flex items-center justify-between max-w-6xl">
          
          {/* 1. Mobile Menu & Logo */}
          <div className="flex items-center gap-4 lg:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-stone-600">
                <Menu />
            </button>
          </div>

          {/* 2. LOGO (Esquerda no PC, Centro no Mobile) */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-pink-100 group-hover:border-pink-300 transition shadow-sm">
                {/* Substitua pelo caminho da sua logo */}
                <img src="/logo.jpg" alt="Arte do Sabor" className="w-full h-full object-cover" />
            </div>
            <div className="hidden md:block">
                <h1 className="text-xl font-bold text-stone-800 leading-none font-serif">Arte do Sabor</h1>
                <p className="text-[10px] text-stone-500 tracking-widest uppercase">Doceria Artesanal</p>
            </div>
          </Link>

          {/* 3. MENU CENTRAL (Apenas Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 bg-white px-2 py-1.5 rounded-full border border-stone-100 shadow-sm">
            {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                    <Link 
                        key={link.href} 
                        href={link.href}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                            isActive 
                            ? "bg-stone-800 text-white shadow-md" 
                            : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                        }`}
                    >
                        {link.name}
                    </Link>
                )
            })}
          </nav>

          {/* 4. AÇÕES DIREITA (Carrinho e Login) */}
          <div className="flex items-center gap-3">
            {/* Carrinho */}
            <Link href="/cart" className="relative p-2.5 bg-white rounded-full text-stone-700 hover:bg-pink-50 hover:text-pink-600 transition border border-stone-100 shadow-sm group">
                <ShoppingBag size={20}/>
                {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md group-hover:scale-110 transition">
                        {cartCount}
                    </span>
                )}
            </Link>

            {/* Perfil (Desktop) */}
            <div className="hidden md:block">
                {user ? (
                    <Link href="/profile" className="p-2.5 bg-stone-100 rounded-full text-stone-600 hover:bg-stone-200 transition flex items-center gap-2">
                        <User size={20}/>
                    </Link>
                ) : (
                    <Link href="/login" className="text-xs font-bold bg-stone-800 text-white px-4 py-2.5 rounded-full hover:bg-stone-700 transition">
                        Entrar
                    </Link>
                )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Mobile (Reaproveitada ou simplificada) */}
      <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
}