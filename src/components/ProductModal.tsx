// src/components/ProductModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Product, Option } from "@/types";
import { X, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Option[]>>({});

  // --- CONFIGURAÇÃO DE SCROLL DA PÁGINA ---
  // Se quiser que a página de trás FIQUE TRAVADA (padrão de apps), descomente as linhas abaixo.
  // Se quiser poder rolar a página de trás enquanto o modal está aberto, deixe comentado.
  
  /* useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]); 
  */

  if (!isOpen) return null;

  const toggleOption = (groupTitle: string, option: Option, maxSelection: number) => {
    setSelectedOptions((prev) => {
      const currentSelection = prev[groupTitle] || [];
      const isSelected = currentSelection.some((opt) => opt.name === option.name);

      if (maxSelection === 1) return { ...prev, [groupTitle]: [option] };

      if (isSelected) {
        return { ...prev, [groupTitle]: currentSelection.filter((opt) => opt.name !== option.name) };
      } else {
        if (currentSelection.length < maxSelection) {
          return { ...prev, [groupTitle]: [...currentSelection, option] };
        }
        return prev;
      }
    });
  };

  const optionsTotal = Object.values(selectedOptions).flat().reduce((acc, opt) => acc + opt.priceAdd, 0);
  const unitPrice = product.basePrice + optionsTotal;
  const finalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    addToCart(product, selectedOptions, quantity, unitPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fundo Escuro */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* CARTÃO DO MODAL */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* 1. TOPO (Fixo) */}
        <div className="relative h-48 bg-gray-100 shrink-0">
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 bg-white p-2 rounded-full shadow hover:bg-gray-100 transition z-10"
          >
            <X size={20} className="text-gray-700" />
          </button>
        </div>

        {/* 2. CONTEÚDO (Rola AQUI dentro) */}
        <div className="overflow-y-auto p-6 space-y-6 bg-white">
          
          {/* Título e Descrição */}
          <div>
            <h2 className="text-2xl font-extrabold text-gray-800">{product.name}</h2>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">{product.description}</p>
          </div>

          {/* Opções */}
          {product.complementGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{group.title}</h3>
                <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-200 text-gray-600 rounded">
                  {group.required ? "Obrigatório" : `Máx ${group.maxSelection}`}
                </span>
              </div>

              <div className="space-y-2">
                {group.options.map((option) => {
                  const isSelected = selectedOptions[group.title]?.some(o => o.name === option.name);
                  return (
                    <label 
                      key={option.name} 
                      className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                        isSelected ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500' : 'border-gray-200 hover:border-pink-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ? 'border-pink-500 bg-pink-500' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{option.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {option.priceAdd > 0 ? `+ R$ ${option.priceAdd.toFixed(2)}` : 'Grátis'}
                      </span>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={isSelected || false}
                        onChange={() => toggleOption(group.title, option, group.maxSelection)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 3. RODAPÉ (Fixo) */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                    <button 
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:text-pink-600 disabled:opacity-50"
                        disabled={quantity <= 1}
                    >
                        <Minus size={16} />
                    </button>
                    <span className="font-bold w-6 text-center text-gray-800">{quantity}</span>
                    <button 
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:text-pink-600"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <div className="text-right">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Total</span>
                    <div className="text-xl font-extrabold text-gray-900 leading-none">
                        R$ {finalPrice.toFixed(2)}
                    </div>
                </div>
            </div>

            <button 
              onClick={handleAddToCart}
              className="w-full bg-pink-600 text-white font-bold py-4 rounded-xl hover:bg-pink-700 active:scale-[0.98] transition-all shadow-lg shadow-pink-200 text-lg"
            >
                Adicionar
            </button>
        </div>
      </div>
    </div>
  );
}