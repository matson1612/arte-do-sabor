// src/app/(shop)/cart/page.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { 
  Trash2, ArrowLeft, Send, LogIn, ShoppingBag, ImageOff, 
  MapPin, Store, CreditCard, LocateFixed, Coins
} from "lucide-react";
import { useState, useEffect } from "react";
import { getStoreSettings } from "@/services/settingsService"; // <--- NOVO
import { StoreSettings } from "@/types"; // <--- NOVO

// --- TIPOS DE REGIÃO ---
type RegionType = {
    id: string;
    label: string;
    price: number | 'gps'; 
    extraFee?: number;
};

// ... (Mantenha o REGIONS e calculateDistanceCost iguais ao anterior) ...
// Vou repetir aqui só para garantir que você tenha o arquivo completo sem erros
const REGIONS: RegionType[] = [
    { id: 'plano', label: 'Plano Diretor (Norte/Sul) / Centro', price: 'gps' },
    { id: 'agua_fria', label: 'Setor Água Fria (Sentido Polinésia)', price: 25.00 },
    { id: 'bertha', label: 'Bertha Ville / Irmã Dulce / União Sul', price: 30.00 },
    { id: 'aurenys', label: 'Aurenys (1-4) / St. Universitário', price: 35.00 },
    { id: 'taquaralto', label: 'Taquaralto e Região', price: 40.00 },
    { id: 'taquari', label: 'Taquari / Flamboyant / Jd. Vitória', price: 45.00 },
    { id: 'aeroporto', label: 'Aeroporto', price: 50.00 },
    { id: 'luzimangues', label: 'Luzimangues', price: 50.00 },
    { id: 'lago_norte', label: 'Lago Norte (+ Taxa R$ 2)', price: 'gps', extraFee: 2.00 },
    { id: 'prata_caju', label: 'Praia do Prata e Caju (+ Taxa R$ 5)', price: 'gps', extraFee: 5.00 },
    { id: 'campus2', label: 'Campus 2 Católica (+ Taxa R$ 5)', price: 'gps', extraFee: 5.00 },
];

const calculateDistanceCost = (km: number) => {
    if (km <= 3) return 8.00;
    if (km <= 5) return 9.00;
    if (km <= 6) return 10.00;
    if (km < 7)  return 11.00;
    if (km < 8)  return 12.00;
    if (km < 9)  return 13.00;
    if (km < 10) return 14.00;
    if (km < 11) return 15.00;
    if (km < 12) return 16.00;
    if (km < 13) return 18.00;
    if (km < 14) return 20.00;
    if (km < 15) return 22.00;
    if (km < 16) return 24.00;
    if (km < 17) return 26.00;
    return 28.00;
};

export default function CartPage() {
  const { items, removeFromCart, cartTotal, clearCart } = useCart();
  const { user, loginGoogle, profile } = useAuth();
  
  const [isSending, setIsSending] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null); // <--- Configs da Loja

  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'money'>('pix');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('plano');
  const [shippingPrice, setShippingPrice] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [address, setAddress] = useState({ street: "", number: "", district: "", complement: "" });
  const [changeFor, setChangeFor] = useState("");

  // Carrega Configs da Loja
  useEffect(() => {
    getStoreSettings().then(setSettings);
  }, []);

  // Recalcular Frete ao mudar região
  useEffect(() => {
    const region = REGIONS.find(r => r.id === selectedRegionId);
    if (!region) return;
    if (typeof region.price === 'number') {
        setShippingPrice(region.price);
        setDistance(null);
    } else {
        setShippingPrice(0);
        setDistance(null);
    }
  }, [selectedRegionId]);

  // CÁLCULO VIA GPS USANDO DADOS REAIS
  const handleCalculateGPS = () => {
    if (!settings?.location?.lat) {
        return alert("Erro: O dono da loja ainda não configurou a localização no painel Admin.");
    }
    
    setCalculating(true);
    if (!navigator.geolocation) {
        alert("GPS não suportado.");
        setCalculating(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // Haversine
            const R = 6371; 
            const dLat = (userLat - settings.location.lat) * (Math.PI / 180);
            const dLng = (userLng - settings.location.lng) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(settings.location.lat * (Math.PI / 180)) * Math.cos(userLat * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = R * c;

            setDistance(dist);
            
            const region = REGIONS.find(r => r.id === selectedRegionId);
            const baseCost = calculateDistanceCost(dist);
            const extra = region?.extraFee || 0;
            
            setShippingPrice(baseCost + extra);
            setCalculating(false);
            
            alert(`📍 Distância da loja: ${dist.toFixed(1)}km\n✅ Frete calculado: R$ ${(baseCost + extra).toFixed(2)}`);
        },
        (error) => {
            console.error(error);
            alert("Erro ao obter localização.");
            setCalculating(false);
        },
        { enableHighAccuracy: true }
    );
  };

  const changeFee = (paymentMethod === 'money' && changeFor) ? 2.00 : 0;
  const finalTotal = cartTotal + (deliveryMethod === 'delivery' ? shippingPrice : 0) + changeFee;

  const handleCheckout = async () => {
    if (!user) { loginGoogle(); return; }
    if (items.length === 0) return;

    // Validações
    if (deliveryMethod === 'delivery') {
        const region = REGIONS.find(r => r.id === selectedRegionId);
        if (!address.street || !address.number || !address.district) return alert("Preencha o endereço completo.");
        if (region?.price === 'gps' && shippingPrice === 0) return alert("Calcule o frete via GPS.");
    }

    setIsSending(true);
    const phoneNumber = settings?.phone || "5511999999999"; // Usa o número configurado!
    
    let msg = `*NOVO PEDIDO - ${profile?.name || user.displayName}*\n`;
    msg += `--------------------------------\n`;
    items.forEach(item => {
        msg += `• ${item.quantity}x ${item.name}\n`;
        const opts = Object.values(item.selectedOptions).flat().map((o: any) => o?.name ? `  + ${o.name}` : "").filter(Boolean).join("\n");
        if(opts) msg += `${opts}\n`;
    });
    
    msg += `--------------------------------\n`;
    msg += `Subtotal: R$ ${cartTotal.toFixed(2)}\n`;
    
    if (deliveryMethod === 'delivery') {
        const regionLabel = REGIONS.find(r => r.id === selectedRegionId)?.label;
        msg += `\n*📦 Entrega (${regionLabel})*\n`;
        if (distance) msg += `Distância: ${distance.toFixed(1)}km\n`;
        msg += `Frete: R$ ${shippingPrice.toFixed(2)}\n`;
        msg += `Endereço: ${address.street}, ${address.number} - ${address.district}`;
        if (address.complement) msg += ` (${address.complement})`;
    } else {
        msg += `\n*📦 Retirada na Loja*\n`;
        if(settings?.address) {
            msg += `Endereço: ${settings.address.street}, ${settings.address.number} - ${settings.address.district}`;
        }
    }

    msg += `\n\n*💲 Pagamento:* ${paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}`;
    if (paymentMethod === 'money' && changeFor) {
        msg += `\nTroco para: R$ ${changeFor}`;
        msg += `\nTaxa Troco: R$ 2,00`;
    }

    msg += `\n\n*TOTAL FINAL: R$ ${finalTotal.toFixed(2)}*`;

    try {
        await addDoc(collection(db, "orders"), {
            userId: user.uid,
            userName: profile?.name || user.displayName,
            items: JSON.stringify(items),
            total: finalTotal,
            status: "em_aberto",
            createdAt: serverTimestamp(),
            paymentMethod,
            changeFee,
            deliveryMethod,
            address: deliveryMethod === 'delivery' ? { ...address, region: selectedRegionId } : null
        });
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`, "_blank");
        if(clearCart) clearCart();
    } catch (e) {
        alert("Erro ao enviar.");
    } finally {
        setIsSending(false);
    }
  };

  if (!settings) return <div className="p-10 text-center">Carregando loja...</div>;

  return (
    <div className="pb-40 pt-6 px-4 max-w-2xl mx-auto min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-white rounded-full"><ArrowLeft size={24}/></Link>
            <h1 className="text-2xl font-bold">Checkout</h1>
        </div>
        {items.length > 0 && <button onClick={() => {if(confirm("Limpar?")) clearCart()}} className="text-xs text-red-500 underline">Limpar</button>}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20"><ShoppingBag className="mx-auto text-gray-300 mb-4" size={48}/><p>Sacola vazia</p><Link href="/" className="inline-block mt-4 bg-pink-600 text-white px-6 py-2 rounded-lg font-bold">Voltar</Link></div>
      ) : (
        <div className="space-y-6">
            
            {/* ITENS */}
            <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
                <h2 className="font-bold text-sm uppercase flex gap-2"><ShoppingBag size={16} className="text-pink-600"/> Pedido</h2>
                {items.map(item => (
                    <div key={item.cartId} className="flex gap-4 border-b last:border-0 pb-4 last:pb-0">
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                             {item.imageUrl?.startsWith('http') ? <img src={item.imageUrl} className="w-full h-full object-cover"/> : <ImageOff size={20} className="text-gray-300"/>}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between"><span className="font-bold text-sm">{item.quantity}x {item.name}</span><span className="font-bold text-sm">R$ {item.finalPrice.toFixed(2)}</span></div>
                            <div className="text-xs text-gray-500 pl-2 border-l-2 mt-1">{Object.values(item.selectedOptions).flat().map((o:any,i) => o?.name ? <div key={i}>+ {o.name}</div> : null)}</div>
                            <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 text-xs flex items-center gap-1 mt-2 ml-auto"><Trash2 size={12}/> Remover</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ENTREGA */}
            <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
                <h2 className="font-bold text-sm uppercase flex gap-2"><MapPin size={16} className="text-pink-600"/> Entrega</h2>
                <div className="flex gap-3">
                    <button onClick={() => setDeliveryMethod('delivery')} className={`flex-1 py-3 rounded border font-bold text-sm ${deliveryMethod === 'delivery' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'text-gray-600'}`}>🛵 Entrega</button>
                    <button onClick={() => {setDeliveryMethod('pickup'); setShippingPrice(0);}} className={`flex-1 py-3 rounded border font-bold text-sm ${deliveryMethod === 'pickup' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'text-gray-600'}`}>🏪 Retirar</button>
                </div>

                {deliveryMethod === 'delivery' ? (
                    <div className="space-y-4 animate-in fade-in">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Selecione sua Região</label>
                            <select className="w-full p-3 border rounded-lg bg-white text-sm outline-none focus:border-pink-500" value={selectedRegionId} onChange={(e) => setSelectedRegionId(e.target.value)}>
                                {REGIONS.map(r => (
                                    <option key={r.id} value={r.id}>{r.label} {typeof r.price === 'number' ? `(R$ ${r.price.toFixed(2)})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        {REGIONS.find(r => r.id === selectedRegionId)?.price === 'gps' && (
                            <div className="bg-blue-50 p-4 rounded border border-blue-100">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-bold text-blue-800">Calcular Distância</span>
                                    {distance && <span className="text-xs bg-white px-2 py-1 rounded font-bold text-blue-600">{distance.toFixed(1)}km</span>}
                                </div>
                                <button onClick={handleCalculateGPS} disabled={calculating} className="w-full bg-blue-600 text-white py-2 rounded font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
                                    {calculating ? "Calculando..." : <><LocateFixed size={16}/> Calcular Frete (GPS)</>}
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-4 gap-3">
                            <input placeholder="Rua" className="col-span-3 p-3 border rounded text-sm" value={address.street} onChange={e => setAddress({...address, street: e.target.value})}/>
                            <input placeholder="Nº" className="col-span-1 p-3 border rounded text-sm" value={address.number} onChange={e => setAddress({...address, number: e.target.value})}/>
                        </div>
                        <input placeholder="Bairro" className="w-full p-3 border rounded text-sm" value={address.district} onChange={e => setAddress({...address, district: e.target.value})}/>
                        <input placeholder="Complemento" className="w-full p-3 border rounded text-sm" value={address.complement} onChange={e => setAddress({...address, complement: e.target.value})}/>
                    </div>
                ) : (
                    <div className="p-3 bg-gray-50 text-gray-600 text-sm rounded-lg flex items-center gap-2">
                        <Store size={16}/> 
                        <span>
                            <b>Retirada na loja:</b><br/>
                            {settings.address ? `${settings.address.street}, ${settings.address.number} - ${settings.address.district}` : "Endereço não configurado"}
                        </span>
                    </div>
                )}
            </div>

            {/* PAGAMENTO */}
            <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
                <h2 className="font-bold text-sm uppercase flex gap-2"><CreditCard size={16} className="text-pink-600"/> Pagamento</h2>
                <div className="grid grid-cols-3 gap-3">
                    {[{id:'pix', icon:'💠', l:'PIX'}, {id:'card', icon:'💳', l:'Cartão'}, {id:'money', icon:'💵', l:'Dinheiro'}].map(m => (
                        <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={`py-3 rounded border text-sm flex flex-col items-center gap-1 ${paymentMethod === m.id ? 'border-pink-600 bg-pink-50 text-pink-700' : 'text-gray-600'}`}>
                            <span className="text-xl">{m.icon}</span>{m.l}
                        </button>
                    ))}
                </div>
                {paymentMethod === 'money' && (
                    <div className="animate-in fade-in">
                        <label className="text-xs font-bold text-gray-500">Troco para quanto?</label>
                        <div className="flex items-center gap-2 mt-1 mb-2">
                            <span className="font-bold text-gray-400">R$</span>
                            <input type="number" placeholder="50.00" className="w-full p-2 border-b text-lg font-bold outline-none" value={changeFor} onChange={e => setChangeFor(e.target.value)}/>
                        </div>
                        {changeFor && <div className="text-xs bg-yellow-50 text-yellow-700 p-2 rounded flex items-center gap-2"><Coins size={14}/> Taxa de retorno de troco: + R$ 2,00</div>}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* TOTAL */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow z-40">
            <div className="max-w-2xl mx-auto space-y-2">
                <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>R$ {cartTotal.toFixed(2)}</span></div>
                {deliveryMethod === 'delivery' && (
                    <div className="flex justify-between text-sm text-blue-600">
                        <span>Frete {distance ? `(${distance.toFixed(1)}km)` : ''}</span>
                        <span>{shippingPrice > 0 ? `R$ ${shippingPrice.toFixed(2)}` : 'A calcular'}</span>
                    </div>
                )}
                {changeFee > 0 && (
                    <div className="flex justify-between text-sm text-yellow-600"><span>Taxa Troco</span><span>R$ {changeFee.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between pt-2 border-t font-extrabold text-xl text-green-600">
                    <span>Total</span><span>R$ {finalTotal.toFixed(2)}</span>
                </div>
                <button onClick={handleCheckout} disabled={isSending} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex justify-center gap-2 disabled:opacity-70">
                    {isSending ? "Enviando..." : <><Send size={20}/> Finalizar Pedido</>}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}