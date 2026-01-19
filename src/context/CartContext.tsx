// src/context/CartContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem } from "@/types";

// Tipo auxiliar para o item que VEM da loja (sem ID de carrinho ainda)
type CartEntry = Omit<CartItem, 'cartId' | 'quantity' | 'finalPrice'>;

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartEntry, quantity: number) => void; // <--- CORRIGIDO AQUI
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, newQuantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Carrega do localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cart_storage");
      if (saved) {
        try { setItems(JSON.parse(saved)); } 
        catch (e) { console.error("Erro ao carregar carrinho", e); }
      }
      setIsInitialized(true);
    }
  }, []);

  // 2. Salva no localStorage sempre que muda
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("cart_storage", JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const addToCart = (newItem: CartEntry, quantity: number) => {
    setItems((prev) => {
      // Verifica se já existe um item igual (mesmo ID de produto e mesmas opções)
      const existingIdx = prev.findIndex((i) => 
        i.id === newItem.id && 
        JSON.stringify(i.selectedOptions) === JSON.stringify(newItem.selectedOptions)
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        // Atualiza preço final
        updated[existingIdx].finalPrice = (updated[existingIdx].price || 0) * updated[existingIdx].quantity;
        return updated;
      }
      
      // Cria o item completo com ID único de carrinho
      const fullItem: CartItem = {
          ...newItem,
          quantity,
          cartId: crypto.randomUUID(),
          finalPrice: (newItem.price || 0) * quantity
      } as CartItem;

      return [...prev, fullItem];
    });
  };

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