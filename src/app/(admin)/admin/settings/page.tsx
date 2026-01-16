// src/app/(shop)/cart/page.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { 
  Trash2, ArrowLeft, Send, LogIn, ShoppingBag, ImageOff, 
  MapPin, Store, CreditCard, Search, Loader2, LocateFixed, Coins
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { getStoreSettings } from "@/services/settingsService"; 
import { StoreSettings } from "@/types";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

// --- CONFIG DO MAPA ---
const mapContainerStyle = { width: '100%', height: '300px', borderRadius: '0.75rem' };
const defaultCenter = { lat: -10.183760, lng: -48.333650 }; // Palmas
const GOOGLE_MAPS_API_KEY = "AIzaSyCW0ToQDvynrwUwLJeYM8HpF82_Qm4G-R0"; // <--- ⚠️ COLOQUE SUA CHAVE AQUI

// --- REGIÕES ---
const REGIONS = [
    { id: 'plano', label: 'Plano Diretor / Centro (Calculado por KM)', price: 'gps' },
    { id: 'taquaralto', label: 'Taquaralto e Região (Fixo R$ 40)', price: 40.00 },
    { id: 'aurenys', label: 'Aurenys / Universitário (Fixo R$ 35)', price: 35.00 },
    { id: 'taquari', label: 'Taquari / Jd. Vitória (Fixo R$ 45)', price: 45.00 },
    { id: 'aeroporto', label: 'Aeroporto (Fixo R$ 50)', price: 50.00 },
    { id: 'luzimangues', label: 'Luzimangues (Fixo R$ 50)', price: 50.00 },
    { id: 'lago_norte', label: 'Lago Norte (KM + Taxa R$ 2)', price: 'gps', extraFee: 2.00 },
];

// --- TABELA DE PREÇO POR DISTÂNCIA ---
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
    return 28.00;
};

export default function CartPage() {
  const { items, removeFromCart, cartTotal, clearCart } = useCart();
  const { user, loginGoogle, profile } = useAuth();
  
  const [isSending, setIsSending] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Estados de Entrega
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('plano');
  const [address, setAddress] = useState({ street: "", number: "", district: "", complement: "" });
  const [cepInput, setCepInput] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  // Estados do Mapa/Frete
  const [shippingPrice, setShippingPrice] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  
  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'money'>('pix');
  const [changeFor, setChangeFor] = useState("");

  const mapRef = useRef<google.maps.Map | null>(null);

  // Carrega Mapa
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  // Carrega Configs da Loja
  useEffect(() => {
    getStoreSettings().then(data => {
        setSettings(data);
        // Centraliza mapa na loja inicialmente
        if (data?.location) setUserLocation({ lat: data.location.lat, lng: data.location.lng });
    });
  }, []);

  // Recalcula frete quando o pino muda OU a região muda
  useEffect(() => {
    if (deliveryMethod !== 'delivery' || !settings?.location) return;

    const region = REGIONS.find(r => r.id === selectedRegionId);
    if (!region) return;

    // Se for preço fixo, ignora o mapa para cálculo (mas o mapa serve para localização)
    if (typeof region.price === 'number') {
        setShippingPrice(region.price);
        setDistance(null);
        return;
    }

    // Se for GPS, calcula distância entre Loja e Pino do Usuário
    const R = 6371; 
    const dLat = (userLocation.lat - settings.location.lat) * (Math.PI / 180);
    const dLng = (userLocation.lng - settings.location.lng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(settings.location.lat * (Math.PI / 180)) * Math.cos(userLocation.lat * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    setDistance(dist);
    const baseCost = calculateDistanceCost(dist);
    const extra = region.extraFee || 0;
    setShippingPrice(baseCost + extra);

  }, [userLocation, selectedRegionId, settings, deliveryMethod]);

  // --- BUSCA CEP E ATUALIZA MAPA (VERSÃO CORRIGIDA) ---
  const handleBuscaCep = async () => {
    const cep = cepInput.replace(/\D/g, '');
    if (cep.length !== 8) return alert("CEP inválido.");
    setCepLoading(true);

    try {
        // 1. Busca os dados de texto no ViaCEP
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (data.erro) { alert("CEP não encontrado."); setCepLoading(false); return; }

        // Atualiza os campos de texto
        setAddress(prev => ({ 
            ...prev, 
            street: data.logradouro, 
            district: data.bairro, 
            city: data.localidade, 
            number: "" 
        }));

        // 2. Geocoding TURBINADO para o Google Maps
        if (window.google && window.google.maps) {
            const geocoder = new window.google.maps.Geocoder();
            
            // TRUQUE: Mandar o CEP e o Bairro explicitamente ajuda o Google a não se perder
            // Ex: "77064-000, Taquaralto, Palmas, TO, Brasil"
            const searchString = `${cep}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`;
            
            geocoder.geocode({ 
                address: searchString,
                componentRestrictions: { country: 'BR' } // Restringe ao Brasil para evitar erros
            }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const loc = results[0].geometry.location;
                    const newPos = { lat: loc.lat(), lng: loc.lng() };
                    
                    setUserLocation(newPos);
                    mapRef.current?.panTo(newPos);
                    mapRef.current?.setZoom(17); // Zoom bem próximo para a pessoa conferir
                } else {
                    console.warn("Google não achou o local exato, tentando apenas pelo nome da rua...");
                    // Se falhar pelo CEP, tenta uma busca mais genérica
                    geocoder.geocode({ address: `${data.logradouro}, ${data.localidade}, Brasil` }, (res2, stat2) => {
                        if (stat2 === 'OK' && res2 && res2[0]) {
                            const loc2 = res2[0].geometry.location;
                            setUserLocation({ lat: loc2.lat(), lng: loc2.lng() });
                            mapRef.current?.panTo(loc2);
                        }
                    });
                }
            });
        }
        document.getElementById("num-input")?.focus();
    } catch (e) { 
        alert("Erro ao buscar."); 
    } finally { 
        setCepLoading(false); 
    }
  };

  const getMyGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(newPos);
        mapRef.current?.panTo(newPos);
        mapRef.current?.setZoom(17);
    });
  };

  const finalTotal = cartTotal + (deliveryMethod === 'delivery' ? shippingPrice : 0) + (paymentMethod === 'money' && changeFor ? 2 : 0);

  const handleCheckout = async () => {
    if (!user) { loginGoogle(); return; }
    if (deliveryMethod === 'delivery' && !address.number) return alert("Por favor, digite o número da casa.");

    setIsSending(true);
    const phoneNumber = settings?.phone || "5563999999999"; 
    
    // Monta Mensagem WhatsApp (igual anterior, mas agora com link do maps opcional)
    let msg = `*NOVO PEDIDO - ${profile?.name || user.displayName}*\n--------------------------------\n`;
    items.forEach(i => msg += `${i.quantity}x ${i.name}\n`);
    msg += `--------------------------------\nSubtotal: R$ ${cartTotal.toFixed(2)}\n`;
    
    if (deliveryMethod === 'delivery') {
        const reg = REGIONS.find(r => r.id === selectedRegionId);
        msg += `\n*📦 Entrega (${reg?.label})*\n`;
        if (distance) msg += `Distância: ${distance.toFixed(1)}km\n`;
        msg += `Frete: R$ ${shippingPrice.toFixed(2)}\n`;
        msg += `Endereço: ${address.street}, ${address.number} - ${address.district}\n`;
        msg += `📍 Maps: https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`;
    } else {
        msg += `\n*📦 Retirada na Loja*`;
    }
    
    msg += `\n\n*TOTAL: R$ ${finalTotal.toFixed(2)}*`;
    if (paymentMethod === 'money' && changeFor) msg += `\n(Troco para R$ ${changeFor} + Taxa R$ 2)`;

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setIsSending(false);
    clearCart();
  };

  if (items.length === 0) return <div className="text-center py-20"><ShoppingBag className="mx-auto text-gray-300 mb-4" size={48}/><p>Sacola vazia</p><Link href="/" className="mt-4 inline-block bg-pink-600 text-white px-6 py-2 rounded">Voltar</Link></div>;

  return (
    <div className="pb-40 pt-6 px-4 max-w-2xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex items-center gap-4 mb-6"><Link href="/"><ArrowLeft/></Link><h1 className="text-2xl font-bold">Checkout</h1></div>

      <div className="space-y-6">
          {/* ITENS */}
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
            <h2 className="font-bold text-sm uppercase flex gap-2"><ShoppingBag size={16} className="text-pink-600"/> Pedido</h2>
            {items.map(item => (
                <div key={item.cartId} className="flex gap-4 border-b last:border-0 pb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover"/> : <ImageOff size={20} className="m-auto text-gray-400"/>}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between font-bold text-sm"><span>{item.quantity}x {item.name}</span><span>R$ {item.finalPrice.toFixed(2)}</span></div>
                        <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 text-xs mt-2 flex items-center gap-1"><Trash2 size={12}/> Remover</button>
                    </div>
                </div>
            ))}
          </div>

          {/* ENTREGA */}
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
            <h2 className="font-bold text-sm uppercase flex gap-2"><MapPin size={16} className="text-pink-600"/> Entrega</h2>
            <div className="flex gap-3">
                <button onClick={() => setDeliveryMethod('delivery')} className={`flex-1 py-3 rounded border font-bold text-sm ${deliveryMethod === 'delivery' ? 'bg-pink-50 border-pink-600 text-pink-700' : ''}`}>🛵 Entrega</button>
                <button onClick={() => setDeliveryMethod('pickup')} className={`flex-1 py-3 rounded border font-bold text-sm ${deliveryMethod === 'pickup' ? 'bg-pink-50 border-pink-600 text-pink-700' : ''}`}>🏪 Retirar</button>
            </div>

            {deliveryMethod === 'delivery' && (
                <div className="space-y-4 animate-in fade-in">
                    <label className="text-xs font-bold text-gray-500 uppercase">Região</label>
                    <select className="w-full p-3 border rounded bg-white" value={selectedRegionId} onChange={e => setSelectedRegionId(e.target.value)}>
                        {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>

                    {/* BUSCA DE CEP */}
                    <div className="flex gap-2">
                        <input className="p-3 border rounded w-full" placeholder="CEP (Busca Automática)" value={cepInput} onChange={e => setCepInput(e.target.value)} maxLength={9}/>
                        <button onClick={handleBuscaCep} disabled={cepLoading} className="bg-slate-800 text-white px-4 rounded hover:bg-slate-700">
                            {cepLoading ? <Loader2 className="animate-spin"/> : <Search/>}
                        </button>
                        <button onClick={getMyGPS} className="bg-blue-100 text-blue-700 p-3 rounded"><LocateFixed/></button>
                    </div>

                    {/* MAPA */}
                    <div className="border rounded-xl overflow-hidden h-[300px] relative bg-gray-100">
                        {isLoaded && (
                            <GoogleMap 
                                mapContainerStyle={mapContainerStyle} 
                                center={userLocation} 
                                zoom={15} 
                                onLoad={map => { mapRef.current = map; }}
                                options={{streetViewControl:false, mapTypeControl:false}}
                            >
                                <Marker 
                                    position={userLocation} 
                                    draggable={true} 
                                    onDragEnd={(e) => { if(e.latLng) setUserLocation({lat: e.latLng.lat(), lng: e.latLng.lng()}) }}
                                />
                            </GoogleMap>
                        )}
                        {!isLoaded && <div className="flex h-full items-center justify-center text-gray-400">Carregando Mapa...</div>}
                    </div>
                    <p className="text-[10px] text-gray-500 text-center">Arraste o pino vermelho para o local exato da entrega.</p>

                    <div className="grid grid-cols-4 gap-3">
                        <input className="col-span-3 p-3 border rounded bg-gray-50" value={address.street} readOnly placeholder="Rua"/>
                        <input id="num-input" className="col-span-1 p-3 border-2 border-blue-100 focus:border-blue-500 rounded font-bold" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} placeholder="Nº"/>
                    </div>
                    <input className="w-full p-3 border rounded bg-gray-50" value={address.district} readOnly placeholder="Bairro"/>
                    <input className="w-full p-3 border rounded" value={address.complement} onChange={e => setAddress({...address, complement: e.target.value})} placeholder="Complemento (Apto, Bloco, etc)"/>
                </div>
            )}
          </div>

          {/* PAGAMENTO */}
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
             <h2 className="font-bold text-sm uppercase flex gap-2"><CreditCard size={16} className="text-pink-600"/> Pagamento</h2>
             <div className="grid grid-cols-3 gap-3">
                {[{id:'pix', l:'PIX'}, {id:'card', l:'Cartão'}, {id:'money', l:'Dinheiro'}].map(m => (
                    <button key={m.id} onClick={() => setPaymentMethod(m.id as any)} className={`py-3 rounded border text-sm ${paymentMethod === m.id ? 'bg-pink-50 border-pink-600 text-pink-700' : ''}`}>{m.l}</button>
                ))}
             </div>
             {paymentMethod === 'money' && (
                <div className="animate-in fade-in">
                    <label className="text-xs font-bold text-gray-500">Troco para quanto?</label>
                    <div className="flex items-center gap-2 mt-1"><span className="font-bold">R$</span><input type="number" className="w-full p-2 border-b text-lg font-bold outline-none" value={changeFor} onChange={e => setChangeFor(e.target.value)}/></div>
                    {changeFor && <div className="text-xs bg-yellow-50 text-yellow-700 p-2 rounded mt-2 flex gap-1"><Coins size={14}/> Taxa Troco: + R$ 2,00</div>}
                </div>
             )}
          </div>
      </div>

      {/* FOOTER TOTAL */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow z-40 safe-area-bottom">
        <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>R$ {cartTotal.toFixed(2)}</span></div>
            {deliveryMethod === 'delivery' && (
                <div className="flex justify-between text-sm text-blue-600">
                    <span>Frete {distance ? `(${distance.toFixed(1)}km)` : ''}</span>
                    <span>R$ {shippingPrice.toFixed(2)}</span>
                </div>
            )}
            <div className="flex justify-between pt-2 border-t font-extrabold text-xl text-green-600"><span>Total</span><span>R$ {finalTotal.toFixed(2)}</span></div>
            <button onClick={handleCheckout} disabled={isSending} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex justify-center gap-2 disabled:opacity-70">
                {isSending ? "Enviando..." : <><Send size={20}/> Finalizar Pedido</>}
            </button>
        </div>
      </div>
    </div>
  );
}