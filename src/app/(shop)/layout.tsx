// src/app/(shop)/layout.tsx
"use client";

import { CartProvider } from "@/context/CartContext";
import ClientHeader from "@/components/ClientHeader"; // Novo Header

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="bg-[#FFFBF7] min-h-screen flex flex-col font-sans text-stone-800 relative">
        
        {/* HEADER FIXO NO TOPO */}
        <ClientHeader />

        {/* --- ÁREA DAS FAIXAS LATERAIS (Só PC > 1536px) --- */}
        {/* A lógica aqui é: O site tem max-width 6xl (aprox 1150px). 
            O espaço vazio é (100% da tela - 1150px) / 2.
            Colocamos a faixa fixa nesse espaço. */}
        
        {/* FAIXA ESQUERDA */}
        <div className="fixed top-20 left-0 bottom-0 hidden 2xl:flex items-center justify-center z-0 pointer-events-none"
             style={{ width: 'calc((100vw - 72rem) / 2)' }}> {/* 72rem = max-w-6xl */}
            <div className="h-full w-full flex items-center justify-center opacity-80 mix-blend-multiply">
                {/* Rotacionada e esticada para parecer uma fita contínua */}
                <img 
                    src="/faixa.png" 
                    alt="" 
                    className="-rotate-90 scale-[1.6] min-w-[150vh] h-32 object-repeat object-center"
                />
            </div>
        </div>

        {/* FAIXA DIREITA */}
        <div className="fixed top-20 right-0 bottom-0 hidden 2xl:flex items-center justify-center z-0 pointer-events-none"
             style={{ width: 'calc((100vw - 72rem) / 2)' }}>
            <div className="h-full w-full flex items-center justify-center opacity-80 mix-blend-multiply">
                <img 
                    src="/faixa.png" 
                    alt="" 
                    className="-rotate-90 scale-[1.2] min-w-[150vh] h-25 object-repeat object-center"
                />
            </div>
        </div>

        {/* --- CONTEÚDO PRINCIPAL --- */}
        <main className="container mx-auto px-4 py-8 flex-grow max-w-6xl relative z-10">
          {children}
        </main>

      </div>
    </CartProvider>
  );
}