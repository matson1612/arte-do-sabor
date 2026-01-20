// src/components/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  Users, 
  Settings, 
  LogOut,
  Store,
  X,
  DollarSign, // Novo Ícone
  List // Novo Ícone
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Pedidos", href: "/admin/orders", icon: ShoppingBag },
    { name: "Cardápio", href: "/admin", icon: UtensilsCrossed },
    { name: "Categorias", href: "/admin/categories", icon: List }, // <--- NOVO
    { name: "Clientes", href: "/admin/customers", icon: Users },
    { name: "Fluxo de Caixa", href: "/admin/finance", icon: DollarSign }, // <--- NOVO
    { name: "Loja & Frete", href: "/admin/settings", icon: Settings },
  ];

  // Verifica se o link está ativo
  const isActive = (href: string) => pathname === href || (href !== "/admin" && pathname.startsWith(href));

  return (
    <>
      {/* Overlay Escuro (Só aparece no celular quando aberto) */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sidebar Principal */}
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
                <div className="flex items-center gap-2">
                    <Store className="text-pink-500" />
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Painel Admin</h1>
                        <p className="text-xs text-slate-400">Arte do Sabor</p>
                    </div>
                </div>
                {/* Botão Fechar (Só Mobile) */}
                <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
                    <X size={24}/>
                </button>
            </div>

            {/* Navegação */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    
                    return (
                        <Link 
                            key={item.href} 
                            href={item.href}
                            onClick={onClose} // Fecha ao clicar no mobile
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                                active 
                                ? "bg-pink-600 text-white shadow-lg shadow-pink-900/20" 
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                        >
                            <Icon size={20} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800">
                <Link href="/" className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-white mb-1 transition">
                    <Store size={20}/> Ir para Loja
                </Link>
                <button 
                    onClick={logout} 
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-950/30 rounded-xl transition-colors font-medium"
                >
                    <LogOut size={20} />
                    Sair
                </button>
            </div>
        </div>
      </aside>
    </>
  );
}