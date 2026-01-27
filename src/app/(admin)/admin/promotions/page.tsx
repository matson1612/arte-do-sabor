"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { Loader2, Plus, Trash2, Tag, Truck, PackagePlus, Ticket, X, Percent } from "lucide-react";
import { Product } from "@/types";

function PromotionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlProductId = searchParams.get('product');

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'offer' | 'coupon' | 'combo'>('offer');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form States
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [promoPrice, setPromoPrice] = useState("");
  const [couponQty, setCouponQty] = useState("1");
  const [comboName, setComboName] = useState("");

  // NOVOS ESTADOS PARA CUPOM AVANÇADO
  const [couponType, setCouponType] = useState<'shipping' | 'percent'>('shipping'); // shipping | percent
  const [shippingLimit, setShippingLimit] = useState(""); // Limite em R$ (ex: 10.00)
  const [discountPercent, setDiscountPercent] = useState(""); // % (ex: 10)

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
      if (urlProductId && products.length > 0) {
          setSelectedProducts([urlProductId]);
          setActiveTab('offer');
          setIsModalOpen(true);
      }
  }, [urlProductId, products]);

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
        const prefix = couponType === 'shipping' ? 'FRETE' : 'DESC';
        const code = `${prefix}-` + Math.random().toString(36).substring(2, 7).toUpperCase();
        codes.push(code);
    }
    return codes;
  };

  const handleSave = async () => {
    try {
        let payload: any = { type: activeTab, createdAt: serverTimestamp(), active: true };

        if (activeTab === 'offer') {
            if (!selectedProducts[0] || !promoPrice) return alert("Selecione produto e preço.");
            const prod = products.find(p => p.id === selectedProducts[0]);
            payload = { ...payload, productId: selectedProducts[0], productName: prod?.name, productImage: prod?.imageUrl, newPrice: parseFloat(promoPrice) };
        } 
        else if (activeTab === 'coupon') {
            const qty = parseInt(couponQty);
            if (qty < 1) return alert("Mínimo 1 cupom.");
            
            payload = {
                ...payload,
                codes: generateCoupons(qty),
                initialQty: qty,
                couponType: couponType // 'shipping' ou 'percent'
            };

            if (couponType === 'shipping') {
                // Se tiver limite, salva. Se estiver vazio, assume 0 (ou infinito na lógica, mas vamos salvar o valor)
                // Se o usuário quiser "totalmente grátis", ele pode por um valor alto ou deixar vazio e tratamos como null
                payload.shippingLimit = shippingLimit ? parseFloat(shippingLimit) : null; 
            } else {
                if (!discountPercent) return alert("Informe a porcentagem.");
                payload.discountPercent = parseFloat(discountPercent);
            }
        } 
        else if (activeTab === 'combo') {
            if (selectedProducts.length < 2 || !promoPrice || !comboName) return alert("Selecione min. 2 produtos.");
            const comboItems = selectedProducts.map(id => products.find(p => p.id === id)).filter(Boolean);
            payload = { ...payload, title: comboName, items: comboItems, price: parseFloat(promoPrice) };
        }

        await addDoc(collection(db, "promotions"), payload);
        closeModal();
        loadData();
    } catch (e) { alert("Erro ao salvar."); }
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setSelectedProducts([]); setPromoPrice(""); setComboName(""); setCouponQty("1"); 
      setShippingLimit(""); setDiscountPercent("");
      router.replace('/admin/promotions');
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Excluir promoção?")) return;
      await deleteDoc(doc(db, "promotions", id));
      loadData();
  };

  if(loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline"/></div>;

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
                    
                    {promo.type === 'offer' && (
                        <div><span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1 w-fit mb-2"><Tag size={12}/> Oferta</span><h3 className="font-bold text-slate-800 text-lg">{promo.productName}</h3><p className="text-2xl font-bold text-emerald-600 mt-2">R$ {promo.newPrice?.toFixed(2)}</p></div>
                    )}

                    {promo.type === 'coupon' && (
                        <div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1 w-fit mb-2 ${promo.couponType === 'percent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                {promo.couponType === 'percent' ? <><Percent size={12}/> Desconto {promo.discountPercent}%</> : <><Truck size={12}/> Frete {promo.shippingLimit ? `(Até R$ ${promo.shippingLimit})` : 'Grátis'}</>}
                            </span>
                            <p className="text-xs text-gray-500 mb-2 font-bold">Códigos ({promo.codes?.length})</p>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200 text-xs font-mono text-slate-600 max-h-32 overflow-y-auto grid grid-cols-2 gap-2">
                                {promo.codes?.map((c: string) => <div key={c} className="bg-white px-1 rounded border text-center">{c}</div>)}
                            </div>
                        </div>
                    )}

                    {promo.type === 'combo' && (
                        <div><span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded uppercase flex items-center gap-1 w-fit mb-2"><PackagePlus size={12}/> Combo</span><h3 className="font-bold text-slate-800 mb-1 text-lg">{promo.title}</h3><p className="text-xl font-bold text-purple-600">R$ {promo.price?.toFixed(2)}</p></div>
                    )}
                </div>
            ))}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in zoom-in-95">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="flex border-b bg-gray-50">
                        <button onClick={() => setActiveTab('offer')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'offer' ? 'bg-white text-red-600 border-red-600' : 'text-gray-500 border-transparent'}`}>Oferta</button>
                        <button onClick={() => setActiveTab('coupon')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'coupon' ? 'bg-white text-blue-600 border-blue-600' : 'text-gray-500 border-transparent'}`}>Cupom</button>
                        <button onClick={() => setActiveTab('combo')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'combo' ? 'bg-white text-purple-600 border-purple-600' : 'text-gray-500 border-transparent'}`}>Combo</button>
                        <button onClick={closeModal} className="px-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 space-y-4 overflow-y-auto">
                        {activeTab === 'offer' && (
                            <>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Produto</label><select className="w-full p-3 border rounded-lg bg-white outline-none" value={selectedProducts[0] || ""} onChange={e => setSelectedProducts([e.target.value])}><option value="">Selecione...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (Base: R$ {p.basePrice})</option>)}</select></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Novo Preço</label><input type="number" className="w-full p-3 border rounded-lg outline-none" placeholder="0.00" value={promoPrice} onChange={e => setPromoPrice(e.target.value)}/></div>
                            </>
                        )}

                        {activeTab === 'coupon' && (
                            <div className="space-y-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex gap-2 bg-white p-1 rounded-lg border border-blue-200">
                                    <button onClick={() => setCouponType('shipping')} className={`flex-1 py-2 text-xs font-bold rounded ${couponType === 'shipping' ? 'bg-blue-600 text-white shadow' : 'text-blue-600'}`}>Frete Grátis</button>
                                    <button onClick={() => setCouponType('percent')} className={`flex-1 py-2 text-xs font-bold rounded ${couponType === 'percent' ? 'bg-blue-600 text-white shadow' : 'text-blue-600'}`}>Desconto (%)</button>
                                </div>

                                {couponType === 'shipping' ? (
                                    <div>
                                        <label className="text-xs font-bold text-blue-800 uppercase block mb-1">Limite Máximo do Frete (Opcional)</label>
                                        <input type="number" placeholder="Ex: 10.00 (Deixe vazio para ilimitado)" className="w-full p-2 border rounded-lg outline-none" value={shippingLimit} onChange={e => setShippingLimit(e.target.value)}/>
                                        <p className="text-[10px] text-blue-600 mt-1">Se o frete for maior que o limite, o cliente paga a diferença.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-xs font-bold text-blue-800 uppercase block mb-1">Porcentagem de Desconto</label>
                                        <input type="number" placeholder="Ex: 10" className="w-full p-2 border rounded-lg outline-none" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)}/>
                                        <p className="text-[10px] text-blue-600 mt-1">Aplica sobre o valor dos produtos (Subtotal).</p>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 border-t border-blue-200 pt-4">
                                    <label className="text-xs font-bold text-blue-700 uppercase">Quantidade de Cupons:</label>
                                    <input type="number" className="w-20 text-center p-2 border border-blue-200 rounded-lg outline-none font-bold bg-white" value={couponQty} onChange={e => setCouponQty(e.target.value)}/>
                                </div>
                            </div>
                        )}

                        {activeTab === 'combo' && (
                            <>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nome</label><input className="w-full p-3 border rounded-lg outline-none" placeholder="Ex: Casal Feliz" value={comboName} onChange={e => setComboName(e.target.value)}/></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Itens</label><div className="h-40 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">{products.map(p => (<label key={p.id} className="flex items-center gap-2 text-sm p-2 hover:bg-white rounded cursor-pointer border border-transparent hover:border-gray-200"><input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={e => {if(e.target.checked) setSelectedProducts([...selectedProducts, p.id]); else setSelectedProducts(selectedProducts.filter(id => id !== p.id));}}/>{p.name}</label>))}</div></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Preço Total</label><input type="number" className="w-full p-3 border rounded-lg outline-none" placeholder="0.00" value={promoPrice} onChange={e => setPromoPrice(e.target.value)}/></div>
                            </>
                        )}

                        <button onClick={handleSave} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 shadow-lg mt-4 transition">Criar Promoção</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

export default function PromotionsAdminPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><Loader2 className="animate-spin inline"/></div>}>
      <PromotionsContent />
    </Suspense>
  );
}