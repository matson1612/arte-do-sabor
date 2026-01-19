// src/components/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  UtensilsCrossed, 
  Settings, 
  LogOut, 
  X,
  Store
} from "lucide-react";
import { auth } from "@/lib/firebase";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Pedidos", icon: ShoppingBag },
    { href: "/admin", label: "Produtos", icon: UtensilsCrossed },
    { href: "/admin/customers", label: "Clientes", icon: Users },
    // { href: "/admin/settings", label: "Configurações", icon: Settings },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  return (
    <>
      {/* Overlay Escuro (Só aparece no Mobile quando aberto) */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 text-white shadow-xl transition-transform duration-300
          lg:translate-x-0 lg:static lg:block
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
            {/* Cabeçalho */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                    <h1 className="font-bold text-xl tracking-tight">Admin</h1>
                    <p className="text-xs text-slate-400">Arte do Sabor</p>
                </div>
                {/* Botão Fechar (Só Mobile) */}
                <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
                    <X size={24}/>
                </button>
            </div>

            {/* Links */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.href);
                    
                    return (
                        <Link 
                            key={link.href} 
                            href={link.href}
                            onClick={onClose} // Fecha menu ao clicar (mobile)
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                                active 
                                ? "bg-pink-600 text-white shadow-lg shadow-pink-900/20" 
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                        >
                            <Icon size={20}/>
                            {link.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Rodapé */}
            <div className="p-4 border-t border-slate-800 space-y-2">
                <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition">
                    <Store size={20}/> Ver Loja
                </Link>
                <button 
                    onClick={() => auth.signOut()} 
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded-xl transition"
                >
                    <LogOut size={20}/> Sair
                </button>
            </div>
        </div>
      </aside>
    </>
  );
}