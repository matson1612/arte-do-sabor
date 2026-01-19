// src/app/(shop)/layout.tsx
"use client";

import { CartProvider } from "@/context/CartContext";
import TopBar from "@/components/TopBar"; 
import CustomerNav from "@/components/CustomerNav";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="bg-[#FFFBF7] min-h-screen flex flex-col font-sans text-stone-800">
        <TopBar />
        <CustomerNav />
        <main className="container mx-auto px-4 py-6 flex-grow max-w-5xl">
          {children}
        </main>
      </div>
    </CartProvider>
  );
}