// src/context/CartContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CartItem, Product, Option } from "@/types";
import { useAuth } from "@/context/AuthContext"; // Importamos o Auth para saber se tem usuário

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, selectedOptions: Record<string, Option[]>, finalPrice: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  cartTotal: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth(); // Pegamos o usuário logado
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. CARREGAR CARRINHO (Apenas se tiver usuário)
  useEffect(() => {
    if (authLoading) return; // Espera o Auth decidir se está logado ou não

    if (!user) {
      // SE NÃO TIVER LOGADO: Começa vazio (RAM apenas)
      // Isso resolve o bug dos 6 itens, pois ignoramos o localStorage antigo
      setItems([]); 
      setIsLoaded(true);
      return;
    }

    // SE TIVER LOGADO: Tenta buscar o carrinho ESPECÍFICO desse usuário
    const storageKey = `cart_${user.uid}`; // Chave única por usuário
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validação de Segurança: Só aceita se for array válido
        if (Array.isArray(parsed)) {
            setItems(parsed);
        } else {
            setItems([]); // Se estiver corrompido, limpa
        }
      } catch (e) {
        console.error("Erro ao ler carrinho:", e);
        setItems([]);
      }
    }
    setIsLoaded(true);
  }, [user, authLoading]);

  // 2. SALVAR CARRINHO (Apenas se tiver usuário)
  useEffect(() => {
    if (!isLoaded) return; // Não salva enquanto não terminar de carregar

    // Calcula total
    const total = items.reduce((acc, item) => acc + ((item.finalPrice || 0) * (item.quantity || 1)), 0);
    setCartTotal(total);

    if (user) {
      // Salva persistente apenas se logado
      const storageKey = `cart_${user.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(items));
    }
    // Se não tiver user, não fazemos nada (fica só na memória do estado 'items')

  }, [items, user, isLoaded]);

  const addToCart = (product: Product, q: number, opts: Record<string, Option[]>, price: number) => {
    const newItem: CartItem = {
      ...product,
      cartId: crypto.randomUUID(),
      selectedOptions: opts,
      quantity: q,
      finalPrice: price
    };
    setItems([...items, newItem]);
  };

  const removeFromCart = (id: string) => {
    setItems(items.filter(i => i.cartId !== id));
  };
  
  const clearCart = () => {
    setItems([]);
    if (user) {
        localStorage.removeItem(`cart_${user.uid}`);
    }
  };

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);