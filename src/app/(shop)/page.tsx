// src/app/(shop)/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useCart } from "@/context/CartContext";
import { Plus, Loader2, ShoppingBag, ImageOff } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
}

export default function ShopHome() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega produtos do Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, orderBy("name"));
        const snapshot = await getDocs(q);

        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];

        setProducts(items);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Agrupa por categoria
  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;
  }

  return (
    <div className="space-y-8 pb-20">
      {/* SEM HEADER AQUI - O TopBar do layout já cuida disso */}
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-pink-600 to-rose-500 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-1">Cardápio 🍔</h2>
        <p className="opacity-90 text-sm">Escolha suas delícias abaixo.</p>
      </div>

      {products.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          <ShoppingBag size={48} className="mx-auto mb-2 opacity-20"/>
          <p>Nenhum produto cadastrado.</p>
        </div>
      ) : (
        Object.entries(groupedProducts).map(([category, items]) => (
          <section key={category}>
            <h3 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-pink-600 pl-3 capitalize">
              {category}
            </h3>
            
            <div className="grid gap-4">
              {items.map((product) => (
                <div key={product.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                  {/* Imagem */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff className="m-auto mt-6 text-gray-300" size={20} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{product.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-green-600 text-sm">
                        {Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <button 
                        onClick={() => addToCart(product, 1)}
                        className="bg-pink-600 text-white p-2 rounded-full shadow hover:bg-pink-700 active:scale-90 transition-transform"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}