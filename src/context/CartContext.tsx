// src/context/CartContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem } from "@/types"; // Importa o tipo correto global

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem, quantity: number) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, newQuantity: number) => void; // <--- AGORA EXISTE
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carrega do localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cart_storage");
      if (saved) {
        try { setItems(JSON.parse(saved)); } 
        catch (e) { console.error("Erro no carrinho", e); }
      }
      setIsInitialized(true);
    }
  }, []);

  // Salva no localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("cart_storage", JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const addToCart = (newItem: CartItem, quantity: number) => {
    setItems((prev) => {
      // Procura item idêntico (mesmo produto E mesmas opções)
      const existingIdx = prev.findIndex((i) => 
        i.id === newItem.id && 
        JSON.stringify(i.selectedOptions) === JSON.stringify(newItem.selectedOptions)
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        // Atualiza preço final também
        updated[existingIdx].finalPrice = updated[existingIdx].price! * updated[existingIdx].quantity;
        return updated;
      }
      
      return [...prev, { ...newItem, quantity, cartId: crypto.randomUUID() }];
    });
  };

  // Função que faltava
  const updateQuantity = (cartId: string, newQuantity: number) => {
      if (newQuantity < 1) return;
      setItems(prev => prev.map(item => {
          if (item.cartId === cartId) {
              return { 
                  ...item, 
                  quantity: newQuantity,
                  finalPrice: (item.price || 0) * newQuantity
              };
          }
          return item;
      }));
  };

  const removeFromCart = (cartId: string) => {
    setItems((prev) => prev.filter((i) => i.cartId !== cartId));
  };

  const clearCart = () => setItems([]);

  const cartTotal = items.reduce((acc, item) => acc + (item.finalPrice || 0), 0);
  const cartCount = items.reduce((acc, item) => acc + (item.quantity || 0), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);