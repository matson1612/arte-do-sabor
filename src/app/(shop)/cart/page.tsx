// src/app/(shop)/cart/page.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Trash2, ArrowLeft, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { items, removeFromCart, cartTotal } = useCart();
  const { user, loginGoogle } = useAuth();

  if (items.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
            <ShoppingBag size={64} className="mb-4 text-gray-200"/>
            <p className="text-lg font-medium">Seu carrinho está vazio.</p>
            <Link href="/" className="mt-4 text-pink-600 font-bold hover:underline">
                Voltar ao Cardápio
            </Link>
        </div>
    );
  }

  return (
    <div className="pb-32 pt-2">
      <div className="flex items-center gap-2 mb-6 text-gray-500">
        <Link href="/"><ArrowLeft size={20}/></Link>
        <span className="font-bold text-gray-800">Resumo do Pedido</span>
      </div>
      
      <div className="space-y-4">
        {items.map(item => (
            <div key={item.cartId} className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm">
                <div>
                    <p className="font-bold text-gray-800">{item.quantity}x {item.name}</p>
                    <p className="text-sm text-green-600 font-bold">R$ {item.finalPrice.toFixed(2)}</p>
                </div>
                <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 p-2 hover:bg-red-50 rounded-full">
                    <Trash2 size={18}/>
                </button>
            </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-lg">
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between text-xl font-bold mb-4 text-gray-800">
                <span>Total</span>
                <span>R$ {cartTotal.toFixed(2)}</span>
            </div>
            
            {!user ? (
                <button onClick={() => loginGoogle()} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">
                    Entrar para Finalizar
                </button>
            ) : (
                <button className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700">
                    Finalizar Pedido
                </button>
            )}
        </div>
      </div>
    </div>
  );
}