// src/app/(shop)/especiais/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Loader2, ImageOff, MessageCircle, X, PlayCircle, Star, Calendar } from "lucide-react";
import { Product } from "@/types";
import ProductCardCarousel from "@/components/ProductCardCarousel";

export default function EspeciaisPage() {
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
      const msg = `Olá! Tenho interesse no evento/especial: *${product.name}*.`;
      window.open(`https://wa.me/5563981221181?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const openModal = (product: Product) => {
      setSelectedProduct(product);
      setCurrentImage(product.imageUrl || "");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  return (
    <div className="space-y-8 pb-24">
      {/* Banner Festivo */}
      <div className="relative rounded-3xl overflow-hidden bg-stone-900 shadow-xl shadow-stone-200 h-48 md:h-64 flex items-center justify-center text-center p-6">
          <div className="absolute inset-0 opacity-50 bg-[url('https://images.unsplash.com/photo-1519671482502-9759101d4561?q=80&w=2070')] bg-cover bg-center"></div>
          <div className="relative z-10 text-white max-w-xl">
              <span className="bg-orange-500/90 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block backdrop-blur-sm shadow-lg">Datas Especiais</span>
              <h1 className="text-3xl md:text-5xl font-bold mb-2 text-shadow">Eventos & Festas</h1>
              <p className="text-stone-100 text-sm md:text-base font-medium">Kits completos, buffets e edições limitadas para celebrar.</p>
          </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const allImages = [product.imageUrl, ...(product.gallery || [])].filter(Boolean);

          return (
            <div key={product.id} onClick={() => openModal(product)} className="group bg-white rounded-3xl p-3 border border-stone-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col gap-3">
              
              <div className="h-64 rounded-2xl overflow-hidden relative w-full bg-stone-100 shadow-inner">
                <ProductCardCarousel images={allImages} alt={product.name} />
                <div className="absolute top-3 right-3">
                    {product.videoUrl && <span className="bg-red-600/90 text-white p-1.5 rounded-full shadow-sm backdrop-blur-sm flex"><PlayCircle size={14}/></span>}
                </div>
              </div>

              <div className="flex-1 px-1">
                  <h4 className="font-bold text-stone-800 text-lg leading-tight mb-1">{product.name}</h4>
                  <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{product.description}</p>
              </div>

              <button onClick={(e) => { e.stopPropagation(); openWhatsApp(product); }} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-700 transition active:scale-95 shadow-lg shadow-orange-200">
                  <Calendar size={18}/> Reservar Data
              </button>
            </div>
          )
        })}
      </div>
      
      {products.length === 0 && (
          <div className="text-center py-20 text-stone-400">
              <Star size={48} className="mx-auto mb-2 opacity-20"/>
              <p>Nenhum evento especial ativo.</p>
          </div>
      )}

      {/* MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 p-4 animate-in fade-in backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setSelectedProduct(null)}></div>
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row animate-in slide-in-from-bottom-8">
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition"><X size={20}/></button>
                
                <div className="w-full md:w-3/5 bg-black flex flex-col justify-center relative">
                    <div className="flex-1 relative h-64 md:h-auto flex items-center justify-center bg-stone-900">
                        {currentImage ? <img src={currentImage} className="max-w-full max-h-full object-contain"/> : <ImageOff className="text-stone-700"/>}
                    </div>
                    <div className="p-4 bg-black/40 backdrop-blur-md overflow-x-auto flex gap-2 justify-center">
                        {[selectedProduct.imageUrl, ...(selectedProduct.gallery || [])].filter(Boolean).map((url, idx) => (
                            <button key={idx} onClick={() => setCurrentImage(url)} className={`w-14 h-14 rounded-lg border-2 overflow-hidden flex-shrink-0 transition-all ${currentImage === url ? 'border-orange-500 opacity-100 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                                <img src={url} className="w-full h-full object-cover"/>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full md:w-2/5 p-8 flex flex-col bg-white overflow-y-auto">
                    <h2 className="text-3xl font-bold text-stone-800 mb-4 leading-tight">{selectedProduct.name}</h2>
                    <div className="prose prose-sm text-stone-600 mb-6 flex-1"><p>{selectedProduct.description}</p></div>
                    
                    {selectedProduct.videoUrl && (
                        <a href={selectedProduct.videoUrl} target="_blank" rel="noopener noreferrer" className="mb-6 flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition border border-red-100 group">
                            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition"><PlayCircle size={24}/></div>
                            <div className="text-sm font-bold">Vídeo do Evento</div>
                        </a>
                    )}

                    <div className="mt-auto border-t border-stone-100 pt-6">
                        <button onClick={() => openWhatsApp(selectedProduct)} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-lg shadow-stone-200 hover:-translate-y-1">
                            <MessageCircle size={22}/> Falar com Buffet
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}