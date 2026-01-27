// src/app/(shop)/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Plus, Minus, Loader2, ImageOff, X, MessageSquare, Clock } from "lucide-react";
import { Product, ComplementGroup, Option, Category, StoreSettings } from "@/types";
import HeroCarousel from "@/components/HeroCarousel";

export default function ShopHome() {
  const { addToCart } = useCart();
  const { profile } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Option[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsSnap, groupsSnap, catsSnap, settingsSnap] = await Promise.all([
            getDocs(query(collection(db, "products"), orderBy("name"))),
            getDocs(collection(db, "complement_groups")),
            getDocs(query(collection(db, "categories"), orderBy("order"))),
            getDoc(doc(db, "store_settings", "config"))
        ]);

        if (settingsSnap.exists()) setStoreSettings(settingsSnap.data() as StoreSettings);

        const productMap = new Map<string, Product>();
        productsSnap.docs.forEach(doc => { productMap.set(doc.id, { id: doc.id, ...doc.data() } as Product); });

        const groupsMap: Record<string, ComplementGroup> = {};
        groupsSnap.docs.forEach(doc => {
            const groupData = doc.data() as ComplementGroup;
            const hydratedOptions = groupData.options?.map(opt => {
                if (opt.linkedProductId && productMap.has(opt.linkedProductId)) {
                    const linkedProd = productMap.get(opt.linkedProductId)!;
                    return { ...opt, name: linkedProd.name, stock: linkedProd.stock, isAvailable: linkedProd.isAvailable, priceAdd: linkedProd.basePrice, priceAddPostpaid: linkedProd.pricePostpaid, priceAddReseller: linkedProd.priceReseller };
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

  const updateOptionQty = (group: ComplementGroup, option: Option, delta: number) => {
    const currentList = selectedOptions[group.id] || [];
    const currentQty = currentList.filter(o => o.id === option.id).length;
    
    if (delta > 0) {
        if (group.maxSelection && currentList.length >= group.maxSelection) {
             if (group.maxSelection === 1) { setSelectedOptions({ ...selectedOptions, [group.id]: [option] }); return; }
             return alert(`Máximo de ${group.maxSelection} opções neste grupo.`);
        }
        if (option.stock !== null && currentQty >= option.stock) return alert("Estoque limite atingido.");
        setSelectedOptions({ ...selectedOptions, [group.id]: [...currentList, option] });
    } else {
        if (currentQty === 0) return;
        const indexToRemove = currentList.findIndex(o => o.id === option.id);
        if (indexToRemove > -1) {
            const newList = [...currentList];
            newList.splice(indexToRemove, 1);
            setSelectedOptions({ ...selectedOptions, [group.id]: newList });
        }
    }
  };

  const getQty = (groupId: string, optionId: string) => selectedOptions[groupId]?.filter(o => o.id === optionId).length || 0;

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    let total = getPrice(selectedProduct);
    Object.values(selectedOptions).flat().forEach(opt => total += getOptionPrice(opt));
    return total * quantity;
  };

  const isStoreClosed = storeSettings?.isOpen === false;

  const handleAddToCart = () => {
    if (isStoreClosed) return alert("Loja Fechada! Apenas exibição.");
    if (!selectedProduct) return;
    if (selectedProduct.stock !== null && selectedProduct.stock <= 0) return alert("Produto esgotado.");
    
    const missingRequired = selectedProduct.fullGroups?.find(g => g.required && (!selectedOptions[g.id] || selectedOptions[g.id].length === 0));
    if (missingRequired) return alert(`Selecione itens em: "${missingRequired.title}"`);
    
    let customName = selectedProduct.name;
    const allSelectedOpts = Object.values(selectedOptions).flat();
    
    if (allSelectedOpts.length > 0) { 
        const groupedNames = allSelectedOpts.reduce((acc, opt) => {
            acc[opt.name] = (acc[opt.name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const optString = Object.entries(groupedNames).map(([name, qtd]) => qtd > 1 ? `${qtd}x ${name}` : name).join(', ');
        customName += ` (+ ${optString})`; 
    }
    if (observation.trim()) customName += ` [Obs: ${observation}]`;
    addToCart({ ...selectedProduct, name: customName, price: calculateTotal() / quantity, selectedOptions: selectedOptions }, quantity);
    setSelectedProduct(null);
  };

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
      if (groupedProducts[catId]) groupedProducts[catId].push(p); else groupedProducts['uncategorized'].push(p);
  });
  const catsToRender = [...categories, { id: 'uncategorized', name: 'Geral', order: 999 }].filter(c => groupedProducts[c.id] && groupedProducts[c.id].length > 0);

  const openModal = (product: Product) => { setSelectedProduct(product); setQuantity(1); setObservation(""); setSelectedOptions({}); };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-500" size={40}/></div>;

  return (
    <div className="space-y-10 pb-24">
      <HeroCarousel products={products} onProductClick={openModal} />
      
      {isStoreClosed && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-4 rounded-r-lg flex items-center gap-3 animate-in slide-in-from-top">
              <Clock className="text-red-600" size={24}/>
              <div><h3 className="font-bold text-red-800">Loja Fechada</h3><p className="text-sm text-red-700">Estamos apenas exibindo nosso cardápio.</p></div>
          </div>
      )}

      {catsToRender.map((category) => (
          <section key={category.id}>
            <div className="flex items-center gap-4 mb-6"><h3 className="text-2xl font-bold text-stone-800 capitalize tracking-tight">{category.name}</h3><div className="h-[1px] flex-1 bg-stone-200"></div></div>
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {groupedProducts[category.id].map((product) => {
                const isOutOfStock = product.stock !== null && product.stock <= 0;
                return (
                  <div key={product.id} onClick={() => openModal(product)} className={`group bg-white rounded-3xl p-3 shadow-sm hover:shadow-xl border border-stone-50 relative overflow-hidden flex gap-3 md:gap-4 cursor-pointer transition-all ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}>
                    {isStoreClosed && <div className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full z-10 border border-red-200">FECHADO</div>}
                    {isOutOfStock && <div className="absolute inset-0 z-20 bg-stone-100/50 backdrop-blur-[1px] flex items-center justify-center"><span className="bg-stone-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Esgotado</span></div>}
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-stone-100 relative shadow-inner">{product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" /> : <ImageOff className="m-auto mt-8 md:mt-10 text-stone-300" size={24} />}</div>
                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                        <div><h4 className="font-bold text-stone-800 text-base md:text-lg leading-tight line-clamp-2 mb-1">{product.name}</h4><p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{product.description}</p></div>
                        <div className="flex justify-between items-end mt-2 gap-2">
                            <div className="flex flex-col min-w-0"><span className="text-[10px] text-stone-400 font-bold uppercase truncate">A partir de</span><span className="font-bold text-base md:text-lg text-emerald-600">{getPrice(product).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                            {!isOutOfStock && !isStoreClosed && <button className="bg-stone-900 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-pink-600 transition-colors flex-shrink-0"><Plus size={16} /></button>}
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
      ))}
      
      {/* MODAL AJUSTADO: Centralizado e com Margens Seguras */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Área de Clique para Fechar */}
            <div className="absolute inset-0" onClick={() => setSelectedProduct(null)}></div>
            
            {/* O CARD */}
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" style={{ maxHeight: '75dvh' }}>
                
                {/* Botão Fechar */}
                <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur text-stone-800 p-2 rounded-full hover:bg-white shadow-md transition"><X size={20}/></button>

                {/* Imagem (Altura Fixa Menor) */}
                <div className="h-44 bg-stone-100 relative flex-shrink-0">
                    {selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-300"><ImageOff size={40}/></div>}
                </div>

                {/* Conteúdo com Scroll */}
                <div className="p-5 overflow-y-auto flex-1 space-y-5">
                    <div>
                        <h2 className="text-xl font-bold text-stone-800 leading-tight">{selectedProduct.name}</h2>
                        <p className="text-sm text-stone-500 mt-1 leading-relaxed">{selectedProduct.description}</p>
                    </div>

                    {selectedProduct.fullGroups?.map(group => (
                        <div key={group.id} className="space-y-2">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-1">
                                <h3 className="font-bold text-stone-700 text-sm">{group.title}</h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${group.required ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-500'}`}>{group.required ? 'OBRIGATÓRIO' : 'OPCIONAL'}</span>
                            </div>
                            <div className="space-y-2">
                                {group.options.map(opt => { 
                                    const optQty = getQty(group.id, opt.id);
                                    const optOutOfStock = opt.stock !== null && opt.stock <= 0; 
                                    return (
                                        <div key={opt.id} className={`flex justify-between items-center p-2 rounded-lg border transition-colors ${optOutOfStock ? 'opacity-50 bg-gray-50' : optQty > 0 ? 'border-pink-500 bg-pink-50/30' : 'border-gray-100 bg-white'}`}>
                                            <div className="flex-1 pr-2">
                                                <span className="text-sm font-bold text-stone-700 block">{opt.name} {optOutOfStock && '(Esgotado)'}</span>
                                                {getOptionPrice(opt) > 0 && <span className="text-xs text-emerald-600 font-bold">+ R$ {getOptionPrice(opt).toFixed(2)}</span>}
                                            </div>
                                            {!optOutOfStock && (
                                                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded px-1 py-0.5 shadow-sm">
                                                    <button onClick={(e) => {e.stopPropagation(); updateOptionQty(group, opt, -1)}} className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 ${optQty === 0 ? 'text-gray-300' : 'text-red-500'}`} disabled={optQty === 0}><Minus size={14}/></button>
                                                    <span className={`text-sm font-bold w-5 text-center ${optQty > 0 ? 'text-stone-800' : 'text-gray-300'}`}>{optQty}</span>
                                                    <button onClick={(e) => {e.stopPropagation(); updateOptionQty(group, opt, 1)}} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-green-600"><Plus size={14}/></button>
                                                </div>
                                            )}
                                        </div>
                                    ) 
                                })}
                            </div>
                        </div>
                    ))}

                    <div>
                        <label className="font-bold text-stone-700 text-sm mb-2 flex items-center gap-2"><MessageSquare size={16}/> Observação</label>
                        <textarea className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-pink-100 outline-none resize-none" rows={2} placeholder="Ex: Sem cebola..." value={observation} onChange={e => setObservation(e.target.value)}/>
                    </div>
                </div>

                {/* Footer Fixo */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center bg-white border rounded-lg h-11 px-1 shadow-sm">
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-full flex items-center justify-center hover:text-pink-600 transition"><Minus size={18}/></button>
                        <span className="w-8 text-center font-bold text-lg text-stone-800">{quantity}</span>
                        <button onClick={() => setQuantity(q => q + 1)} className="w-9 h-full flex items-center justify-center hover:text-pink-600 transition"><Plus size={18}/></button>
                    </div>
                    <button onClick={handleAddToCart} disabled={isStoreClosed || (selectedProduct.stock !== null && selectedProduct.stock <= 0)} className={`flex-1 font-bold h-11 rounded-lg flex justify-between items-center px-4 shadow-md text-sm transition-all active:scale-95 ${isStoreClosed || (selectedProduct.stock !== null && selectedProduct.stock <= 0) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                        <span>{isStoreClosed ? 'Fechado' : 'Adicionar'}</span>
                        {!isStoreClosed && <span className="opacity-90">{calculateTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}