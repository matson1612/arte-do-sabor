// src/app/(admin)/layout.tsx
"use client";

import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  // Proteção básica: Se não tiver logado, chuta pra fora
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/"); // Manda pro login/home
      } 
      // Opcional: Se quiser bloquear quem não é admin de verdade
      // else if (!isAdmin) { router.push("/"); } 
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Menu Lateral Fixo */}
      <div className="hidden md:block w-64 flex-shrink-0">
         <AdminSidebar />
      </div>

      {/* Conteúdo Principal (que muda conforme o clique) */}
      <main className="flex-1 p-6 md:p-10 ml-0 md:ml-0 overflow-x-hidden">
        {/* Header Mobile (Aparece só em celular) */}
        <div className="md:hidden mb-6 pb-4 border-b flex justify-between items-center">
            <h1 className="font-bold text-slate-800">Painel Admin</h1>
            {/* Aqui você poderia por um menu hamburguer mobile depois */}
        </div>

        {children}
      </main>
    </div>
  );
}