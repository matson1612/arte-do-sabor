// src/components/ClientHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ShoppingBag, Menu, User, X, Home, Gift, Star, LogIn } from "lucide-react";
import { useState } from "react";

export default function ClientHeader() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { name: "Delivery", href: "/", icon: Home },
    { name: "Encomendas", href: "/encomendas", icon: Gift },
    { name: "Especiais", href: "/especiais", icon: Star },
  ];

  return (
    <>
      {/* --- HEADER FIXO --- */}
      <header className="sticky top-0 z-50 bg-[#FFFBF7]/95 backdrop-blur-md border-b border-stone-100 shadow-sm h-20">
        <div className="container mx-auto px-4 h-full flex items-center justify-between max-w-6xl">
          
          {/* 1. Botão Menu Mobile (Só aparece no celular) */}
          <div className="lg:hidden">
            <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2 text-stone-600 hover:bg-stone-100 rounded-full transition"
            >
                <Menu size={24} />
            </button>
          </div>

          {/* 2. LOGO (Centralizada no Mobile, Esquerda no PC) */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-pink-100 group-hover:border-pink-300 transition shadow-sm">
                <img src="/logo.jpg" alt="Arte do Sabor" className="w-full h-full object-cover" />
            </div>
            <div className="hidden md:block">
                <h1 className="text-xl font-bold text-stone-800 leading-none font-serif">Arte do Sabor</h1>
                <p className="text-[10px] text-stone-500 tracking-widest uppercase mt-0.5">Doceria Artesanal</p>
            </div>
          </Link>

          {/* 3. MENU CENTRAL (Apenas PC - Estilo Pílula) */}
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
                    <Link href="/profile" className="p-2.5 bg-stone-100 rounded-full text-stone-600 hover:bg-stone-200 transition flex items-center gap-2" title="Meu Perfil">
                        <User size={20}/>
                    </Link>
                ) : (
                    <Link href="/login" className="text-xs font-bold bg-stone-800 text-white px-5 py-2.5 rounded-full hover:bg-stone-700 transition flex items-center gap-2">
                        <LogIn size={14}/> Entrar
                    </Link>
                )}
            </div>
          </div>
        </div>
      </header>

      {/* --- MENU MOBILE LATERAL (CLIENTE) --- */}
      {/* Overlay Escuro */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity lg:hidden ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Drawer Branco */}
      <aside 
        className={`
          fixed top-0 left-0 z-[70] h-full w-72 bg-[#FFFBF7] shadow-2xl transition-transform duration-300 lg:hidden flex flex-col
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Cabeçalho do Menu */}
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-stone-200">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover"/>
                </div>
                <span className="font-bold text-stone-800">Menu</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-stone-400 hover:text-stone-800 transition">
                <X size={24}/>
            </button>
        </div>

        {/* Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {links.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                    <Link 
                        key={link.href} 
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium ${
                            isActive 
                            ? "bg-pink-50 text-pink-700 border border-pink-100" 
                            : "text-stone-600 hover:bg-white hover:shadow-sm"
                        }`}
                    >
                        <Icon size={20}/>
                        {link.name}
                    </Link>
                )
            })}
        </div>

        {/* Rodapé do Menu (Login/Perfil) */}
        <div className="p-4 border-t border-stone-100 bg-white">
            {user ? (
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 w-full px-4 py-3 bg-stone-100 rounded-xl font-bold text-stone-700 hover:bg-stone-200 transition">
                    <User size={20}/> Minha Conta
                </Link>
            ) : (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition shadow-lg">
                    <LogIn size={20}/> Fazer Login
                </Link>
            )}
        </div>
      </aside>
    </>
  );
}