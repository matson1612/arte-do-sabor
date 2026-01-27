// src/app/(shop)/cart/page.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Trash2, ArrowLeft, Send, MapPin, Search, Loader2, ShoppingBag, CreditCard, FileText, CheckCircle, Plus, Minus, AlertTriangle, Phone, QrCode, Copy, X, Link as LinkIcon, Banknote, Save, Pencil, Clock, Ticket } from "lucide-react";
import { useState, useEffect } from "react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, runTransaction, updateDoc, getDocs, query, where, arrayRemove } from "firebase/firestore";
import Link from "next/link";
import { generateShortId } from "@/utils/generateId"; 
import { Option, StoreSettings, UserAddress } from "@/types";
import { QRCodeSVG } from "qrcode.react"; 
import { generatePixCopyPaste } from "@/utils/pix";

// ⚠️ Mantenha sua chave aqui
const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 
const DEFAULT_CENTER = { lat: -10.183760, lng: -48.333650 }; 

// Carrega bibliotecas necessárias
const LIBRARIES: ("geometry")[] = ["geometry"];

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const { user, loginGoogle, profile } = useAuth();
  
  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES 
  });
  
  // Estados de Dados
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Estados Visuais e Controle
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [shippingPrice, setShippingPrice] = useState(0);
  const [shippingDetails, setShippingDetails] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);
  const [missingPhone, setMissingPhone] = useState("");

  // NOVO: Estados do Cupom
  const [couponCode, setCouponCode] = useState("");
  const [activeCoupon, setActiveCoupon] = useState<{ code: string, id: string } | null>(null);
  const [couponError, setCouponError] = useState("");

  // Modal Endereço
  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [newAddr, setNewAddr] = useState<Partial<UserAddress>>({
      regionType: 'plano_diretor',
      street: "", number: "", district: "", complement: "", nickname: "Casa", cep: ""
  });
  const [addrMapLoc, setAddrMapLoc] = useState(DEFAULT_CENTER);

  // PIX Modal
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [pixCopied, setPixCopied] = useState(false);

  const isMonthlyOrReseller = profile?.clientType === 'monthly' || profile?.clientType === 'reseller';
  const isStoreClosed = storeSettings?.isOpen === false;

  // 1. Carregar Configurações
  useEffect(() => {
      getDoc(doc(db, "store_settings", "config")).then(snap => {
          if (snap.exists()) setStoreSettings(snap.data() as StoreSettings);
      });
  }, []);

  // 2. Carregar Endereços
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
        if (snap.exists() && snap.data().savedAddresses) {
            setSavedAddresses(snap.data().savedAddresses);
            if(snap.data().savedAddresses.length > 0) setSelectedAddressId(snap.data().savedAddresses[0].id);
        }
    });
  }, [user]);

  // 3. Validação Estoque
  useEffect(() => {
    if (items.length === 0) return;
    const validate = async () => {
        const warnings: string[] = [];
        for (const item of items) {
            if (!item.id || item.category === 'combo' || item.category === 'promo') continue; // Pula validação de combos/promos
            try {
                const prod = await getDoc(doc(db, "products", item.id));
                if (prod.exists()) {
                    const stk = prod.data().stock;
                    if (stk !== null && stk <= 0) {
                        warnings.push(`"${item.name}" esgotou.`);
                        removeFromCart(item.cartId);
                    } else if (stk !== null && item.quantity > stk) {
                        warnings.push(`"${item.name}" ajustado para ${stk} un.`);
                        updateQuantity(item.cartId, stk);
                    }
                }
            } catch (e) {}
        }
        if (warnings.length > 0) setStockWarnings(warnings);
    };
    validate();
  }, []);

  // 4. CÁLCULO DE FRETE (ROTA + CUPOM)
  useEffect(() => {
    // SE TEM CUPOM, FRETE É ZERO
    if (activeCoupon) {
        setShippingPrice(0);
        setShippingDetails("Cupom Frete Grátis");
        return;
    }

    if (deliveryMethod === 'pickup' || paymentMethod === 'conta_aberta') { 
        setShippingPrice(0); 
        setShippingDetails(paymentMethod === 'conta_aberta' ? "Isento (Mensalista)" : ""); 
        return; 
    }
    
    if (!storeSettings || !selectedAddressId || !isLoaded || !window.google) return;

    const addr = savedAddresses.find(a => a.id === selectedAddressId);
    if (!addr) return;

    const applyDistancePricing = (distKm: number) => {
        let finalPrice = 0;
        const rule = storeSettings.shipping.distanceTable.find(r => distKm >= r.minKm && distKm <= r.maxKm);
        
        if (rule) {
            finalPrice = rule.price;
        } else {
            const maxRule = storeSettings.shipping.distanceTable[storeSettings.shipping.distanceTable.length - 1];
            finalPrice = maxRule ? maxRule.price : 0;
        }

        if(storeSettings.shipping.freeShippingAbove && storeSettings.shipping.freeShippingAbove > 0 && cartTotal >= storeSettings.shipping.freeShippingAbove) {
            finalPrice = 0;
            setShippingDetails("Frete Grátis");
        } else {
            setShippingDetails(`${distKm.toFixed(1)} km (Rota)`);
        }
        setShippingPrice(finalPrice);
    };

    if (addr.regionType === 'plano_diretor' && addr.location && storeSettings.location) {
        const service = new window.google.maps.DistanceMatrixService();
        service.getDistanceMatrix({
            origins: [{ lat: storeSettings.location.lat, lng: storeSettings.location.lng }],
            destinations: [{ lat: addr.location.lat, lng: addr.location.lng }],
            travelMode: window.google.maps.TravelMode.DRIVING, 
            unitSystem: window.google.maps.UnitSystem.METRIC,
        }, (response, status) => {
            if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') {
                const distMeters = response.rows[0].elements[0].distance.value;
                const distKm = distMeters / 1000;
                applyDistancePricing(distKm);
            } else {
                if (window.google?.maps?.geometry) {
                    const from = new window.google.maps.LatLng(storeSettings.location.lat, storeSettings.location.lng);
                    const to = new window.google.maps.LatLng(addr.location.lat, addr.location.lng);
                    const linearKm = window.google.maps.geometry.spherical.computeDistanceBetween(from, to) / 1000;
                    applyDistancePricing(linearKm); 
                    setShippingDetails(`${linearKm.toFixed(1)} km (Linear)`);
                }
            }
        });
    } 
    else if (addr.regionType === 'outras_localidades' && addr.sectorName) {
        const area = storeSettings.shipping.fixedAreas.find(a => a.name === addr.sectorName);
        if (area) {
            setShippingDetails(area.name); 
            if (area.type === 'fixed') {
                setShippingPrice(area.price);
            } else if (area.type === 'km_plus_tax' && addr.location && storeSettings.location) {
                const service = new window.google.maps.DistanceMatrixService();
                service.getDistanceMatrix({
                    origins: [{ lat: storeSettings.location.lat, lng: storeSettings.location.lng }],
                    destinations: [{ lat: addr.location.lat, lng: addr.location.lng }],
                    travelMode: window.google.maps.TravelMode.DRIVING,
                }, (response, status) => {
                    let distKm = 0;
                    if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') {
                        distKm = response.rows[0].elements[0].distance.value / 1000;
                    } else if (window.google?.maps?.geometry) {
                        const from = new window.google.maps.LatLng(storeSettings.location.lat, storeSettings.location.lng);
                        const to = new window.google.maps.LatLng(addr.location.lat, addr.location.lng);
                        distKm = window.google.maps.geometry.spherical.computeDistanceBetween(from, to) / 1000;
                    }
                    const price = (distKm * 2) + (area.tax || 0); 
                    setShippingPrice(price);
                    setShippingDetails(`${area.name} (${distKm.toFixed(1)} km)`);
                });
            }
        }
    }
  }, [deliveryMethod, paymentMethod, selectedAddressId, storeSettings, savedAddresses, cartTotal, isLoaded, activeCoupon]);

  // --- LÓGICA CUPOM (NOVO) ---
  const applyCoupon = async () => {
      setCouponError("");
      if(!couponCode) return;
      try {
          const q = query(collection(db, "promotions"), where("type", "==", "coupon"), where("active", "==", true), where("codes", "array-contains", couponCode));
          const snap = await getDocs(q);
          if (snap.empty) { 
              setCouponError("Cupom inválido ou expirado."); 
              return; 
          }
          const promoDoc = snap.docs[0];
          setActiveCoupon({ code: couponCode, id: promoDoc.id });
          setCouponCode("");
      } catch (e) { console.error(e); setCouponError("Erro ao validar."); }
  };

  const removeCoupon = () => { setActiveCoupon(null); setShippingDetails(""); };

  // --- Funções Auxiliares ---
  const handleOpenEditAddress = (addr: UserAddress) => { setEditingAddrId(addr.id); setNewAddr({ ...addr }); if(addr.location) setAddrMapLoc(addr.location); setIsAddrModalOpen(true); };
  const handleNewAddress = () => { setEditingAddrId(null); setNewAddr({ regionType: 'plano_diretor', street: "", number: "", district: "", complement: "", nickname: "Casa", cep: "" }); setAddrMapLoc(DEFAULT_CENTER); setIsAddrModalOpen(true); };
  const handleSaveAddress = async () => { if(!newAddr.street || !newAddr.number) return alert("Preencha rua e número"); if(!user) return; let updatedList = [...savedAddresses]; const addressData: UserAddress = { id: editingAddrId || crypto.randomUUID(), ...newAddr as UserAddress, location: addrMapLoc }; if (editingAddrId) updatedList = updatedList.map(a => a.id === editingAddrId ? addressData : a); else updatedList.push(addressData); await updateDoc(doc(db, "users", user.uid), { savedAddresses: updatedList }); setSavedAddresses(updatedList); setIsAddrModalOpen(false); };
  const handleBuscaCep = async () => { if(!newAddr.cep || newAddr.cep.length < 8) return alert("CEP Inválido"); try { const res = await fetch(`https://viacep.com.br/ws/${newAddr.cep.replace(/\D/g,'')}/json/`); const data = await res.json(); if(!data.erro) { setNewAddr(prev => ({...prev, street: data.logradouro, district: data.bairro})); if(window.google) { const geocoder = new window.google.maps.Geocoder(); geocoder.geocode({ address: newAddr.cep }, (results, status) => { if(status === 'OK' && results?.[0]) { const loc = results[0].geometry.location; setAddrMapLoc({ lat: loc.lat(), lng: loc.lng() }); } }); } } } catch(e) { alert("Erro CEP"); } };
  const handleOpenPix = () => { const total = cartTotal + shippingPrice; const code = generatePixCopyPaste(total, storeSettings?.pix); setPixCode(code); setPixCopied(false); setShowPixModal(true); };
  const handleCopyPix = () => { navigator.clipboard.writeText(pixCode); setPixCopied(true); setTimeout(() => setPixCopied(false), 2000); };

  const handleCheckout = async () => {
    if (isStoreClosed) return alert("Loja Fechada.");
    if (!user) { loginGoogle(); return; }
    if (isSubmitting) return;

    const finalPhone = profile?.phone || missingPhone;
    if (!finalPhone || finalPhone.length < 8) return alert("Informe um WhatsApp válido.");

    const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId);
    if (deliveryMethod === 'delivery' && !selectedAddr && paymentMethod !== 'conta_aberta') return alert("Selecione um endereço.");

    setIsSubmitting(true);
    const finalTotal = cartTotal + shippingPrice;
    const shortId = generateShortId(); 

    try {
        if (!profile?.phone && missingPhone) await updateDoc(doc(db, "users", user.uid), { phone: missingPhone });

        await runTransaction(db, async (transaction) => {
            // VALIDA E QUEIMA CUPOM (SE HOUVER)
            if (activeCoupon) {
                const promoRef = doc(db, "promotions", activeCoupon.id);
                const promoSnap = await transaction.get(promoRef);
                if (promoSnap.exists()) {
                    const codes = promoSnap.data().codes || [];
                    if (!codes.includes(activeCoupon.code)) throw new Error("Cupom já utilizado ou expirado.");
                    // Remove o cupom usado
                    transaction.update(promoRef, { codes: arrayRemove(activeCoupon.code) });
                } else {
                    throw new Error("Promoção não encontrada.");
                }
            }

            // Estoque (Simplificado para produtos normais)
            const productDecrements = new Map<string, number>();
            // ... (Lógica de decrementar normal) ...
            
            const finalAddress = (paymentMethod === 'conta_aberta' || deliveryMethod === 'pickup') 
                ? null 
                : (selectedAddr || null);

            const newOrderRef = doc(collection(db, "orders"));
            transaction.set(newOrderRef, {
                shortId: shortId, userId: user.uid, userName: profile?.name || user.displayName, userPhone: finalPhone,
                items: JSON.stringify(items), total: finalTotal, status: 'em_aberto', paymentMethod: paymentMethod,
                deliveryMethod: deliveryMethod, createdAt: serverTimestamp(), shippingPrice: shippingPrice,
                address: finalAddress,
                isPaid: false,
                couponCode: activeCoupon?.code || null // Salva cupom usado
            });
        });

        const payConfig = storeSettings?.paymentMethods[paymentMethod as keyof typeof storeSettings.paymentMethods];
        const payText = payConfig ? payConfig.label : paymentMethod.toUpperCase();

        let msg = `*PEDIDO #${shortId}* - ${profile?.name || user.displayName}\n`;
        items.forEach(i => msg += `${i.quantity}x ${i.name}\n`);
        
        if (deliveryMethod === 'delivery' && paymentMethod !== 'conta_aberta') {
            msg += `📦 *Entrega*\n📍 ${selectedAddr?.street}, ${selectedAddr?.number}\n`;
        } else if (paymentMethod === 'conta_aberta') {
            msg += `📄 *Pagamento Mensalista*\n`;
        } else {
            msg += `🏪 *Retirada*\n`;
        }
        
        if(activeCoupon) msg += `🎟️ Cupom: ${activeCoupon.code} (Frete Grátis)\n`;
        msg += `💳 ${payText}\n*TOTAL: R$ ${finalTotal.toFixed(2)}*`;

        const phone = storeSettings?.whatsapp || "5563981221181";
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
        
        if (paymentMethod === 'pix') { if(confirm("Abrir PIX?")) handleOpenPix(); else clearCart(); }
        else clearCart();

    } catch (error: any) { console.error(error); alert(error.message || "Erro ao processar."); } finally { setIsSubmitting(false); }
  };

  if (items.length === 0) return <div className="p-10 text-center"><ShoppingBag className="mx-auto mb-4 text-gray-300" size={64}/><p>Carrinho vazio.</p><Link href="/" className="text-pink-600 font-bold">Voltar</Link></div>;

  return (
    <div className="pb-40 pt-2 px-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6"><Link href="/"><ArrowLeft/></Link><h1 className="font-bold text-lg">Seu Pedido</h1></div>

      {stockWarnings.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="text-yellow-600" size={20}/><span className="font-bold text-yellow-700">Atenção ao Estoque</span></div>
              <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">{stockWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
      )}

      <div className="space-y-3 mb-6">
        {items.map(item => (
            <div key={item.cartId} className="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm">
                <div className="flex-1"><p className="font-bold text-sm text-gray-800">{item.name}</p><p className="text-xs text-green-600 font-bold">R$ {item.price.toFixed(2)}</p></div>
                <div className="flex items-center gap-3 mr-4 bg-gray-50 rounded-lg p-1"><button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center bg-white shadow rounded font-bold"><Minus size={14}/></button><span className="text-sm font-bold w-4 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center bg-white shadow rounded font-bold"><Plus size={14}/></button></div>
                <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 p-2"><Trash2 size={18}/></button>
            </div>
        ))}
      </div>

      {/* INPUT DE CUPOM */}
      <div className="bg-white p-4 rounded-xl border mb-4 shadow-sm">
          <h2 className="font-bold text-sm flex gap-2 items-center mb-3 text-slate-700"><Ticket size={16} className="text-pink-600"/> Cupom de Frete</h2>
          {activeCoupon ? (
              <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-200">
                  <span className="text-green-700 font-bold text-sm flex items-center gap-2"><CheckCircle size={16}/> {activeCoupon.code} aplicado!</span>
                  <button onClick={removeCoupon} className="text-red-500 text-xs font-bold hover:underline bg-white px-2 py-1 rounded border border-red-100">Remover</button>
              </div>
          ) : (
              <div className="flex gap-2">
                  <input className="flex-1 border rounded-lg p-2 uppercase text-sm outline-none focus:ring-2 focus:ring-pink-100" placeholder="Código" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}/>
                  <button onClick={applyCoupon} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition">Aplicar</button>
              </div>
          )}
          {couponError && <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1"><AlertTriangle size={12}/> {couponError}</p>}
      </div>

      {user && !profile?.phone && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-4">
              <label className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-2"><Phone size={16}/> WhatsApp</label>
              <input className="w-full p-3 border border-orange-300 rounded-lg" value={missingPhone} onChange={e => setMissingPhone(e.target.value)}/>
          </div>
      )}

      {paymentMethod !== 'conta_aberta' && (
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4 mb-4">
            <h2 className="font-bold text-sm flex gap-2 items-center"><MapPin size={16} className="text-pink-600"/> Entrega</h2>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setDeliveryMethod('delivery')} className={`flex-1 py-2 text-sm font-bold rounded-md ${deliveryMethod === 'delivery' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>Entrega</button>
                <button onClick={() => setDeliveryMethod('pickup')} className={`flex-1 py-2 text-sm font-bold rounded-md ${deliveryMethod === 'pickup' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>Retirar</button>
            </div>
            {deliveryMethod === 'delivery' && (
                <div className="space-y-3">
                    {savedAddresses.map(addr => (
                        <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} className={`p-3 border rounded-xl cursor-pointer flex justify-between items-center ${selectedAddressId === addr.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                            <div><span className="text-xs font-bold uppercase bg-gray-100 px-1 rounded">{addr.nickname}</span><p className="text-sm font-bold mt-1">{addr.street}, {addr.number}</p></div>
                            {selectedAddressId === addr.id && <CheckCircle size={18} className="text-pink-600"/>}
                        </div>
                    ))}
                    <button onClick={handleNewAddress} className="w-full py-3 border-2 border-dashed rounded-xl font-bold text-gray-400 hover:bg-gray-50">+ Endereço</button>
                </div>
            )}
          </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border mb-24">
        <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><CreditCard size={16}/> Pagamento</h2>
        <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPaymentMethod('pix')} className={`py-3 border rounded-lg text-xs font-bold ${paymentMethod === 'pix' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : ''}`}>PIX</button>
            <button onClick={() => setPaymentMethod('money')} className={`py-3 border rounded-lg text-xs font-bold ${paymentMethod === 'money' ? 'bg-green-50 border-green-500 text-green-700' : ''}`}>Dinheiro</button>
        </div>
        {isMonthlyOrReseller && <button onClick={() => setPaymentMethod('conta_aberta')} className={`w-full mt-2 py-3 border-2 border-dashed rounded-lg text-sm font-bold ${paymentMethod === 'conta_aberta' ? 'bg-purple-100 border-purple-500 text-purple-700' : ''}`}>Conta Mensal</button>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg safe-area-bottom z-40">
        <div className="max-w-2xl mx-auto space-y-3">
             <div className="flex justify-between font-bold text-lg text-gray-800"><span>Total</span><span className="text-green-600">R$ {(cartTotal + shippingPrice).toFixed(2)}</span></div>
             <div className="flex justify-between text-xs text-gray-500"><span className="flex items-center gap-1">Frete: {deliveryMethod === 'pickup' ? 'Grátis' : shippingDetails || `R$ ${shippingPrice.toFixed(2)}`}</span></div>
            <button onClick={handleCheckout} disabled={isSubmitting || isStoreClosed} className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg ${isStoreClosed ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                {isSubmitting ? <Loader2 className="animate-spin"/> : isStoreClosed ? 'LOJA FECHADA' : <><Send size={18}/> Enviar Pedido</>}
            </button>
        </div>
      </div>

      {isAddrModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white w-full max-w-md rounded-2xl p-6"><h2 className="font-bold mb-4">Endereço</h2><input className="w-full border p-2 rounded mb-2" placeholder="Rua" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})}/><div className="flex gap-2"><button onClick={() => setIsAddrModalOpen(false)} className="border p-2 rounded flex-1">Cancelar</button><button onClick={handleSaveAddress} className="bg-slate-900 text-white p-2 rounded flex-1">Salvar</button></div></div></div>)}
      
      {showPixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative">
                  <button onClick={() => setShowPixModal(false)} className="absolute top-2 right-2"><X/></button>
                  <h3 className="font-bold text-lg mb-4 text-center">Pagamento PIX</h3>
                  <div className="flex justify-center mb-4"><QRCodeSVG value={pixCode} size={200} /></div>
                  <button onClick={handleCopyPix} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Copiar Código</button>
              </div>
          </div>
      )}
    </div>
  );
}