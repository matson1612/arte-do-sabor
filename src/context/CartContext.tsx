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
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // CARREGAMENTO SEGURO (ANTI-CRASH)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Sanitização: Garante que todo item tenha preço numérico
          const safeItems = parsed.map((item: any) => ({
            ...item,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            finalPrice: Number(item.finalPrice) || 0,
            name: item.name || "Produto sem nome"
          }));
          setItems(safeItems);
        }
      }
    } catch (error) {
      console.error("Carrinho corrompido resetado.", error);
      localStorage.removeItem("cart");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addToCart = (product: any, quantity: number) => {
    const price = Number(product.price) || 0;
    const finalPrice = price * quantity;

    const newItem: CartItem = {
      cartId: Math.random().toString(36).substr(2, 9),
      id: product.id,
      name: product.name,
      price: price,
      quantity: quantity,
      imageUrl: product.imageUrl,
      finalPrice: finalPrice,
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

  // Garante cálculos matemáticos seguros
  const safeItems = Array.isArray(items) ? items : [];
  const cartTotal = safeItems.reduce((acc, item) => acc + (Number(item.finalPrice) || 0), 0);
  const cartCount = safeItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

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