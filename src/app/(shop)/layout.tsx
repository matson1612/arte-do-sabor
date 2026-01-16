// src/app/(shop)/layout.tsx
"use client"; // <--- Transforme o layout em Client Component para usar o Contexto

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CartProvider, useCart } from "@/context/CartContext"; // <--- Importe

// Pequeno componente interno para consumir o hook useCart (pois o Provider está no pai)
function Navbar() {
  const { cartCount } = useCart(); // <--- Número real!

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-pink-600 tracking-tight">
          ArteDoSabor
        </Link>
        
        <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ShoppingBag className="w-6 h-6 text-gray-700" />
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce-short">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider> {/* Envolvendo a app */}
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-6 flex-grow">
          {children}
        </main>
      </div>
    </CartProvider>
  );
}