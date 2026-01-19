// src/app/(shop)/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Plus, Minus, Loader2, ShoppingBag, ImageOff, X, CheckSquare, MessageSquare, ArrowRight, AlertCircle } from "lucide-react";
import { Product, ComplementGroup, Option, Category } from "@/types";
import HeroCarousel from "@/components/HeroCarousel";

export default function ShopHome() {
  const { addToCart } = useCart();
  const { profile } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Option[]>>({});

  const getPrice = (item: Product) => {
    if (profile?.clientType === 'reseller' && item.priceReseller && item.priceReseller > 0) return item.priceReseller;
    if (profile?.clientType === 'monthly' && item.pricePostpaid && item.pricePostpaid > 0) return item.pricePostpaid;
    return item.basePrice || 0;
  };

  const getOptionPrice = (opt: Option) => {
      if (profile?.clientType === 'reseller' && opt.priceAddReseller !== undefined) return opt.priceAddReseller;
      if (profile?.clientType === 'monthly' && opt.priceAddPostpaid !== undefined) return opt.priceAddPostpaid;
      return opt.priceAdd;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsSnap, groupsSnap, catsSnap] = await Promise.all([
            getDocs(query(collection(db, "products"), orderBy("name"))),
            getDocs(collection(db, "complement_groups")),
            getDocs(query(collection(db, "categories"), orderBy("order")))
        ]);

        const productMap = new Map<string, Product>();
        productsSnap.docs.forEach(doc => { productMap.set(doc.id, { id: doc.id, ...doc.data() } as Product); });

        const groupsMap: Record<string, ComplementGroup> = {};
        groupsSnap.docs.forEach(doc => {
            const groupData = doc.data() as ComplementGroup;
            const hydratedOptions = groupData.options?.map(opt => {
                if (opt.linkedProductId && productMap.has(opt.linkedProductId)) {
                    const linkedProd = productMap.get(opt.linkedProductId)!;
                    return {
                        ...opt,
                        name: linkedProd.name,
                        stock: linkedProd.stock,
                        isAvailable: linkedProd.isAvailable,
                        priceAdd: linkedProd.basePrice,
                        priceAddPostpaid: linkedProd.pricePostpaid,
                        priceAddReseller: linkedProd.priceReseller
                    };
                }
                return opt;
            });
            groupsMap[doc.id] = { id: doc.id, ...groupData, options: hydratedOptions || [] };
        });

        const items = Array.from(productMap.values()).map((p) => {
          const channel = p.salesChannel || 'delivery';
          const groupIds = p.complementGroupIds || [];
          const loadedGroups = groupIds.map((id: string) => groupsMap[id]).filter(Boolean);
          return { ...p, salesChannel: channel, fullGroups: loadedGroups };
        });

        setProducts(items);
        setCategories(catsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));

      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const visibleProducts = products.filter(p => {
      if (p.salesChannel === 'encomenda' || p.salesChannel === 'evento') return false;
      if (!p.isAvailable) return false;
      if (profile?.clientType === 'reseller') return p.availableReseller !== false;
      if (profile?.clientType === 'monthly') return p.availablePostpaid !== false;
      return p.availableStandard !== false;
  });

  const groupedProducts: Record<string, Product[]> = {};
  categories.forEach(cat => groupedProducts[cat.id] = []);
  groupedProducts['uncategorized'] = [];

  visibleProducts.forEach(p => {
      const catId = p.category || 'uncategorized';
      if (groupedProducts[catId]) {
          groupedProducts[catId].push(p);
      } else {
          groupedProducts['uncategorized'].push(p);
      }
  });

  const catsToRender = [
      ...categories, 
      { id: 'uncategorized', name: 'Geral', order: 999 }
  ].filter(c => groupedProducts[c.id] && groupedProducts[c.id].length > 0);

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setObservation("");
    setSelectedOptions({});
  };

  const toggleOption = (group: ComplementGroup, option: Option) => {
    const currentSelected = selectedOptions[group.id] || [];
    const isAlreadySelected = currentSelected.find(o => o.id === option.id);
    let newSelection = [];
    if (isAlreadySelected) newSelection = currentSelected.filter(o => o.id !== option.id);
    else {
        if (group.maxSelection === 1) newSelection = [option];
        else {
            if (currentSelected.length >= group.maxSelection) return alert(`Máximo de ${group.maxSelection} opções.`);
            newSelection = [...currentSelected, option];
        }
    }
    setSelectedOptions({ ...selectedOptions, [group.id]: newSelection });
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    let total = getPrice(selectedProduct);
    Object.values(selectedOptions).flat().forEach(opt => total += getOptionPrice(opt));
    return total * quantity;
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    if (selectedProduct.stock !== null && selectedProduct.stock <= 0) return alert("Produto esgotado.");

    const missingRequired = selectedProduct.fullGroups?.find(g => g.required && (!selectedOptions[g.id] || selectedOptions[g.id].length === 0));
    if (missingRequired) return alert(`Grupo "${missingRequired.title}" é obrigatório.`);

    let customName = selectedProduct.name;
    const allSelectedOpts = Object.values(selectedOptions).flat();
    if (allSelectedOpts.length > 0) { const optNames = allSelectedOpts.map(o => o.name).join(', '); customName += ` (+ ${optNames})`; }
    if (observation.trim()) customName += ` [Obs: ${observation}]`;

    addToCart({ ...selectedProduct, name: customName, price: calculateTotal() / quantity, selectedOptions: selectedOptions }, quantity);
    setSelectedProduct(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-500" size={40}/></div>;

  return (
    <div className="space-y-10 pb-24">
      <HeroCarousel products={products} onProductClick={openModal} />
      
      {visibleProducts.length === 0 ? (
        <div className="text-center text-stone-400 py-20"><ShoppingBag size={48} className="mx-auto mb-4 opacity-20"/><p>Nenhuma delícia disponível agora.</p></div>
      ) : (
        catsToRender.map((category) => {
            const items = groupedProducts[category.id].sort((a, b) => {
                const aStock = a.stock !== null && a.stock <= 0 ? 0 : 1;
                const bStock = b.stock !== null && b.stock <= 0 ? 0 : 1;
                return bStock - aStock;
            });

            return (
              <section key={category.id}>
                <div className="flex items-center gap-4 mb-6"><h3 className="text-2xl font-bold text-stone-800 capitalize tracking-tight">{category.name}</h3><div className="h-[1px] flex-1 bg-stone-200"></div></div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((product) => {
                    const isOutOfStock = product.stock !== null && product.stock <= 0;
                    return (
                      <div key={product.id} onClick={() => openModal(product)} className={`group bg-white rounded-3xl p-3 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-stone-50 relative overflow-hidden flex gap-4 cursor-pointer ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}>
                        {isOutOfStock && <div className="absolute inset-0 z-20 bg-stone-100/50 backdrop-blur-[1px] flex items-center justify-center"><span className="bg-stone-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Esgotado</span></div>}
                        <div className="w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-stone-100 relative shadow-inner">{product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" /> : <ImageOff className="m-auto mt-10 text-stone-300" size={24} />}</div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div><h4 className="font-bold text-stone-800 text-lg leading-tight line-clamp-2 mb-1">{product.name}</h4><p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{product.description}</p></div>
                            <div className="flex justify-between items-end mt-2"><div className="flex flex-col"><span className="text-[10px] text-stone-400 font-bold uppercase">A partir de</span><span className="font-bold text-lg text-emerald-600">{getPrice(product).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>{!isOutOfStock && <button className="bg-stone-900 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-pink-600 transition-colors"><Plus size={16} /></button>}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
        })
      )}
      
      {/* --- MODAL RESPONSIVO (CORRIGIDO) --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center md:items-start justify-center bg-stone-900/60 p-4 md:pt-24 animate-in fade-in duration-300 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setSelectedProduct(null)}></div>
            
            {/* Ajuste de Altura Máxima para Mobile (85vh) vs Desktop (calc) */}
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-8 duration-300 max-h-[85vh] md:max-h-[calc(100vh-120px)] overflow-y-auto flex flex-col">
                
                {/* Imagem do Produto: Menor no Mobile (h-48), Maior no PC (h-64) */}
                <div className="h-48 md:h-64 bg-stone-100 relative flex-shrink-0">
                    <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 bg-white/80 backdrop-blur text-stone-800 p-2 rounded-full hover:bg-white shadow-sm transition"><X size={20}/></button>
                    {selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-300"><ImageOff size={40}/></div>}
                    
                    {/* Alerta de Esgotado */}
                    {selectedProduct.stock !== null && selectedProduct.stock <= 0 && (
                        <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                            <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold uppercase shadow-lg flex items-center gap-2">
                                <AlertCircle size={20}/> Produto Esgotado
                            </span>
                        </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
                </div>

                <div className="p-6 pt-0 space-y-6 flex-1 overflow-y-auto">
                    <div>
                        <h2 className="text-2xl font-bold text-stone-800 mb-1">{selectedProduct.name}</h2>
                        <p className="text-stone-500 text-sm leading-relaxed">{selectedProduct.description}</p>
                    </div>

                    {selectedProduct.fullGroups?.map(group => (
                        <div key={group.id} className="space-y-3">
                            <div className="flex justify-between items-center border-b border-stone-100 pb-2"><h3 className="font-bold text-stone-700 text-sm">{group.title}</h3><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${group.required ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500'}`}>{group.required ? 'OBRIGATÓRIO' : 'OPCIONAL'}</span></div>
                            <div className="space-y-2">{group.options.map(opt => { 
                                const isSelected = selectedOptions[group.id]?.some(o => o.id === opt.id); 
                                const optOutOfStock = opt.stock !== null && opt.stock <= 0; 
                                return (
                                    <div key={opt.id} onClick={() => !optOutOfStock && toggleOption(group, opt)} className={`flex justify-between items-center p-3 rounded-xl border transition-all cursor-pointer ${optOutOfStock ? 'opacity-50 bg-stone-50 cursor-not-allowed' : isSelected ? 'border-pink-500 bg-pink-50/30 ring-1 ring-pink-500' : 'border-stone-100 hover:border-pink-200 bg-white'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-stone-300'}`}>{isSelected && <CheckSquare size={14}/>}</div>
                                            <span className="text-sm font-medium text-stone-700">{opt.name} {optOutOfStock && '(Esgotado)'}</span>
                                        </div>
                                        {!optOutOfStock && getOptionPrice(opt) > 0 && <span className="text-xs font-bold text-emerald-600">+ R$ {getOptionPrice(opt).toFixed(2)}</span>}
                                    </div>
                                ) 
                            })}</div>
                        </div>
                    ))}
                    <div><label className="font-bold text-stone-700 text-sm mb-2 flex items-center gap-2"><MessageSquare size={16}/> Alguma observação?</label><textarea className="w-full p-3 border border-stone-200 rounded-xl bg-stone-50 focus:bg-white focus:ring-2 focus:ring-pink-100 text-sm outline-none transition" rows={2} placeholder="Ex: Tirar cebola, caprichar no molho..." value={observation} onChange={e => setObservation(e.target.value)}/></div>
                </div>

                <div className="p-4 bg-white border-t border-stone-100 flex items-center gap-4">
                    {(() => {
                        const isOutOfStock = selectedProduct.stock !== null && selectedProduct.stock <= 0;
                        return (
                            <>
                                <div className={`flex items-center bg-stone-100 rounded-xl h-12 px-1 ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-full flex items-center justify-center hover:text-pink-600 transition"><Minus size={18}/></button>
                                    <span className="w-8 text-center font-bold text-lg text-stone-800">{quantity}</span>
                                    <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-full flex items-center justify-center hover:text-pink-600 transition"><Plus size={18}/></button>
                                </div>
                                
                                <button 
                                    onClick={handleAddToCart} 
                                    disabled={isOutOfStock}
                                    className={`flex-1 font-bold h-12 rounded-xl flex justify-between items-center px-6 shadow-lg transition-all active:scale-95 ${
                                        isOutOfStock 
                                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none' 
                                        : 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-200'
                                    }`}
                                >
                                    <span>{isOutOfStock ? 'Produto Esgotado' : 'Adicionar'}</span>
                                    {!isOutOfStock && <span className="opacity-90">{calculateTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                                </button>
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}