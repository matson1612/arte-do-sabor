// src/app/(shop)/layout.tsx
"use client";

import { CartProvider } from "@/context/CartContext";
import TopBar from "@/components/TopBar"; 
import CustomerNav from "@/components/CustomerNav";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="bg-[#FFFBF7] min-h-screen flex flex-col font-sans text-stone-800 relative overflow-x-hidden">
        
        {/* --- FAIXA LATERAL ESQUERDA (Decorativa) --- */}
        {/* Só aparece em telas Extra Grandes (2xl: min 1536px) onde sobra espaço */}
        <div className="fixed left-8 top-0 bottom-0 w-20 hidden 2xl:flex items-center justify-center pointer-events-none z-0">
            {/* Rotaciona a faixa para ficar em pé */}
            <img 
                src="/faixa.png" 
                alt="Decoração" 
                className="-rotate-90 opacity-60 w-[80vh] max-w-none h-auto object-contain filter sepia-[0.2]" 
            />
        </div>

        {/* --- FAIXA LATERAL DIREITA (Decorativa) --- */}
        <div className="fixed right-8 top-0 bottom-0 w-20 hidden 2xl:flex items-center justify-center pointer-events-none z-0">
            <img 
                src="/faixa.png" 
                alt="Decoração" 
                className="rotate-90 opacity-60 w-[80vh] max-w-none h-auto object-contain filter sepia-[0.2]" 
            />
        </div>

        {/* --- CONTEÚDO PRINCIPAL --- */}
        {/* Z-Index 10 garante que o site fique ACIMA das faixas se a tela diminuir */}
        <div className="relative z-10 flex flex-col min-h-screen">
            <TopBar />
            <CustomerNav />

            <main className="container mx-auto px-4 py-6 flex-grow max-w-5xl">
              {children}
            </main>
        </div>

      </div>
    </CartProvider>
  );
}