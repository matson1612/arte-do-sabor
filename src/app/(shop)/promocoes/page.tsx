// src/app/(shop)/promocoes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useCart } from "@/context/CartContext";
import { Loader2, Tag, PackagePlus, ShoppingBag, Plus } from "lucide-react";

export default function PromocoesPage() {
  const { addToCart } = useCart();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const q = query(collection(db, "promotions"), where("active", "==", true));
        const snap = await getDocs(q);
        setPromotions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchPromos();
  }, []);

  const addOfferToCart = (promo: any) => {
      addToCart({
          id: promo.productId,
          name: promo.productName,
          imageUrl: promo.productImage,
          price: promo.newPrice,
          category: 'promo',
          description: 'OFERTA ESPECIAL',
          isAvailable: true,
          basePrice: promo.newPrice,
          stock: 99,
          salesChannel: 'delivery',
          // CORREÇÃO: Campos obrigatórios do CartEntry adicionados
          selectedOptions: {}, 
          complementGroupIds: []
      }, 1);
      alert("Oferta adicionada ao carrinho!");
  };

  const addComboToCart = (promo: any) => {
      const comboDesc = promo.items.map((i: any) => i.name).join(" + ");
      addToCart({
          id: `combo-${promo.id}`,
          name: `Combo: ${promo.title}`,
          description: comboDesc,
          imageUrl: promo.items[0]?.imageUrl || "",
          price: promo.price,
          category: 'combo',
          isAvailable: true,
          basePrice: promo.price,
          stock: 99,
          salesChannel: 'delivery',
          // CORREÇÃO: Campos obrigatórios do CartEntry adicionados
          selectedOptions: {},
          complementGroupIds: []
      }, 1);
      alert("Combo adicionado ao carrinho!");
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-500" size={32}/></div>;

  const offers = promotions.filter(p => p.type === 'offer');
  const combos = promotions.filter(p => p.type === 'combo');

  return (
    <div className="pb-24 max-w-6xl mx-auto px-4 pt-6">
      

      {offers.length === 0 && combos.length === 0 && (
          <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-20"/>
              <p>Nenhuma promoção ativa no momento.</p>
          </div>
      )}

      {/* SEÇÃO OFERTAS */}
      {offers.length > 0 && (
          <div className="mb-10">
              <h2 className="font-bold text-lg text-slate-700 mb-4 border-b pb-2 flex items-center gap-2"><Tag size={18}/> Ofertas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offers.map(offer => (
                      <div key={offer.id} className="bg-white p-4 rounded-2xl shadow-sm border border-pink-100 flex items-center gap-4 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">OFERTA</div>
                          <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                              {offer.productImage && <img src={offer.productImage} className="w-full h-full object-cover group-hover:scale-110 transition duration-500"/>}
                          </div>
                          <div className="flex-1 py-1">
                              <h3 className="font-bold text-slate-800 leading-tight mb-1">{offer.productName}</h3>
                              <p className="text-2xl font-bold text-pink-600">R$ {offer.newPrice.toFixed(2)}</p>
                              <button onClick={() => addOfferToCart(offer)} className="mt-2 w-full bg-slate-900 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-slate-800 transition shadow flex justify-center items-center gap-2 active:scale-95">
                                  <Plus size={14}/> Adicionar
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* SEÇÃO COMBOS */}
      {combos.length > 0 && (
          <div>
              <h2 className="font-bold text-lg text-slate-700 mb-4 border-b pb-2 flex items-center gap-2"><PackagePlus size={18}/> Combos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {combos.map(combo => (
                      <div key={combo.id} className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-2xl shadow-sm border border-purple-100 relative overflow-hidden">
                          <div className="relative z-10">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{combo.title}</h3>
                            <ul className="text-sm text-slate-600 mb-4 list-disc pl-5 space-y-1 bg-white/50 p-2 rounded-lg border border-purple-50">
                                {combo.items.map((i: any) => <li key={i.id}>{i.name}</li>)}
                            </ul>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-purple-100">
                                <span className="text-2xl font-bold text-purple-700">R$ {combo.price.toFixed(2)}</span>
                                <button onClick={() => addComboToCart(combo)} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-purple-700 transition active:scale-95 flex items-center gap-2">
                                    <Plus size={18}/> Pedir
                                </button>
                            </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}