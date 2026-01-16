// src/app/(shop)/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useCart } from "@/context/CartContext";
import { Plus, Minus, Loader2, ShoppingBag, ImageOff, X } from "lucide-react";

// --- TIPOS ---
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
  
  // Estado para o Modal de Produto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  // --- BUSCA PRODUTOS ---
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, orderBy("name"));
        const snapshot = await getDocs(q);

        const items = snapshot.docs.map((doc) => {
          const data = doc.data();
          // TRATAMENTO DE PREÇO (Evita NaN)
          let price = data.price;
          if (typeof price === 'string') {
             price = parseFloat(price.replace(',', '.'));
          }
          if (!price || isNaN(price)) price = 0;

          return { id: doc.id, ...data, price };
        }) as Product[];

        setProducts(items);
      } catch (error) {
        console.error("Erro produtos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // --- AGRUPAR POR CATEGORIA ---
  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // --- ABRIR MODAL ---
  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
  };

  // --- ADICIONAR AO CARRINHO (Via Modal) ---
  const handleAddToCart = () => {
    if (selectedProduct) {
      addToCart(selectedProduct, quantity);
      setSelectedProduct(null); // Fecha modal
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;

  return (
    <div className="space-y-8 pb-24">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-pink-600 to-rose-500 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-1">Cardápio 🍔</h2>
        <p className="opacity-90 text-sm">Escolha suas delícias abaixo.</p>
      </div>

      {/* Lista de Produtos */}
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
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((product) => (
                <div 
                    key={product.id} 
                    onClick={() => openModal(product)} // Clicar no card abre o modal
                    className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3 cursor-pointer hover:border-pink-300 transition-colors"
                >
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff className="m-auto mt-8 text-gray-300" size={20} />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{product.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-green-600 text-sm">
                        {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <button className="bg-pink-50 text-pink-600 p-1.5 rounded-full">
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

      {/* --- MODAL DE DETALHES DO PRODUTO --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-10">
                
                {/* Botão Fechar */}
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 bg-black/20 text-white p-1 rounded-full hover:bg-black/40">
                    <X size={20}/>
                </button>

                {/* Imagem Grande */}
                <div className="h-48 bg-gray-100 relative">
                    {selectedProduct.imageUrl ? (
                         <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageOff size={40}/></div>
                    )}
                </div>

                {/* Conteúdo */}
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-800">{selectedProduct.name}</h2>
                    <p className="text-sm text-gray-500 mt-2 mb-4">{selectedProduct.description}</p>
                    <div className="text-2xl font-bold text-green-600 mb-6">
                        {selectedProduct.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>

                    {/* Controles de Quantidade e Adicionar */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center border rounded-lg overflow-hidden">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 hover:bg-gray-100 text-gray-600"><Minus size={18}/></button>
                            <span className="w-10 text-center font-bold">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-3 hover:bg-gray-100 text-pink-600"><Plus size={18}/></button>
                        </div>
                        
                        <button onClick={handleAddToCart} className="flex-1 bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700 active:scale-95 transition-transform flex justify-center items-center gap-2">
                            <span>Adicionar</span>
                            <span className="bg-pink-700 px-2 py-0.5 rounded text-xs">
                                {(selectedProduct.price * quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}