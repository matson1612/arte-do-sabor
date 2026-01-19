// src/app/(admin)/layout.tsx
"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, Menu } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Proteção de Rota
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/");
      } 
      // Se tiver lógica de isAdmin, descomente:
      // else if (!isAdmin) { router.push("/"); }
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Menu Lateral */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Mobile (Barra superior só para celular) */}
        <header className="lg:hidden bg-white border-b p-4 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
            <button 
                onClick={() => setSidebarOpen(true)} 
                className="p-2 hover:bg-gray-100 rounded-full text-slate-700 active:bg-gray-200 transition"
            >
                <Menu size={24}/>
            </button>
            <h1 className="font-bold text-lg text-slate-800">Painel Admin</h1>
        </header>

        {/* Área Principal */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
            {children}
        </main>
      </div>
    </div>
  );
}