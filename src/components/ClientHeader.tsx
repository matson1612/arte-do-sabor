// src/components/ClientHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { 
  ShoppingBag, Menu, User, X, Home, Gift, Star, 
  LogIn, LogOut, Package, MapPin, ChevronDown 
} from "lucide-react";
import { useState } from "react";

export default function ClientHeader() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { user, logout, profile } = useAuth(); // Adicionei 'logout' e 'profile' se disponíveis no seu contexto
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Delivery", href: "/", icon: Home },
    { name: "Encomendas", href: "/encomendas", icon: Gift },
    { name: "Especiais", href: "/especiais", icon: Star },
  ];

  const userLinks = [
    { name: "Meus Pedidos", href: "/orders", icon: Package },
    { name: "Meus Dados", href: "/profile", icon: User },
    // { name: "Minha Fatura", href: "/invoices", icon: FileText }, // Se quiser reativar
  ];

  return (
    <>
      {/* --- HEADER FIXO --- */}
      <header className="sticky top-0 z-50 bg-[#FFFBF7]/95 backdrop-blur-md border-b border-stone-100 shadow-sm h-20">
        <div className="container mx-auto px-4 h-full flex items-center justify-between max-w-6xl">
          
          {/* 1. Botão Menu Mobile */}
          <div className="lg:hidden">
            <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2 text-stone-600 hover:bg-stone-100 rounded-full transition"
            >
                <Menu size={24} />
            </button>
          </div>

          {/* 2. LOGO */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-pink-100 group-hover:border-pink-300 transition shadow-sm">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="hidden md:block">
                <h1 className="text-xl font-bold text-stone-800 leading-none font-serif">Arte do Sabor</h1>
                <p className="text-[10px] text-stone-500 tracking-widest uppercase mt-0.5">Doceria Artesanal</p>
            </div>
          </Link>

          {/* 3. MENU CENTRAL (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 bg-white px-2 py-1.5 rounded-full border border-stone-100 shadow-sm">
            {navLinks.map((link) => {
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

          {/* 4. AÇÕES DIREITA */}
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

            {/* Perfil / Login (Desktop) */}
            <div className="hidden lg:block relative group">
                {user ? (
                    <div className="relative">
                        <button className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-stone-100 rounded-full hover:bg-stone-200 transition">
                            <span className="text-xs font-bold text-stone-700 max-w-[100px] truncate">{profile?.name || user.displayName || "Cliente"}</span>
                            <div className="w-8 h-8 rounded-full bg-white border border-stone-200 overflow-hidden">
                                {user.photoURL ? <img src={user.photoURL} className="w-full h-full"/> : <User className="w-full h-full p-1.5 text-stone-400"/>}
                            </div>
                            <ChevronDown size={14} className="text-stone-400"/>
                        </button>

                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50">
                            <div className="bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden py-1">
                                {userLinks.map(link => (
                                    <Link key={link.href} href={link.href} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:bg-pink-50 hover:text-pink-700 transition">
                                        <link.icon size={16}/> {link.name}
                                    </Link>
                                ))}
                                <div className="border-t border-stone-100 my-1"></div>
                                <button onClick={logout} className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition">
                                    <LogOut size={16}/> Sair
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <Link href="/login" className="text-xs font-bold bg-stone-800 text-white px-5 py-2.5 rounded-full hover:bg-stone-700 transition flex items-center gap-2">
                        <LogIn size={14}/> Entrar
                    </Link>
                )}
            </div>
          </div>
        </div>
      </header>

      {/* --- MENU MOBILE LATERAL --- */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity lg:hidden ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <aside className={`fixed top-0 left-0 z-[70] h-full w-80 bg-[#FFFBF7] shadow-2xl transition-transform duration-300 lg:hidden flex flex-col ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        {/* Cabeçalho Menu Mobile */}
        <div className="p-6 border-b border-stone-100 bg-white">
            <div className="flex justify-between items-center mb-6">
                <div className="w-10 h-10 rounded-full border border-stone-200 overflow-hidden"><img src="/logo.jpg" className="w-full h-full object-cover"/></div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200"><X size={20}/></button>
            </div>
            
            {user ? (
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-stone-200 overflow-hidden">
                        {user.photoURL ? <img src={user.photoURL} className="w-full h-full"/> : <User className="w-full h-full p-3 text-stone-500"/>}
                    </div>
                    <div>
                        <p className="font-bold text-stone-800">{profile?.name || user.displayName || "Cliente"}</p>
                        <p className="text-xs text-stone-500">{user.email}</p>
                    </div>
                </div>
            ) : (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 w-full bg-stone-900 text-white py-3 rounded-xl font-bold">
                    <LogIn size={18}/> Fazer Login
                </Link>
            )}
        </div>

        {/* Links Mobile */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 px-2">Cardápio</p>
                <div className="space-y-1">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium ${pathname === link.href ? "bg-pink-50 text-pink-700" : "text-stone-600 hover:bg-white"}`}>
                            <link.icon size={20}/> {link.name}
                        </Link>
                    ))}
                </div>
            </div>

            {user && (
                <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 px-2">Minha Conta</p>
                    <div className="space-y-1">
                        {userLinks.map((link) => (
                            <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium ${pathname === link.href ? "bg-stone-100 text-stone-900" : "text-stone-600 hover:bg-white"}`}>
                                <link.icon size={20}/> {link.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Footer Mobile */}
        {user && (
            <div className="p-4 border-t border-stone-100 bg-white">
                <button onClick={() => { logout?.(); setIsMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 w-full py-3 text-red-500 hover:bg-red-50 rounded-xl font-bold transition">
                    <LogOut size={20}/> Sair da Conta
                </button>
            </div>
        )}
      </aside>
    </>
  );
}