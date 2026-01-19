// src/app/(admin)/layout.tsx
"use client";

import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { Menu } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar (Controlada pelo estado no mobile, fixa no desktop) */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Barra Superior Mobile (Só aparece em telas pequenas) */}
        <header className="lg:hidden bg-white border-b p-4 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-full text-slate-700">
                <Menu size={24}/>
            </button>
            <h1 className="font-bold text-lg text-slate-800">Painel Administrativo</h1>
        </header>

        {/* Área da Página (Children) */}
        <main className="flex-1 overflow-x-hidden">
            {children}
        </main>
      </div>
    </div>
  );
}