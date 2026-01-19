// src/components/ProductCardCarousel.tsx
"use client";

import { useState, MouseEvent } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

interface ProductCardCarouselProps {
  images: string[];
  alt: string;
}

export default function ProductCardCarousel({ images, alt }: ProductCardCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Se não tem imagem
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-300">
        <ImageOff size={32} />
      </div>
    );
  }

  // Se só tem uma imagem
  if (images.length === 1) {
    return <img src={images[0]} alt={alt} className="w-full h-full object-cover" />;
  }

  const prevSlide = (e: MouseEvent) => {
    e.stopPropagation(); // Impede de abrir o modal ao clicar na seta
    setCurrentIndex((curr) => (curr === 0 ? images.length - 1 : curr - 1));
  };

  const nextSlide = (e: MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((curr) => (curr + 1) % images.length);
  };

  return (
    <div className="relative w-full h-full group">
      <img
        src={images[currentIndex]}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-500"
      />
      
      {/* Controles (Só aparecem no hover) */}
      <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={prevSlide}
          className="bg-white/80 backdrop-blur-sm p-1 rounded-full text-stone-800 hover:bg-white shadow-sm"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={nextSlide}
          className="bg-white/80 backdrop-blur-sm p-1 rounded-full text-stone-800 hover:bg-white shadow-sm"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Indicadores (Bolinhas) */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        {images.map((_, idx) => (
          <div
            key={idx}
            className={`w-1.5 h-1.5 rounded-full shadow-sm transition-all ${
              idx === currentIndex ? "bg-white scale-125" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}