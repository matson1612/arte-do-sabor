"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Definição do Tipo do Item
export interface CartItem {
  cartId: string;
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  finalPrice: number;
}

// Definição do que o Contexto oferece (Adicionamos cartCount aqui)
interface CartContextType {
  items: CartItem[];
  addToCart: (item: any, quantity: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number; // <--- O ERRO ESTAVA AQUI (Faltava essa linha)
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Carrega do LocalStorage ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) setItems(JSON.parse(saved));
  }, []);

  // Salva no LocalStorage sempre que muda
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product: any, quantity: number) => {
    const newItem: CartItem = {
      cartId: Math.random().toString(36).substr(2, 9),
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.imageUrl,
      finalPrice: product.price * quantity,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeFromCart = (cartId: string) => {
    setItems((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const clearCart = () => {
    setItems([]);
  };

  // Cálculos Automáticos
  const cartTotal = items.reduce((acc, item) => acc + item.finalPrice, 0);
  
  // A SOMA DA QUANTIDADE TOTAL DE ITENS
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart deve ser usado dentro de CartProvider");
  return context;
};