"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  cartId: string;
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  finalPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: any, quantity: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  // Inicializa sempre como array vazio para evitar erro de undefined
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega do LocalStorage com segurança
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verifica se é realmente uma lista (Array). Se não for, reseta.
        if (Array.isArray(parsed)) {
          setItems(parsed);
        } else {
          console.warn("Carrinho corrompido, resetando...");
          localStorage.removeItem("cart");
          setItems([]);
        }
      }
    } catch (error) {
      console.error("Erro ao ler carrinho:", error);
      localStorage.removeItem("cart");
      setItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Salva no LocalStorage sempre que muda (só depois de ter carregado a primeira vez)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, isLoaded]);

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
    localStorage.removeItem("cart");
  };

  // Garante que items é um array antes de calcular
  const safeItems = Array.isArray(items) ? items : [];
  
  const cartTotal = safeItems.reduce((acc, item) => acc + (item.finalPrice || 0), 0);
  const cartCount = safeItems.reduce((acc, item) => acc + (item.quantity || 0), 0);

  return (
    <CartContext.Provider value={{ items: safeItems, addToCart, removeFromCart, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart deve ser usado dentro de CartProvider");
  return context;
};