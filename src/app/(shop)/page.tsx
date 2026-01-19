// src/app/(shop)/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Plus, Minus, Loader2, ShoppingBag, ImageOff, X, CheckSquare, MessageSquare } from "lucide-react";
import { Product, ComplementGroup, Option } from "@/types";

export default function ShopHome() {
  const { addToCart } = useCart();
  const { profile } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Option[]>>({});

  const getPrice = (item: Product) => {
    if (profile?.clientType === 'monthly' && item.pricePostpaid && item.pricePostpaid > 0) {
        return item.pricePostpaid;
    }
    return item.basePrice || 0;
  };

  const getOptionPrice = (opt: Option) => {
      if (profile?.clientType === 'monthly' && opt.priceAddPostpaid !== undefined) {
          return opt.priceAddPostpaid;
      }
      return opt.priceAdd;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsSnap, groupsSnap] = await Promise.all([
            getDocs(query(collection(db, "products"), orderBy("name"))),
            getDocs(collection(db, "complement_groups"))
        ]);

        const groupsMap: Record<string, ComplementGroup> = {};
        groupsSnap.docs.forEach(doc => {
            groupsMap[doc.id] = { id: doc.id, ...doc.data() } as ComplementGroup;
        });

        const items = productsSnap.docs.map((doc) => {
          const data = doc.data();
          const groupIds = data.complementGroupIds || [];
          const loadedGroups = groupIds.map((id: string) => groupsMap[id]).filter(Boolean);

          // CORREÇÃO DO ERRO DE TIPO AQUI:
          // Usamos 'as unknown as Product' para forçar a tipagem dos dados vindos do banco
          return { 
              id: doc.id, 
              ...data, 
              fullGroups: loadedGroups 
          } as unknown as Product;
        });

        setProducts(items);
      } catch (error) {
        console.error("Erro ao carregar:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const visibleProducts = products.filter(p => {
      if (!p.isAvailable) return false;
      if (profile?.clientType === 'monthly') {
          return p.availablePostpaid !== false;
      }
      return p.availableStandard !== false;
  });

  const groupedProducts = visibleProducts.reduce((acc, product) => {
    const cat = product.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

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

    if (isAlreadySelected) {
        newSelection = currentSelected.filter(o => o.id !== option.id);
    } else {
        if (group.maxSelection === 1) {
            newSelection = [option];
        } else {
            if (currentSelected.length >= group.maxSelection) {
                return alert(`Máximo de ${group.maxSelection} opções neste grupo.`);
            }
            newSelection = [...currentSelected, option];
        }
    }
    setSelectedOptions({ ...selectedOptions, [group.id]: newSelection });
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    let total = getPrice(selectedProduct);
    Object.values(selectedOptions).flat().forEach(opt => {
        total += getOptionPrice(opt);
    });
    return total * quantity;
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const missingRequired = selectedProduct.fullGroups?.find(g => g.required && (!selectedOptions[g.id] || selectedOptions[g.id].length === 0));
    if (missingRequired) {
        alert(`O grupo "${missingRequired.title}" é obrigatório.`);
        return;
    }

    let customName = selectedProduct.name;
    const allSelectedOpts = Object.values(selectedOptions).flat();
    
    if (allSelectedOpts.length > 0) {
        const optNames = allSelectedOpts.map(o => o.name).join(', ');
        customName += ` (+ ${optNames})`;
    }
    
    if (observation.trim()) customName += ` [Obs: ${observation}]`;

    const unitPrice = calculateTotal() / quantity;

    addToCart({
        ...selectedProduct,
        name: customName,
        price: unitPrice,
    }, quantity);

    setSelectedProduct(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;

  return (
    <div className="space-y-8 pb-24">
      <div className="bg-gradient-to-r from-pink-600 to-rose-500 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-1">Cardápio 🍔</h2>
        <p className="opacity-90 text-sm">
            {profile?.clientType === 'monthly' ? "Modo Mensalista Ativo" : "Escolha suas delícias abaixo."}
        </p>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          <ShoppingBag size={48} className="mx-auto mb-2 opacity-20"/>
          <p>Nenhum produto cadastrado para seu perfil.</p>
        </div>
      ) : (
        Object.entries(groupedProducts).map(([category, items]) => (
          <section key={category}>
            <h3 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-pink-600 pl-3 capitalize">
              {category}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((product) => (
                <div 
                    key={product.id} 
                    onClick={() => openModal(product)} 
                    className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3 cursor-pointer hover:border-pink-300 transition-colors group"
                >
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <ImageOff className="m-auto mt-8 text-gray-300" size={20} />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{product.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-green-600 text-sm">
                        {getPrice(product).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <button className="bg-pink-50 text-pink-600 p-1.5 rounded-full hover:bg-pink-600 hover:text-white transition-colors">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setSelectedProduct(null)}></div>

            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-10 z-10 max-h-[90vh] overflow-y-auto">
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 bg-black/20 text-white p-1 rounded-full hover:bg-black/40 backdrop-blur-md">
                    <X size={20}/>
                </button>

                <div className="h-48 bg-gray-100 relative">
                    {selectedProduct.imageUrl ? (
                         <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageOff size={40}/></div>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <h2 className="text-xl font-bold text-gray-800">{selectedProduct.name}</h2>
                            <div className="text-xl font-bold text-green-600">
                                {getPrice(selectedProduct).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">{selectedProduct.description}</p>
                    </div>

                    {/* COMPLEMENTOS */}
                    {selectedProduct.fullGroups && selectedProduct.fullGroups.length > 0 && (
                        <div className="space-y-4">
                            {selectedProduct.fullGroups.map(group => (
                                <div key={group.id} className="bg-gray-50 p-3 rounded-lg border">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-gray-700 text-sm">{group.title}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${group.required ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                                            {group.required ? 'OBRIGATÓRIO' : 'OPCIONAL'}
                                            {group.maxSelection > 1 && ` (Até ${group.maxSelection})`}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {group.options.map(opt => {
                                            const isSelected = selectedOptions[group.id]?.some(o => o.id === opt.id);
                                            const optPrice = getOptionPrice(opt);
                                            
                                            return (
                                                <div key={opt.id} onClick={() => toggleOption(group, opt)} className={`flex justify-between items-center p-2 rounded border cursor-pointer bg-white transition-all ${isSelected ? 'border-pink-500 ring-1 ring-pink-500' : 'border-gray-200 hover:border-pink-300'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-pink-600 border-pink-600 text-white' : 'border-gray-300'}`}>
                                                            {isSelected && <CheckSquare size={12}/>}
                                                        </div>
                                                        <span className="text-sm text-gray-700">{opt.name}</span>
                                                    </div>
                                                    {optPrice > 0 && <span className="text-xs font-bold text-green-600">+ R$ {optPrice.toFixed(2)}</span>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2"><MessageSquare size={16}/> Observação</label>
                        <textarea className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white text-sm" rows={2} placeholder="Ex: Sem cebola..." value={observation} onChange={e => setObservation(e.target.value)}/>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center border rounded-xl overflow-hidden bg-gray-50 h-12">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 h-full hover:bg-gray-200 text-gray-600"><Minus size={18}/></button>
                            <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="px-4 h-full hover:bg-gray-200 text-pink-600"><Plus size={18}/></button>
                        </div>
                        <button onClick={handleAddToCart} className="flex-1 bg-pink-600 text-white font-bold h-12 rounded-xl hover:bg-pink-700 flex justify-center items-center gap-2 shadow-lg">
                            <span>Adicionar</span>
                            <span className="bg-pink-700/50 px-2 py-0.5 rounded text-xs">
                                {calculateTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}