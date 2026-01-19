// src/components/HeroCarousel.tsx
"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function HeroCarousel({ products }: { products: Product[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Filtra apenas produtos que têm imagem
  const highlights = products.filter(p => p.imageUrl).slice(0, 5);

  useEffect(() => {
    if (highlights.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % highlights.length);
    }, 4000); // Muda a cada 4 segundos
    return () => clearInterval(interval);
  }, [highlights.length]);

  if (highlights.length === 0) return null;

  const prevSlide = () => setCurrentIndex((curr) => (curr === 0 ? highlights.length - 1 : curr - 1));
  const nextSlide = () => setCurrentIndex((curr) => (curr + 1) % highlights.length);

  return (
    <div className="relative w-full h-[280px] md:h-[400px] rounded-3xl overflow-hidden shadow-xl shadow-stone-200 mb-8 group">
      {/* Imagens */}
      <div 
        className="flex transition-transform duration-700 ease-out h-full" 
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {highlights.map((product) => (
          <div key={product.id} className="min-w-full h-full relative">
            {/* Imagem de Fundo com Gradiente */}
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent flex items-end p-8">
              <div className="text-white transform transition-all duration-500 translate-y-0">
                <span className="bg-pink-500/90 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block shadow-sm">
                  Destaque
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-1 leading-tight">{product.name}</h2>
                <p className="text-stone-200 text-sm md:text-base line-clamp-1 opacity-90">{product.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controles (Aparecem no hover) */}
      <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition hover:bg-white hover:text-stone-800">
        <ChevronLeft size={24}/>
      </button>
      <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition hover:bg-white hover:text-stone-800">
        <ChevronRight size={24}/>
      </button>

      {/* Indicadores (Bolinhas) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {highlights.map((_, idx) => (
          <div 
            key={idx} 
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-300 ${currentIndex === idx ? "w-8 bg-pink-500" : "bg-white/50 hover:bg-white"}`}
          />
        ))}
      </div>
    </div>
  );
}