// src/app/(shop)/layout.tsx
"use client";

import { CartProvider } from "@/context/CartContext";
import TopBar from "@/components/TopBar"; // <--- Importamos a nova Barra Superior

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="bg-gray-50 min-h-screen flex flex-col">
        {/* A TopBar agora cuida de tudo: 
           - Botão do Menu (Sidebar)
           - Logo
           - Ícone do Carrinho com contador
        */}
        <TopBar />

        {/* Conteúdo das páginas (Home, Perfil, etc) */}
        <main className="container mx-auto px-4 py-6 flex-grow">
          {children}
        </main>
      </div>
    </CartProvider>
  );
}