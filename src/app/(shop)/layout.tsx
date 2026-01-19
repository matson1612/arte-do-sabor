// src/app/(shop)/layout.tsx
"use client";

import { CartProvider } from "@/context/CartContext";
import ClientHeader from "@/components/ClientHeader"; // <--- NOVO HEADER

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="bg-[#FFFBF7] min-h-screen flex flex-col font-sans text-stone-800 relative">
        
        {/* Header Fixo com Menu */}
        <ClientHeader />

        {/* FAIXA ESQUERDA */}
        <div className="fixed top-20 left-0 bottom-0 hidden 2xl:flex items-center justify-center z-0 pointer-events-none"
             style={{ width: 'calc((100vw - 72rem) / 2)' }}>
            <div className="h-full w-full flex items-center justify-center opacity-80 mix-blend-multiply overflow-hidden">
                <img 
                    src="/faixa.png" 
                    alt="" 
                    className="rotate-90 min-w-[150vh] h-54 object-repeat object-center" 
                />
            </div>
        </div>

        {/* FAIXA DIREITA */}
        <div className="fixed top-20 right-0 bottom-0 hidden 2xl:flex items-center justify-center z-0 pointer-events-none"
             style={{ width: 'calc((100vw - 72rem) / 2)' }}>
            <div className="h-full w-full flex items-center justify-center opacity-80 mix-blend-multiply overflow-hidden">
                <img 
                    src="/faixa.png" 
                    alt="" 
                    className="rotate-90 min-w-[150vh] h-54 object-repeat object-center" 
                />
            </div>
        </div>

        {/* CONTEÚDO */}
        <main className="container mx-auto px-4 py-8 flex-grow max-w-6xl relative z-10">
          {children}
        </main>

      </div>
    </CartProvider>
  );
}