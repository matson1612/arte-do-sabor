// src/app/(shop)/layout.tsx
"use client";

import { CartProvider } from "@/context/CartContext";
import TopBar from "@/components/TopBar"; 
import CustomerNav from "@/components/CustomerNav"; // <--- NOVO MENU

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="bg-gray-50 min-h-screen flex flex-col">
        {/* Barra do Topo (Logo, Login, Carrinho) */}
        <TopBar />
        
        {/* Navegação entre Áreas (Delivery / Encomendas / Eventos) */}
        <CustomerNav />

        {/* Conteúdo das páginas */}
        <main className="container mx-auto px-4 py-6 flex-grow">
          {children}
        </main>
      </div>
    </CartProvider>
  );
}