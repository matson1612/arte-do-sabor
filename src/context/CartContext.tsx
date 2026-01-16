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
  // 1. Começamos SEMPRE com array vazio para evitar erro na tela
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 2. Só acessamos o LocalStorage depois que a página carregou (useEffect)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cart");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Sanitização: Garante que preço e qtd sejam números
            const cleanItems = parsed.map((i: any) => ({
                ...i,
                price: Number(i.price) || 0,
                quantity: Number(i.quantity) || 1,
                finalPrice: (Number(i.price) || 0) * (Number(i.quantity) || 1)
            }));
            setItems(cleanItems);
          }
        }
      } catch (error) {
        console.error("Erro ao recuperar carrinho, resetando.", error);
        localStorage.removeItem("cart");
      } finally {
        setIsInitialized(true);
      }
    }
  }, []);

  // 3. Salva mudanças (apenas após inicializado)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const addToCart = (product: any, quantity: number) => {
    const price = Number(product.price) || 0;
    const newItem: CartItem = {
      cartId: Math.random().toString(36).substr(2, 9),
      id: product.id,
      name: product.name,
      price: price,
      quantity: quantity,
      imageUrl: product.imageUrl,
      finalPrice: price * quantity,
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

  const cartTotal = items.reduce((acc, item) => acc + (item.finalPrice || 0), 0);
  const cartCount = items.reduce((acc, item) => acc + (item.quantity || 0), 0);

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