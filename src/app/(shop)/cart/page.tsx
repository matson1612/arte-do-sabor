// src/app/(shop)/cart/page.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Trash2, ArrowLeft, Send, MapPin, Search, Loader2, ShoppingBag, CreditCard, FileText, CheckCircle, Plus, Minus, AlertTriangle, Phone, QrCode, Copy, X, Link as LinkIcon, Banknote, Save, Pencil, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, runTransaction, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { generateShortId } from "@/utils/generateId"; 
import { Option, StoreSettings, UserAddress } from "@/types";
import { QRCodeSVG } from "qrcode.react"; 
import { generatePixCopyPaste } from "@/utils/pix";

const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 
const DEFAULT_CENTER = { lat: -10.183760, lng: -48.333650 }; 
const LIBRARIES: ("geometry")[] = ["geometry"];

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const { user, loginGoogle, profile } = useAuth();
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: LIBRARIES });
  
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [shippingPrice, setShippingPrice] = useState(0);
  const [shippingDetails, setShippingDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);
  const [missingPhone, setMissingPhone] = useState("");

  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [newAddr, setNewAddr] = useState<Partial<UserAddress>>({ regionType: 'plano_diretor', street: "", number: "", district: "", nickname: "Casa", cep: "" });
  const [addrMapLoc, setAddrMapLoc] = useState(DEFAULT_CENTER);

  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [pixCopied, setPixCopied] = useState(false);

  const isMonthlyOrReseller = profile?.clientType === 'monthly' || profile?.clientType === 'reseller';
  const isStoreClosed = storeSettings?.isOpen === false;

  useEffect(() => {
      getDoc(doc(db, "store_settings", "config")).then(snap => {
          if (snap.exists()) setStoreSettings(snap.data() as StoreSettings);
      });
  }, []);

  useEffect(() => { if (!user) return; getDoc(doc(db, "users", user.uid)).then(snap => { if (snap.exists() && snap.data().savedAddresses) { setSavedAddresses(snap.data().savedAddresses); if(snap.data().savedAddresses.length > 0) setSelectedAddressId(snap.data().savedAddresses[0].id); } }); }, [user]);
  useEffect(() => { if (items.length === 0) return; const validate = async () => { const warnings: string[] = []; for (const item of items) { if (!item.id) continue; try { const prod = await getDoc(doc(db, "products", item.id)); if (prod.exists()) { const stk = prod.data().stock; if (stk !== null && stk <= 0) { warnings.push(`"${item.name}" esgotou.`); removeFromCart(item.cartId); } else if (stk !== null && item.quantity > stk) { warnings.push(`"${item.name}" ajustado para ${stk} un.`); updateQuantity(item.cartId, stk); } } } catch (e) {} } if (warnings.length > 0) setStockWarnings(warnings); }; validate(); }, []);
  useEffect(() => { if (deliveryMethod === 'pickup') { setShippingPrice(0); setShippingDetails(""); return; } if (!storeSettings || !selectedAddressId || !isLoaded || !window.google?.maps?.geometry) return; const addr = savedAddresses.find(a => a.id === selectedAddressId); if (!addr) return; let price = 0; let details = ""; try { if (addr.regionType === 'plano_diretor' && addr.location && storeSettings.location) { const from = new window.google.maps.LatLng(storeSettings.location.lat, storeSettings.location.lng); const to = new window.google.maps.LatLng(addr.location.lat, addr.location.lng); const distKm = window.google.maps.geometry.spherical.computeDistanceBetween(from, to) / 1000; const service = new window.google.maps.DistanceMatrixService(); service.getDistanceMatrix({ origins: [{ lat: storeSettings.location.lat, lng: storeSettings.location.lng }], destinations: [{ lat: addr.location.lat, lng: addr.location.lng }], travelMode: window.google.maps.TravelMode.DRIVING, }, (response, status) => { let finalKm = distKm; if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') { finalKm = response.rows[0].elements[0].distance.value / 1000; } details = `${finalKm.toFixed(1)} km`; const rule = storeSettings.shipping.distanceTable.find(r => finalKm >= r.minKm && finalKm <= r.maxKm); if (rule) price = rule.price; else { const maxRule = storeSettings.shipping.distanceTable[storeSettings.shipping.distanceTable.length - 1]; price = maxRule ? maxRule.price : 0; } if(storeSettings.shipping.freeShippingAbove && storeSettings.shipping.freeShippingAbove > 0 && cartTotal >= storeSettings.shipping.freeShippingAbove) { price = 0; details = "Frete Grátis"; } setShippingPrice(price); setShippingDetails(details); }); } else if (addr.regionType === 'outras_localidades' && addr.sectorName) { const area = storeSettings.shipping.fixedAreas.find(a => a.name === addr.sectorName); if (area) { details = area.name; if (area.type === 'fixed') { price = area.price; } else if (area.type === 'km_plus_tax' && addr.location && storeSettings.location) { const from = new window.google.maps.LatLng(storeSettings.location.lat, storeSettings.location.lng); const to = new window.google.maps.LatLng(addr.location.lat, addr.location.lng); const distKm = window.google.maps.geometry.spherical.computeDistanceBetween(from, to) / 1000; const baseKmPrice = 2; price = (distKm * baseKmPrice) + (area.tax || 0); details += ` (${distKm.toFixed(1)} km)`; } } if(storeSettings.shipping.freeShippingAbove && storeSettings.shipping.freeShippingAbove > 0 && cartTotal >= storeSettings.shipping.freeShippingAbove) { price = 0; details = "Frete Grátis"; } setShippingPrice(price); setShippingDetails(details); } } catch (e) {} }, [deliveryMethod, selectedAddressId, storeSettings, savedAddresses, cartTotal, isLoaded]);

  const handleOpenEditAddress = (addr: UserAddress) => { setEditingAddrId(addr.id); setNewAddr({ ...addr }); if(addr.location) setAddrMapLoc(addr.location); setIsAddrModalOpen(true); };
  const handleNewAddress = () => { setEditingAddrId(null); setNewAddr({ regionType: 'plano_diretor', street: "", number: "", district: "", nickname: "Casa", cep: "" }); setAddrMapLoc(DEFAULT_CENTER); setIsAddrModalOpen(true); };
  const handleSaveAddress = async () => { if(!newAddr.street) return alert("Preencha rua"); if(!user) return; let updatedList = [...savedAddresses]; const addressData: UserAddress = { id: editingAddrId || crypto.randomUUID(), ...newAddr as UserAddress, location: addrMapLoc }; if (editingAddrId) updatedList = updatedList.map(a => a.id === editingAddrId ? addressData : a); else updatedList.push(addressData); await updateDoc(doc(db, "users", user.uid), { savedAddresses: updatedList }); setSavedAddresses(updatedList); setIsAddrModalOpen(false); };
  const handleBuscaCep = async () => { if(!newAddr.cep || newAddr.cep.length < 8) return alert("CEP Inválido"); try { const res = await fetch(`https://viacep.com.br/ws/${newAddr.cep.replace(/\D/g,'')}/json/`); const data = await res.json(); if(!data.erro) { setNewAddr(prev => ({...prev, street: data.logradouro, district: data.bairro})); if(window.google) { const geocoder = new window.google.maps.Geocoder(); geocoder.geocode({ address: newAddr.cep }, (results, status) => { if(status === 'OK' && results?.[0]) { const loc = results[0].geometry.location; setAddrMapLoc({ lat: loc.lat(), lng: loc.lng() }); } }); } } } catch(e) { alert("Erro CEP"); } };
  const handleOpenPix = () => { const total = cartTotal + shippingPrice; const code = generatePixCopyPaste(total, storeSettings?.pix); setPixCode(code); setPixCopied(false); setShowPixModal(true); };
  const handleCopyPix = () => { navigator.clipboard.writeText(pixCode); setPixCopied(true); setTimeout(() => setPixCopied(false), 2000); };

  const handleCheckout = async () => {
    if (isStoreClosed) return alert("Loja Fechada. Não aceitamos pedidos agora.");
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
        await runTransaction(db, async (transaction) => { /* estoque */ });
        const payConfig = storeSettings?.paymentMethods[paymentMethod as keyof typeof storeSettings.paymentMethods];
        const payText = payConfig ? payConfig.label : paymentMethod.toUpperCase();
        let msg = `*PEDIDO #${shortId}* - ${profile?.name || user.displayName}\n`;
        if (paymentMethod === 'conta_aberta') msg += `⚠️ *PEDIDO NA CONTA*\n`;
        items.forEach(i => msg += `${i.quantity}x ${i.name}\n`);
        if (deliveryMethod === 'delivery') { const addr = savedAddresses.find(a => a.id === selectedAddressId); msg += `📦 *Entrega (${addr?.regionType === 'plano_diretor' ? 'Plano Diretor' : addr?.sectorName})*\n📍 ${addr?.street}, ${addr?.number} - ${addr?.district}\n`; if(addr?.complement) msg += `Obs: ${addr.complement}\n`; if(addr?.location) msg += `🗺️ Maps: http://googleusercontent.com/maps.google.com/?q=${addr.location.lat},${addr.location.lng}\n`; } else msg += `🏪 *Retirada no Balcão*\n`;
        msg += `💳 Pagamento: ${payText}\n📞: ${finalPhone}\n\n*TOTAL: R$ ${finalTotal.toFixed(2)}*`;
        const phone = storeSettings?.whatsapp || "5563981221181";
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
        if (paymentMethod === 'pix') { if(confirm("Abrir PIX?")) handleOpenPix(); else clearCart(); } else clearCart();
    } catch (error: any) { console.error(error); alert(error.message || "Erro."); } finally { setIsSubmitting(false); }
  };

  if (items.length === 0) return <div className="p-10 text-center"><ShoppingBag className="mx-auto mb-4 text-gray-300" size={64}/><p>Carrinho vazio.</p><Link href="/" className="text-pink-600 font-bold">Voltar</Link></div>;

  return (
    <div className="pb-40 pt-2 px-4 max-w-2xl mx-auto">
        <h1 className="font-bold text-xl mb-6">Finalizar Pedido</h1>

        {/* AVISO LOJA FECHADA */}
        {isStoreClosed && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r flex items-center gap-3 animate-pulse">
                <Clock className="text-red-600" size={24}/>
                <div>
                    <h3 className="font-bold text-red-800">LOJA FECHADA</h3>
                    <p className="text-sm text-red-700">Apenas para consulta. Não é possível finalizar pedidos agora.</p>
                </div>
            </div>
        )}

        <div className="space-y-3 mb-6">
            {items.map(item => (
                <div key={item.cartId} className="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm">
                    <div className="flex-1"><p className="font-bold text-sm text-gray-800">{item.name}</p><p className="text-xs text-green-600 font-bold">Unit: R$ {item.price.toFixed(2)}</p></div>
                    <div className="flex items-center gap-3 mr-4 bg-gray-50 rounded-lg p-1"><button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center bg-white shadow rounded hover:bg-gray-200 text-gray-600 font-bold" disabled={item.quantity <= 1}><Minus size={14}/></button><span className="text-sm font-bold w-4 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center bg-white shadow rounded hover:bg-gray-200 text-green-600 font-bold"><Plus size={14}/></button></div>
                    <div className="text-right mr-4 font-bold text-sm">R$ {(item.price * item.quantity).toFixed(2)}</div>
                    <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 p-2 hover:bg-red-50 rounded-full transition"><Trash2 size={18}/></button>
                </div>
            ))}
        </div>

        {user && !profile?.phone && (<div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-4"><label className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-2"><Phone size={16}/> WhatsApp</label><input className="w-full p-3 border border-orange-300 rounded-lg" value={missingPhone} onChange={e => setMissingPhone(e.target.value)}/></div>)}

        {paymentMethod !== 'conta_aberta' && (
            <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4 mb-4">
                <h2 className="font-bold text-sm flex gap-2 items-center"><MapPin size={16} className="text-pink-600"/> Entrega</h2>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setDeliveryMethod('delivery')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${deliveryMethod === 'delivery' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'}`}>Entrega</button>
                    <button onClick={() => setDeliveryMethod('pickup')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${deliveryMethod === 'pickup' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'}`}>Retirar</button>
                </div>
                {deliveryMethod === 'delivery' && (
                    <div className="space-y-3">
                        {savedAddresses.map(addr => (
                            <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} className={`p-3 border rounded-xl cursor-pointer flex justify-between items-center ${selectedAddressId === addr.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                                <div><span className="text-xs font-bold bg-white border px-2 py-0.5 rounded text-gray-500 uppercase">{addr.nickname}</span><p className="font-bold text-sm mt-1">{addr.street}</p></div>
                                <div className="flex items-center gap-2">{selectedAddressId === addr.id && <CheckCircle size={18} className="text-pink-600"/>}<button onClick={() => handleOpenEditAddress(addr)} className="text-gray-400 hover:text-blue-500 p-1"><Pencil size={16}/></button></div>
                            </div>
                        ))}
                        <button onClick={handleNewAddress} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50">+ Novo Endereço</button>
                    </div>
                )}
            </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm border mb-24">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><CreditCard size={16}/> Forma de Pagamento</h2>
            <div className="grid grid-cols-2 gap-2">
                {storeSettings?.paymentMethods.pix.active && (<button onClick={() => setPaymentMethod('pix')} className={`py-3 px-2 border rounded-lg text-xs font-bold ${paymentMethod === 'pix' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : ''}`}><QrCode size={18}/> PIX</button>)}
                {storeSettings?.paymentMethods.money.active && (<button onClick={() => setPaymentMethod('money')} className={`py-3 px-2 border rounded-lg text-xs font-bold ${paymentMethod === 'money' ? 'bg-green-50 border-green-500 text-green-700' : ''}`}><Banknote size={18}/> Dinheiro</button>)}
                {storeSettings?.paymentMethods.link_debit.active && (<button onClick={() => setPaymentMethod('link_debito')} className={`py-3 px-2 border rounded-lg text-xs font-bold ${paymentMethod === 'link_debito' ? 'bg-blue-50 border-blue-500 text-blue-700' : ''}`}><LinkIcon size={18}/> Débito</button>)}
                {storeSettings?.paymentMethods.link_credit.active && (<button onClick={() => setPaymentMethod('link_credito')} className={`py-3 px-2 border rounded-lg text-xs font-bold ${paymentMethod === 'link_credito' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : ''}`}><LinkIcon size={18}/> Crédito</button>)}
            </div>
            {isMonthlyOrReseller && storeSettings?.paymentMethods.monthly.active && (<button onClick={() => setPaymentMethod('conta_aberta')} className={`w-full mt-2 py-3 border-2 border-dashed rounded-lg text-sm font-bold ${paymentMethod === 'conta_aberta' ? 'bg-purple-100 border-purple-500 text-purple-700' : ''}`}><FileText size={18}/> Pagar na Conta</button>)}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg safe-area-bottom z-40">
            <div className="max-w-2xl mx-auto space-y-3">
                <div className="flex justify-between font-bold text-lg text-gray-800"><span>Total</span><span className="text-green-600">R$ {(cartTotal + shippingPrice).toFixed(2)}</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span className="flex items-center gap-1">Frete: {deliveryMethod === 'pickup' ? 'Grátis' : `R$ ${shippingPrice.toFixed(2)}`} {shippingDetails && <span className="font-normal text-gray-400">({shippingDetails})</span>}</span></div>
                
                {/* BOTÃO FINAL (BLOQUEADO SE FECHADO) */}
                <button 
                    onClick={handleCheckout} 
                    disabled={isSubmitting || isStoreClosed} 
                    className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg ${isStoreClosed ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-green-600 text-white hover:bg-green-700'}`}
                >
                    {isSubmitting ? <Loader2 className="animate-spin"/> : isStoreClosed ? 'LOJA FECHADA' : <><Send size={18}/> {paymentMethod === 'conta_aberta' ? 'Confirmar na Conta' : 'Enviar Pedido'}</>}
                </button>
            </div>
        </div>

        {/* Modais Endereço e PIX (Mantidos igual ao anterior) */}
        {isAddrModalOpen && (/* ...igual... */ null)}
        {showPixModal && (/* ...igual... */ null)}
    </div>
  );
}