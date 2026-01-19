// src/app/(shop)/encomendas/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Loader2, ImageOff, MessageCircle } from "lucide-react";
import { Product } from "@/types";

export default function EncomendasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(query(collection(db, "products"), orderBy("name")));
        // Filtra apenas ENCOMENDAS
        const items = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Product))
            .filter(p => p.salesChannel === 'encomenda' && p.isAvailable);
        setProducts(items);
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const openWhatsApp = (product: Product) => {
      const msg = `Olá! Gostaria de fazer uma encomenda do produto: *${product.name}* (Visto na vitrine).`;
      window.open(`https://wa.me/5563981221181?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;

  return (
    <div className="space-y-6 p-4">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-1">Encomendas 🎂</h2>
        <p className="opacity-90 text-sm">Bolos inteiros, tortas e pedidos especiais. Fale conosco!</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3">
            <div className="h-48 bg-gray-100 rounded-lg overflow-hidden relative w-full">
              {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" /> : <ImageOff className="m-auto mt-20 text-gray-300" size={40} />}
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-lg">{product.name}</h4>
                <p className="text-sm text-gray-500 mt-1 line-clamp-3">{product.description}</p>
                <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-400">A partir de</span>
                    <span className="font-bold text-lg text-purple-600">R$ {product.basePrice.toFixed(2)}</span>
                </div>
            </div>
            <button onClick={() => openWhatsApp(product)} className="w-full bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition">
                <MessageCircle size={20}/> Encomendar no WhatsApp
            </button>
          </div>
        ))}
      </div>
      {products.length === 0 && <p className="text-center text-gray-400 py-10">Nenhuma opção de encomenda cadastrada ainda.</p>}
    </div>
  );
}