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
        <div className="p-10 text-center">
            <ShoppingBag className="mx-auto text-gray-300 mb-4" size={48}/>
            <p>Seu carrinho está vazio.</p>
            <Link href="/" className="text-pink-600 font-bold mt-4 inline-block">Voltar ao Cardápio</Link>
        </div>
    );
  }

  return (
    <div className="pb-40 pt-6 px-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Meu Carrinho (Modo Simples)</h1>
      
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
        {items.map(item => (
            <div key={item.cartId} className="flex justify-between items-center border-b pb-4">
                <div>
                    <p className="font-bold">{item.quantity}x {item.name}</p>
                    <p className="text-sm text-gray-500">R$ {item.finalPrice.toFixed(2)}</p>
                </div>
                <button onClick={() => removeFromCart(item.cartId)} className="text-red-500">
                    <Trash2 size={18}/>
                </button>
            </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex justify-between text-xl font-bold mb-4">
            <span>Total</span>
            <span>R$ {cartTotal.toFixed(2)}</span>
        </div>
        
        {!user ? (
            <button onClick={() => loginGoogle()} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold">
                Fazer Login para Continuar
            </button>
        ) : (
            <button className="w-full bg-green-600 text-white py-4 rounded-xl font-bold">
                Finalizar (Em Breve)
            </button>
        )}
      </div>
    </div>
  );
}