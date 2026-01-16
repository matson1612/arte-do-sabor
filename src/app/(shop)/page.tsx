// src/app/(shop)/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore"; // Importações corretas
import { useCart } from "@/context/CartContext";
import { Plus, Loader2, ShoppingBag, ImageOff } from "lucide-react";

// Tipo do Produto
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
        // Correção do erro "Expected 2 arguments":
        // Criamos a referência da coleção e buscamos os documentos de forma simples
        const productsRef = collection(db, "products");
        const q = query(productsRef, orderBy("name")); // Ordena por nome (opcional)
        
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

  // Função para agrupar produtos por categoria
  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin text-pink-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      
      {/* ⚠️ ATENÇÃO: NÃO COLOCAMOS HEADER AQUI.
         A TopBar já está no layout.tsx.
         Aqui colocamos apenas o conteúdo da página (Banners, Produtos, etc).
      */}

      {/* Exemplo de Banner Promocional */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg mb-6">
        <h2 className="text-2xl font-bold mb-2">Ofertas do Dia 🍔</h2>
        <p className="opacity-90">Os melhores lanches com entrega rápida para você.</p>
      </div>

      {products.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          <ShoppingBag size={48} className="mx-auto mb-2 opacity-20"/>
          <p>Nenhum produto cadastrado ainda.</p>
        </div>
      ) : (
        // Lista de Categorias e Produtos
        Object.entries(groupedProducts).map(([category, items]) => (
          <section key={category}>
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-pink-600 pl-3 capitalize">
              {category}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((product) => (
                <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 hover:shadow-md transition-shadow">
                  {/* Imagem do Produto */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageOff size={24} />
                      </div>
                    )}
                  </div>

                  {/* Detalhes */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 line-clamp-1">{product.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                    </div>
                    
                    <div className="flex justify-between items-end mt-2">
                      <span className="font-bold text-green-600">
                        {Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      <button 
                        onClick={() => addToCart(product, 1)}
                        className="bg-pink-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-pink-700 active:scale-90 transition-transform shadow"
                      >
                        <Plus size={18} />
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