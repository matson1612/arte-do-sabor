// src/app/(shop)/cart/page.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Trash2, ArrowLeft, Send, MapPin, CreditCard, Search, Loader2, LocateFixed, ShoppingBag, Store } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

// --- CONFIGURAÇÕES ---
const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 
const PHONE_NUMBER = "5563999999999"; // Seu WhatsApp aqui
const DEFAULT_CENTER = { lat: -10.183760, lng: -48.333650 }; // Palmas

const mapContainerStyle = { width: '100%', height: '250px', borderRadius: '0.75rem' };

const REGIONS = [
    { id: 'plano', label: 'Plano Diretor / Centro (Calculado por KM)', price: 'gps' },
    { id: 'taquaralto', label: 'Taquaralto e Região (Fixo R$ 15)', price: 15.00 },
    { id: 'luzimangues', label: 'Luzimangues (Fixo R$ 25)', price: 25.00 },
];

export default function CartPage() {
  const { items, removeFromCart, cartTotal, clearCart } = useCart();
  const { user, loginGoogle, profile } = useAuth();
  
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [address, setAddress] = useState({ street: "", number: "", district: "", complement: "" });
  const [cepInput, setCepInput] = useState("");
  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER);
  const [shippingPrice, setShippingPrice] = useState(0);
  const [selectedRegionId, setSelectedRegionId] = useState('plano');

  const mapRef = useRef<google.maps.Map | null>(null);

  // Carrega Mapa
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  // Cálculo Simples de Distância (Frete GPS)
  useEffect(() => {
    if (selectedRegionId === 'plano') {
        // Lógica simples: R$ 5,00 base + R$ 1,50 por grau de distância (simulação)
        // Em produção usaria a Distance Matrix API
        setShippingPrice(8.00); 
    } else {
        const region = REGIONS.find(r => r.id === selectedRegionId);
        if (region && typeof region.price === 'number') setShippingPrice(region.price);
    }
  }, [selectedRegionId, userLocation]);

  // Busca CEP e Move Mapa
  const handleBuscaCep = async () => {
    const cep = cepInput.replace(/\D/g, '');
    if (cep.length !== 8) return alert("CEP inválido");

    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if(!data.erro) {
            setAddress(prev => ({ ...prev, street: data.logradouro, district: data.bairro }));
            
            if (window.google) {
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ address: cep }, (results, status) => {
                    if (status === 'OK' && results?.[0]) {
                        const loc = results[0].geometry.location;
                        const newPos = { lat: loc.lat(), lng: loc.lng() };
                        setUserLocation(newPos);
                        mapRef.current?.panTo(newPos);
                        mapRef.current?.setZoom(16);
                    }
                });
            }
        }
    } catch (e) { alert("Erro ao buscar CEP"); }
  };

  const handleCheckout = () => {
    if (!user) { loginGoogle(); return; }

    const finalTotal = cartTotal + (deliveryMethod === 'delivery' ? shippingPrice : 0);
    
    let msg = `*NOVO PEDIDO - ${user.displayName}*\n`;
    items.forEach(i => msg += `${i.quantity}x ${i.name}\n`);
    msg += `----------------\n`;
    
    if (deliveryMethod === 'delivery') {
        msg += `📦 Entrega: R$ ${shippingPrice.toFixed(2)}\n`;
        msg += `Endereço: ${address.street}, ${address.number} - ${address.district}\n`;
        msg += `📍 Maps: https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}\n`;
    } else {
        msg += `🏪 Retirada no Balcão\n`;
    }
    msg += `💳 Pagamento: ${paymentMethod.toUpperCase()}\n`;
    msg += `*TOTAL: R$ ${finalTotal.toFixed(2)}*`;

    window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    clearCart();
  };

  if (items.length === 0) return <div className="p-10 text-center"><ShoppingBag className="mx-auto text-gray-300 mb-4" size={48}/><p>Carrinho vazio</p><Link href="/" className="text-pink-600 font-bold mt-4 inline-block">Ver Cardápio</Link></div>;

  return (
    <div className="pb-40 pt-2 px-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6"><Link href="/"><ArrowLeft/></Link><h1 className="font-bold text-lg">Seu Pedido</h1></div>

      {/* ITENS */}
      <div className="space-y-3 mb-6">
        {items.map(item => (
            <div key={item.cartId} className="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm">
                <div>
                    <p className="font-bold text-sm">{item.quantity}x {item.name}</p>
                    <p className="text-xs text-green-600 font-bold">R$ {item.finalPrice.toFixed(2)}</p>
                </div>
                <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 p-2"><Trash2 size={16}/></button>
            </div>
        ))}
      </div>

      {/* ENTREGA */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4 mb-4">
        <h2 className="font-bold text-sm flex gap-2"><MapPin size={16} className="text-pink-600"/> Entrega</h2>
        <div className="flex gap-2">
            <button onClick={() => setDeliveryMethod('delivery')} className={`flex-1 py-2 text-sm border rounded ${deliveryMethod === 'delivery' ? 'bg-pink-50 border-pink-500 text-pink-700' : ''}`}>Entrega</button>
            <button onClick={() => setDeliveryMethod('pickup')} className={`flex-1 py-2 text-sm border rounded ${deliveryMethod === 'pickup' ? 'bg-pink-50 border-pink-500 text-pink-700' : ''}`}>Retirar</button>
        </div>

        {deliveryMethod === 'delivery' && (
            <div className="space-y-3 animate-in fade-in">
                 <select className="w-full p-2 border rounded text-sm" value={selectedRegionId} onChange={e => setSelectedRegionId(e.target.value)}>
                    {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>

                <div className="flex gap-2">
                    <input className="p-2 border rounded w-full text-sm" placeholder="CEP" value={cepInput} onChange={e => setCepInput(e.target.value)}/>
                    <button onClick={handleBuscaCep} className="bg-slate-800 text-white px-3 rounded"><Search size={16}/></button>
                </div>

                <div className="h-[250px] bg-gray-100 rounded-lg overflow-hidden relative">
                    {isLoaded ? (
                        <GoogleMap mapContainerStyle={mapContainerStyle} center={userLocation} zoom={15} onLoad={map => { mapRef.current = map; }} options={{disableDefaultUI: true}}>
                            <Marker position={userLocation} draggable={true} onDragEnd={(e) => { if(e.latLng) setUserLocation({lat: e.latLng.lat(), lng: e.latLng.lng()}) }}/>
                        </GoogleMap>
                    ) : <div className="flex items-center justify-center h-full text-xs text-gray-400">Carregando Mapa...</div>}
                     <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none"><span className="bg-white/80 px-2 py-1 rounded text-[10px] shadow">Arraste o pino para o local exato</span></div>
                </div>

                <div className="flex gap-2">
                    <input className="w-full p-2 border rounded text-sm bg-gray-50" value={address.street} readOnly placeholder="Rua"/>
                    <input className="w-24 p-2 border rounded text-sm font-bold" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} placeholder="Nº"/>
                </div>
            </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg safe-area-bottom">
        <div className="max-w-2xl mx-auto space-y-3">
             <div className="flex justify-between font-bold text-lg text-green-600">
                <span>Total Final</span>
                <span>R$ {(cartTotal + (deliveryMethod === 'delivery' ? shippingPrice : 0)).toFixed(2)}</span>
            </div>
            <button onClick={handleCheckout} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700">
                <Send size={18}/> Enviar Pedido no WhatsApp
            </button>
        </div>
      </div>
    </div>
  );
}