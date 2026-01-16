// src/components/ProductCard.tsx
import { Product } from "@/types";
import Image from "next/image";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onClick: () => void; // <--- 1. Agora o componente aceita o click
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <div 
      onClick={onClick} // <--- 2. Ação de clicar no card
      className="group relative flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 active:scale-[0.98]"
    >
      
      {/* Imagem do Produto */}
      <div className="relative h-48 w-full bg-gray-100">
        <Image 
          src={product.imageUrl} 
          alt={product.name} 
          fill 
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Etiqueta de Preço Flutuante */}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-gray-800 shadow-sm">
          R$ {product.basePrice.toFixed(2)}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-gray-800 text-lg leading-tight line-clamp-1">
            {product.name}
          </h3>
        </div>
        
        <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-grow">
          {product.description}
        </p>

        {/* Botão de Ação (Visual apenas, pois o card todo é clicável) */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
          <span className="text-xs font-medium text-gray-400">
            A partir de R$ {product.basePrice.toFixed(2)}
          </span>
          <button className="bg-gray-100 p-2 rounded-full text-gray-600 group-hover:bg-pink-600 group-hover:text-white transition-colors">
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}