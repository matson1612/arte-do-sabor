// src/app/(admin)/layout.tsx
"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminOrderMonitor from "@/components/AdminOrderMonitor"; // <--- IMPORTAR
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, Menu } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Componente de Alerta Sonoro */}
      <AdminOrderMonitor />

      {/* Menu Lateral */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo Principal */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-64'}`}>
        
        {/* Header Mobile */}
        <header className="lg:hidden bg-white border-b p-4 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
            <button 
                onClick={() => setSidebarOpen(true)} 
                className="p-2 hover:bg-gray-100 rounded-full text-slate-700 active:bg-gray-200 transition"
            >
                <Menu size={24}/>
            </button>
            <h1 className="font-bold text-lg text-slate-800">Painel Admin</h1>
        </header>

        {/* Área de Conteúdo */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
            {children}
        </main>
      </div>
    </div>
  );
}