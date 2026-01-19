// src/app/(shop)/especiais/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Loader2, ImageOff, MessageCircle, X, PlayCircle, ImageIcon } from "lucide-react";
import { Product } from "@/types";

export default function EncomendasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImage, setCurrentImage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(query(collection(db, "products"), orderBy("name")));
        const items = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Product))
            .filter(p => p.salesChannel === 'evento' && p.isAvailable);
        setProducts(items);
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const openWhatsApp = (product: Product) => {
      const msg = `Olá! Gostaria de fazer um orçamento do produto: *${product.name}* (Visto na área de Encomendas).`;
      window.open(`https://wa.me/5563981221181?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const openModal = (product: Product) => {
      setSelectedProduct(product);
      setCurrentImage(product.imageUrl || "");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;

  return (
    <div className="space-y-6 p-4">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-1">Eventos Especiais 🎂</h2>
        <p className="opacity-90 text-sm">Bolos artísticos, doces finos e tudo para sua festa. Clique para detalhes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} onClick={() => openModal(product)} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 cursor-pointer hover:shadow-md transition group">
            <div className="h-56 bg-gray-100 rounded-lg overflow-hidden relative w-full">
              {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <ImageOff className="m-auto mt-24 text-gray-300" size={40} />}
              {/* Badges de Mídia */}
              <div className="absolute bottom-2 right-2 flex gap-1">
                  {product.gallery && product.gallery.length > 0 && <span className="bg-black/50 text-white px-2 py-1 rounded text-[10px] flex items-center gap-1 backdrop-blur-sm"><ImageIcon size={10}/> +{product.gallery.length}</span>}
                  {product.videoUrl && <span className="bg-red-600/80 text-white px-2 py-1 rounded text-[10px] flex items-center gap-1 backdrop-blur-sm"><PlayCircle size={10}/> Vídeo</span>}
              </div>
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-lg">{product.name}</h4>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
            </div>
            <div className="text-purple-600 font-bold text-sm mt-2">Ver Detalhes & Orçar</div>
          </div>
        ))}
      </div>
      {products.length === 0 && <p className="text-center text-gray-400 py-10">Nenhuma encomenda cadastrada.</p>}

      {/* MODAL VITRINE */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setSelectedProduct(null)}></div>
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row">
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 bg-black/40 text-white p-1 rounded-full hover:bg-black/60"><X size={24}/></button>
                
                {/* Lado Esquerdo: Mídia */}
                <div className="w-full md:w-1/2 bg-black flex flex-col">
                    <div className="flex-1 relative h-64 md:h-auto bg-black flex items-center justify-center">
                        {currentImage ? <img src={currentImage} className="max-w-full max-h-full object-contain"/> : <ImageOff className="text-gray-600"/>}
                    </div>
                    {/* Miniaturas da Galeria */}
                    {(selectedProduct.gallery && selectedProduct.gallery.length > 0) && (
                        <div className="flex gap-2 p-2 overflow-x-auto bg-black/90">
                            <button onClick={() => setCurrentImage(selectedProduct.imageUrl)} className={`w-16 h-16 flex-shrink-0 rounded border-2 overflow-hidden ${currentImage === selectedProduct.imageUrl ? 'border-purple-500' : 'border-transparent'}`}><img src={selectedProduct.imageUrl} className="w-full h-full object-cover"/></button>
                            {selectedProduct.gallery.map((url, idx) => (
                                <button key={idx} onClick={() => setCurrentImage(url)} className={`w-16 h-16 flex-shrink-0 rounded border-2 overflow-hidden ${currentImage === url ? 'border-purple-500' : 'border-transparent'}`}><img src={url} className="w-full h-full object-cover"/></button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lado Direito: Info */}
                <div className="w-full md:w-1/2 p-6 flex flex-col bg-white overflow-y-auto">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedProduct.name}</h2>
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">{selectedProduct.description}</p>
                    
                    {selectedProduct.videoUrl && (
                        <a href={selectedProduct.videoUrl} target="_blank" rel="noopener noreferrer" className="mb-6 flex items-center gap-3 p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-100">
                            <PlayCircle size={24}/>
                            <div className="text-sm font-bold">Assistir Vídeo Demonstrativo</div>
                        </a>
                    )}

                    <div className="mt-auto">
                        <p className="text-xs text-gray-400 mb-2 text-center">Valores e personalização sob consulta.</p>
                        <button onClick={() => openWhatsApp(selectedProduct)} className="w-full bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition shadow-lg shadow-green-200">
                            <MessageCircle size={24}/> Falar com Atendente
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}