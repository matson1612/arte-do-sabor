// src/app/(shop)/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Plus, X, Minus, ImageOff, ChefHat, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { getProducts } from "@/services/productService";
import { getAllGroups } from "@/services/complementService";
import { Product, ComplementGroup, Option } from "@/types";

export default function ShopPage() {
  const { addToCart, items } = useCart();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [allGroups, setAllGroups] = useState<ComplementGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [currentOptions, setCurrentOptions] = useState<Record<string, Option[]>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const [pData, gData] = await Promise.all([getProducts(), getAllGroups()]);
        setProducts(pData.filter(p => p.isAvailable));
        setAllGroups(gData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setCurrentOptions({});
    setIsModalOpen(true);
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    let total = selectedProduct.basePrice;
    Object.values(currentOptions).forEach(opts => {
        opts.forEach(opt => total += (opt.priceAdd || 0));
    });
    return total * quantity;
  };

  const handleOptionToggle = (group: ComplementGroup, option: Option) => {
    const currentSelected = currentOptions[group.id] || [];
    const isSelected = currentSelected.find(o => o.id === option.id);
    let newSelected = [];

    if (isSelected) {
        newSelected = currentSelected.filter(o => o.id !== option.id);
    } else {
        if (group.maxSelection === 1) {
            newSelected = [option];
        } else {
            if (currentSelected.length < group.maxSelection) newSelected = [...currentSelected, option];
            else return alert(`Máximo de ${group.maxSelection} opções.`);
        }
    }
    setCurrentOptions({ ...currentOptions, [group.id]: newSelected });
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const productGroups = allGroups.filter(g => selectedProduct.complementGroupIds?.includes(g.id));
    
    for (const group of productGroups) {
        if (group.required) {
            if ((currentOptions[group.id]?.length || 0) === 0) {
                return alert(`Selecione uma opção em: ${group.title}`);
            }
        }
    }

    addToCart(selectedProduct, quantity, currentOptions, calculateTotal() / quantity);
    setIsModalOpen(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-pink-600 flex items-center gap-2"><ChefHat /> Arte do Sabor</h1>
        {items.length > 0 && (
            <Link href="/cart" className="relative p-2 bg-pink-50 text-pink-600 rounded-full hover:bg-pink-100 transition">
                <ShoppingBag size={24} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">{items.length}</span>
            </Link>
        )}
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Destaques do Dia</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map(product => (
                <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 cursor-pointer hover:border-pink-300 transition" onClick={() => openProduct(product)}>
                    <div className="w-24 h-24 bg-gray-100 rounded-lg shrink-0 overflow-hidden relative flex items-center justify-center">
                        {product.imageUrl && product.imageUrl.startsWith('http') ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                        ) : <ImageOff className="text-gray-300" />}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800 line-clamp-1">{product.name}</h3>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description || "Sem descrição."}</p>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                            <span className="font-bold text-lg text-gray-800">R$ {product.basePrice.toFixed(2)}</span>
                            <div className="bg-pink-600 text-white p-2 rounded-full shadow-lg"><Plus size={18} /></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </main>

      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                <div className="relative h-48 sm:h-56 bg-gray-200 shrink-0">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 bg-white/80 p-2 rounded-full z-10 hover:bg-white text-gray-700"><X size={20}/></button>
                    {selectedProduct.imageUrl && selectedProduct.imageUrl.startsWith('http') ? (
                        <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                    ) : <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageOff size={48}/></div>}
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{selectedProduct.name}</h2>
                        <p className="text-gray-500 text-sm mt-2">{selectedProduct.description}</p>
                    </div>
                    {selectedProduct.complementGroupIds?.map(groupId => {
                        const group = allGroups.find(g => g.id === groupId);
                        if (!group) return null;
                        return (
                            <div key={group.id} className="space-y-3">
                                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg"><h3 className="font-bold text-gray-700">{group.title}</h3><div className="text-xs px-2 py-1 rounded bg-white border">{group.required ? <span className="text-red-500 font-bold">Obrigatório</span> : "Opcional"}</div></div>
                                <div className="space-y-2">
                                    {group.options.map(opt => {
                                        const isSelected = currentOptions[group.id]?.find(o => o.id === opt.id);
                                        return (
                                            <div key={opt.id} onClick={() => handleOptionToggle(group, opt)} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer ${isSelected ? "border-pink-500 bg-pink-50" : "border-gray-100"}`}>
                                                <div className="flex items-center gap-3"><div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "bg-pink-600 border-pink-600" : "border-gray-300"}`}>{isSelected && <div className="w-2 h-2 bg-white rounded-full" />}</div><span className="text-sm font-medium">{opt.name}</span></div><span className="text-sm font-bold text-gray-500">{opt.priceAdd > 0 ? `+ R$ ${opt.priceAdd.toFixed(2)}` : 'Grátis'}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="p-4 border-t bg-white">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center border rounded-lg h-12"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-full flex items-center justify-center hover:bg-gray-100"><Minus size={18}/></button><span className="w-10 text-center font-bold">{quantity}</span><button onClick={() => setQuantity(quantity + 1)} className="w-12 h-full flex items-center justify-center hover:bg-gray-100"><Plus size={18}/></button></div>
                        <button onClick={handleAddToCart} className="flex-1 h-12 bg-pink-600 text-white rounded-lg font-bold flex items-center justify-between px-6 hover:bg-pink-700"><span>Adicionar</span><span>R$ {calculateTotal().toFixed(2)}</span></button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}