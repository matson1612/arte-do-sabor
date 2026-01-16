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
  Store
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Pedidos", href: "/admin/orders", icon: ShoppingBag },
    { name: "Cardápio", href: "/admin", icon: UtensilsCrossed }, // Página de Produtos
    { name: "Clientes", href: "/admin/customers", icon: Users },
    { name: "Loja & Frete", href: "/admin/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-50">
      {/* Logo Admin */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-2">
        <Store className="text-pink-500" />
        <div>
            <h1 className="font-bold text-lg leading-tight">Painel Admin</h1>
            <p className="text-xs text-slate-400">Gestão Arte do Sabor</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                isActive 
                  ? "bg-pink-600 text-white shadow-lg shadow-pink-900/20" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button 
            onClick={logout} 
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-950/30 rounded-xl transition-colors font-medium"
        >
            <LogOut size={20} />
            Sair do Sistema
        </button>
      </div>
    </aside>
  );
}