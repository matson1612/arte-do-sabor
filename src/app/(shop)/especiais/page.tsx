"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Plus, Minus, Loader2, ImageOff, X, CheckSquare, MessageSquare } from "lucide-react";
import { Product, ComplementGroup, Option, StoreSettings } from "@/types";
import HeroCarousel from "@/components/HeroCarousel";

export default function EspeciaisPage() {
  const { addToCart } = useCart();
  const { profile } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  
  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Option[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsSnap, groupsSnap, settingsSnap] = await Promise.all([
            getDocs(query(collection(db, "products"), orderBy("name"))),
            getDocs(collection(db, "complement_groups")),
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

        // FILTRO: Especiais / Eventos
        const items = Array.from(productMap.values())
            .filter(p => p.salesChannel === 'evento' && p.isAvailable)
            .map((p) => {
                const groupIds = p.complementGroupIds || [];
                const loadedGroups = groupIds.map((id: string) => groupsMap[id]).filter(Boolean);
                return { ...p, fullGroups: loadedGroups };
            });

        setProducts(items);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // Helpers de Preço
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

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    let total = getPrice(selectedProduct);
    Object.values(selectedOptions).flat().forEach(opt => total += getOptionPrice(opt));
    return total * quantity;
  };

  const openModal = (product: Product) => { setSelectedProduct(product); setQuantity(1); setObservation(""); setSelectedOptions({}); };

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

  const handleAddToCart = () => {
    if (storeSettings?.isOpen === false) return alert("Loja Fechada!");
    if (!selectedProduct) return;
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
    <div className="pb-24">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 space-y-8">
        
        {/* CARROSSEL CORRIGIDO */}
        <div className="rounded-2xl overflow-hidden shadow-sm">
            <HeroCarousel products={products} onProductClick={openModal} />
        </div>

        <section>
            <div className="flex items-center gap-4 mb-6">
                <h3 className="text-2xl font-bold text-slate-800 capitalize tracking-tight">Especiais da Semana</h3>
                <div className="h-[1px] flex-1 bg-slate-200"></div>
            </div>
            
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
                <div key={product.id} onClick={() => openModal(product)} className="group bg-white rounded-2xl p-3 shadow-sm hover:shadow-md border border-slate-100 relative overflow-hidden flex gap-3 cursor-pointer transition-all active:scale-[0.98]">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 relative">
                        {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" /> : <ImageOff className="m-auto mt-8 text-slate-300" size={24} />}
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-tight line-clamp-2 mb-1">{product.name}</h4>
                            <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 leading-relaxed">{product.description}</p>
                        </div>
                        <div className="flex justify-between items-end mt-2 gap-2">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-400 font-bold uppercase truncate">A partir de</span>
                                <span className="font-bold text-sm sm:text-base text-emerald-600">{getPrice(product).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <button className="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center shadow hover:bg-pink-600 transition-colors flex-shrink-0">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        </section>
      </div>

      {/* MODAL (Idêntico ao anterior) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={() => setSelectedProduct(null)}></div>
            <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom duration-300 flex flex-col h-[90vh] md:h-auto md:max-h-[85vh]">
                <div className="h-48 md:h-56 bg-slate-100 relative flex-shrink-0">
                    <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 bg-white/80 backdrop-blur text-slate-800 p-2 rounded-full hover:bg-white shadow-sm transition"><X size={20}/></button>
                    {selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageOff size={40}/></div>}
                </div>
                <div className="p-5 md:p-6 space-y-6 flex-1 overflow-y-auto">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-1">{selectedProduct.name}</h2>
                        <p className="text-sm text-slate-500 leading-relaxed">{selectedProduct.description}</p>
                    </div>
                    {selectedProduct.fullGroups?.map(group => (
                        <div key={group.id} className="space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2"><h3 className="font-bold text-slate-700 text-sm">{group.title}</h3><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${group.required ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>{group.required ? 'OBRIGATÓRIO' : 'OPCIONAL'}</span></div>
                            <div className="space-y-2">{group.options.map(opt => { const isSelected = selectedOptions[group.id]?.some(o => o.id === opt.id); return (<div key={opt.id} onClick={() => toggleOption(group, opt)} className={`flex justify-between items-center p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-pink-500 bg-pink-50/30 ring-1 ring-pink-500' : 'border-slate-100 hover:border-pink-200 bg-white'}`}><div className="flex items-center gap-3"><div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-slate-300'}`}>{isSelected && <CheckSquare size={14}/>}</div><span className="text-sm font-medium text-slate-700">{opt.name}</span></div>{getOptionPrice(opt) > 0 && <span className="text-xs font-bold text-emerald-600">+ R$ {getOptionPrice(opt).toFixed(2)}</span>}</div>) })}</div>
                        </div>
                    ))}
                    <div><label className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><MessageSquare size={16}/> Alguma observação?</label><textarea className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-pink-100 text-sm outline-none transition resize-none" rows={2} placeholder="Ex: Tirar cebola..." value={observation} onChange={e => setObservation(e.target.value)}/></div>
                </div>
                <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-4 flex-shrink-0 safe-area-bottom">
                    <div className="flex items-center bg-slate-100 rounded-xl h-12 px-1"><button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-full flex items-center justify-center hover:text-pink-600 transition"><Minus size={18}/></button><span className="w-8 text-center font-bold text-lg text-slate-800">{quantity}</span><button onClick={() => setQuantity(q => q + 1)} className="w-10 h-full flex items-center justify-center hover:text-pink-600 transition"><Plus size={18}/></button></div>
                    <button onClick={handleAddToCart} className="flex-1 bg-slate-900 text-white font-bold h-12 rounded-xl flex justify-between items-center px-6 shadow-lg hover:bg-slate-800 transition active:scale-95"><span>Adicionar</span><span className="opacity-90">{calculateTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}