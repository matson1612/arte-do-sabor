"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { Loader2, Plus, Trash2, Tag, Truck, PackagePlus, Ticket } from "lucide-react";
import { Product } from "@/types";

export default function PromotionsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'offer' | 'coupon' | 'combo'>('offer');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do Formulário
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [promoPrice, setPromoPrice] = useState("");
  const [couponQty, setCouponQty] = useState("1");
  const [comboName, setComboName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodSnap, promoSnap] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(query(collection(db, "promotions"), orderBy("createdAt", "desc")))
      ]);
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setPromotions(promoSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const generateCoupons = (qty: number) => {
    const codes = [];
    for (let i = 0; i < qty; i++) {
        // Gera código tipo: FRETE-X7Z2A
        const code = "FRETE-" + Math.random().toString(36).substring(2, 7).toUpperCase();
        codes.push(code);
    }
    return codes;
  };

  const handleSave = async () => {
    try {
        let payload: any = { type: activeTab, createdAt: serverTimestamp(), active: true };

        // 1. OFERTA DE PRODUTO
        if (activeTab === 'offer') {
            if (!selectedProducts[0] || !promoPrice) return alert("Selecione produto e preço.");
            const prod = products.find(p => p.id === selectedProducts[0]);
            payload = {
                ...payload,
                productId: selectedProducts[0],
                productName: prod?.name,
                productImage: prod?.imageUrl,
                newPrice: parseFloat(promoPrice)
            };
        } 
        // 2. CUPOM DE FRETE GRÁTIS
        else if (activeTab === 'coupon') {
            const qty = parseInt(couponQty);
            if (qty < 1) return alert("Mínimo 1 cupom.");
            payload = {
                ...payload,
                codes: generateCoupons(qty), // Lista de códigos válidos
                initialQty: qty
            };
        } 
        // 3. COMBO
        else if (activeTab === 'combo') {
            if (selectedProducts.length < 2 || !promoPrice || !comboName) return alert("Selecione min. 2 produtos, nome e preço.");
            const comboItems = selectedProducts.map(id => products.find(p => p.id === id)).filter(Boolean);
            payload = {
                ...payload,
                title: comboName,
                items: comboItems,
                price: parseFloat(promoPrice)
            };
        }

        await addDoc(collection(db, "promotions"), payload);
        setIsModalOpen(false);
        loadData();
        // Reset
        setSelectedProducts([]); setPromoPrice(""); setComboName(""); setCouponQty("1");
    } catch (e) { alert("Erro ao salvar."); }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Excluir promoção?")) return;
      await deleteDoc(doc(db, "promotions", id));
      loadData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Gerenciar Promoções</h1>
            <button onClick={() => setIsModalOpen(true)} className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-pink-700 transition shadow-sm">
                <Plus size={20}/> Nova Promoção
            </button>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {promotions.map(promo => (
                <div key={promo.id} className="bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden group hover:shadow-md transition">
                    <button onClick={() => handleDelete(promo.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 bg-white p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition border"><Trash2 size={16}/></button>
                    
                    {/* CARD OFERTA */}
                    {promo.type === 'offer' && (
                        <div>
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1 w-fit mb-2"><Tag size={12}/> Oferta</span>
                            <h3 className="font-bold text-slate-800 text-lg">{promo.productName}</h3>
                            <p className="text-2xl font-bold text-emerald-600 mt-2">R$ {promo.newPrice?.toFixed(2)}</p>
                        </div>
                    )}

                    {/* CARD CUPOM */}
                    {promo.type === 'coupon' && (
                        <div>
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1 w-fit mb-2"><Truck size={12}/> Frete Grátis</span>
                            <p className="text-xs text-gray-500 mb-2 font-bold">Códigos Disponíveis ({promo.codes?.length})</p>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200 text-xs font-mono text-slate-600 max-h-32 overflow-y-auto grid grid-cols-2 gap-2">
                                {promo.codes?.map((c: string) => <div key={c} className="bg-white px-1 rounded border text-center select-all cursor-pointer hover:bg-blue-50">{c}</div>)}
                                {promo.codes?.length === 0 && <span className="text-red-400 col-span-2 text-center">Esgotado</span>}
                            </div>
                        </div>
                    )}

                    {/* CARD COMBO */}
                    {promo.type === 'combo' && (
                        <div>
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1 w-fit mb-2"><PackagePlus size={12}/> Combo</span>
                            <h3 className="font-bold text-slate-800 mb-1 text-lg">{promo.title}</h3>
                            <ul className="text-xs text-gray-500 list-disc pl-4 mb-3 space-y-1">
                                {promo.items?.map((i: any) => <li key={i.id}>{i.name}</li>)}
                            </ul>
                            <p className="text-xl font-bold text-purple-600">Por: R$ {promo.price?.toFixed(2)}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>

        {/* MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="flex border-b bg-gray-50">
                        <button onClick={() => setActiveTab('offer')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'offer' ? 'bg-white text-red-600 border-red-600' : 'text-gray-500 border-transparent'}`}>Oferta Item</button>
                        <button onClick={() => setActiveTab('coupon')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'coupon' ? 'bg-white text-blue-600 border-blue-600' : 'text-gray-500 border-transparent'}`}>Cupom Frete</button>
                        <button onClick={() => setActiveTab('combo')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'combo' ? 'bg-white text-purple-600 border-purple-600' : 'text-gray-500 border-transparent'}`}>Combo</button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        {activeTab === 'offer' && (
                            <>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Produto</label><select className="w-full p-3 border rounded-lg bg-white outline-none" onChange={e => setSelectedProducts([e.target.value])}><option value="">Selecione...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (Base: R$ {p.basePrice})</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Novo Preço</label><input type="number" className="w-full p-3 border rounded-lg outline-none" placeholder="0.00" value={promoPrice} onChange={e => setPromoPrice(e.target.value)}/></div>
                            </>
                        )}

                        {activeTab === 'coupon' && (
                            <div className="text-center py-4 bg-blue-50 rounded-xl border border-blue-100">
                                <Ticket size={48} className="mx-auto text-blue-300 mb-2"/>
                                <p className="text-sm text-blue-800 font-bold mb-1">Gerador de Cupons</p>
                                <p className="text-xs text-blue-600 mb-4 px-4">Cupons aleatórios de uso único para Frete Grátis.</p>
                                <div className="flex items-center justify-center gap-2"><label className="text-xs font-bold text-blue-700 uppercase">Quantidade:</label><input type="number" className="w-20 text-center p-2 border border-blue-200 rounded-lg outline-none font-bold" value={couponQty} onChange={e => setCouponQty(e.target.value)}/></div>
                            </div>
                        )}

                        {activeTab === 'combo' && (
                            <>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nome do Combo</label><input className="w-full p-3 border rounded-lg outline-none" placeholder="Ex: Casal Feliz" value={comboName} onChange={e => setComboName(e.target.value)}/></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Itens do Combo</label><div className="h-40 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">{products.map(p => (<label key={p.id} className="flex items-center gap-2 text-sm p-2 hover:bg-white rounded cursor-pointer border border-transparent hover:border-gray-200 transition"><input type="checkbox" className="w-4 h-4 rounded text-purple-600" onChange={e => {if(e.target.checked) setSelectedProducts([...selectedProducts, p.id]); else setSelectedProducts(selectedProducts.filter(id => id !== p.id));}}/>{p.name}</label>))}</div></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Preço Total</label><input type="number" className="w-full p-3 border rounded-lg outline-none" placeholder="0.00" value={promoPrice} onChange={e => setPromoPrice(e.target.value)}/></div>
                            </>
                        )}

                        <button onClick={handleSave} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 shadow-lg mt-4 transition">Criar Promoção</button>
                        <button onClick={() => setIsModalOpen(false)} className="w-full text-gray-500 py-3 text-sm font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}