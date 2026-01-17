// src/app/(shop)/cart/page.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Trash2, ArrowLeft, Send, MapPin, Search, Loader2, ShoppingBag, CreditCard, FileText, CheckCircle, PlusCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const PHONE_NUMBER = "5563999999999"; 
const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 
const DEFAULT_CENTER = { lat: -10.183760, lng: -48.333650 }; 

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
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  
  // Estados para Mapa/Endereço Novo (Fallback)
  const [address, setAddress] = useState({ street: "", number: "", district: "", complement: "" });
  const [cepInput, setCepInput] = useState("");
  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER);
  const [shippingPrice, setShippingPrice] = useState(0);
  const [selectedRegionId, setSelectedRegionId] = useState('plano');

  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  // É Mensalista?
  const isMonthlyClient = profile?.clientType === 'monthly';

  // Carrega Endereços Salvos
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            const data = snap.data();
            if (data.savedAddresses && data.savedAddresses.length > 0) {
                setSavedAddresses(data.savedAddresses);
                setSelectedAddressId(data.savedAddresses[0].id);
            }
        }
    };
    fetchProfile();
  }, [user]);

  // Lógica de Frete e Pagamento
  useEffect(() => {
    // Se for Conta Aberta, frete é zero e força "Retirada" (no sentido de sem entrega imediata cobrada)
    if (paymentMethod === 'conta_aberta') {
        setShippingPrice(0);
        // Não forçamos deliveryMethod='pickup' visualmente para não confundir,
        // mas o preço fica zero.
    } else {
        if (deliveryMethod === 'pickup') {
            setShippingPrice(0);
        } else {
            // Lógica de Preço por Região (Exemplo simples fixo ou por região)
            const region = REGIONS.find(r => r.id === selectedRegionId);
            if (region && typeof region.price === 'number') {
                setShippingPrice(region.price);
            } else {
                setShippingPrice(8.00); // Base GPS
            }
        }
    }
  }, [deliveryMethod, selectedRegionId, paymentMethod]);

  const handleBuscaCep = async () => {
    // ... (Sua lógica de busca CEP existente) ...
    // Vou manter simplificado aqui, copie do seu original se precisar da busca manual completa
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
                    }
                });
            }
        }
    } catch (e) { alert("Erro CEP"); }
  };

  const handleCheckout = () => {
    if (!user) { loginGoogle(); return; }

    const finalTotal = cartTotal + shippingPrice;
    
    // Validação de Endereço (Apenas se for Entrega E não for conta aberta)
    // Se for conta aberta, assumimos que o cliente sabe o que faz (geralmente pega na empresa ou tem acordo)
    // Mas se quiser entrega na conta aberta, precisa selecionar endereço.
    const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId);
    
    if (deliveryMethod === 'delivery' && !selectedAddr && !address.number) {
        return alert("Por favor, selecione ou informe um endereço.");
    }

    let msg = `*NOVO PEDIDO - ${user.displayName}*\n`;
    if (paymentMethod === 'conta_aberta') msg += `⚠️ *PEDIDO NA CONTA (MENSALISTA)*\n`;
    msg += `--------------------------------\n`;
    items.forEach(i => msg += `${i.quantity}x ${i.name}\n`);
    msg += `--------------------------------\n`;
    
    // Dados de Entrega
    if (deliveryMethod === 'delivery') {
        const addr = selectedAddr || address;
        msg += `📦 *Entrega* (${shippingPrice > 0 ? `R$ ${shippingPrice.toFixed(2)}` : 'Grátis/Conta'})\n`;
        msg += `📍 ${addr.street || addr.nickname}, ${addr.number} - ${addr.district}\n`;
        if (addr.complement) msg += `Obs: ${addr.complement}\n`;
        
        // Link Maps (Prioriza salvo, senão usa o do input manual)
        const lat = selectedAddr?.location?.lat || userLocation.lat;
        const lng = selectedAddr?.location?.lng || userLocation.lng;
        msg += `🗺️ Maps: http://googleusercontent.com/maps.google.com/?q=${lat},${lng}\n`;
    } else {
        msg += `🏪 *Retirada no Balcão*\n`;
    }
    
    const payText = paymentMethod === 'conta_aberta' ? 'CONTA MENSAL' : paymentMethod.toUpperCase();
    msg += `💳 Pagamento: ${payText}\n\n*TOTAL: R$ ${finalTotal.toFixed(2)}*`;

    window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    clearCart();
  };

  if (items.length === 0) return <div className="p-10 text-center flex flex-col items-center justify-center min-h-[60vh]"><ShoppingBag className="text-gray-200 mb-4" size={64}/><p className="text-gray-500 font-medium">Seu carrinho está vazio.</p><Link href="/" className="text-pink-600 font-bold mt-4 hover:underline">Voltar ao Cardápio</Link></div>;

  return (
    <div className="pb-40 pt-2 px-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6"><Link href="/"><ArrowLeft/></Link><h1 className="font-bold text-lg">Seu Pedido</h1></div>

      <div className="space-y-3 mb-6">
        {items.map(item => (
            <div key={item.cartId} className="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm">
                <div><p className="font-bold text-sm text-gray-800">{item.quantity}x {item.name}</p><p className="text-xs text-green-600 font-bold">R$ {item.finalPrice.toFixed(2)}</p></div>
                <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 p-2 hover:bg-red-50 rounded-full transition"><Trash2 size={18}/></button>
            </div>
        ))}
      </div>

      {/* PAGAMENTO */}
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-4">
        <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><CreditCard size={16}/> Forma de Pagamento</h2>
        <div className="grid grid-cols-3 gap-2">
            {['pix', 'card', 'money'].map(p => (
                <button key={p} onClick={() => setPaymentMethod(p)} className={`py-2 border rounded text-xs font-bold capitalize ${paymentMethod === p ? 'bg-pink-50 border-pink-500 text-pink-700' : 'text-gray-600'}`}>
                    {p === 'card' ? 'Cartão' : p === 'money' ? 'Dinheiro' : 'PIX'}
                </button>
            ))}
            
            {/* OPÇÃO MENSALISTA */}
            {isMonthlyClient && (
                <button 
                    onClick={() => setPaymentMethod('conta_aberta')} 
                    className={`col-span-3 py-3 border-2 border-dashed rounded text-sm font-bold flex items-center justify-center gap-2 ${paymentMethod === 'conta_aberta' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-purple-200 text-purple-600'}`}
                >
                    <FileText size={16}/> Adicionar à Conta (Sem Pagamento Agora)
                </button>
            )}
        </div>
      </div>

      {/* ENTREGA */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4 mb-4">
        <h2 className="font-bold text-sm flex gap-2 items-center"><MapPin size={16} className="text-pink-600"/> Entrega</h2>
        
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setDeliveryMethod('delivery')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${deliveryMethod === 'delivery' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Entrega</button>
            <button onClick={() => setDeliveryMethod('pickup')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${deliveryMethod === 'pickup' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Retirar</button>
        </div>

        {deliveryMethod === 'delivery' && (
            <div className="space-y-3 animate-in fade-in">
                {/* 1. Lista de Endereços Salvos */}
                {savedAddresses.length > 0 && (
                    <div className="space-y-2 mb-4">
                        <p className="text-xs font-bold text-gray-500 uppercase">Selecione o Endereço:</p>
                        {savedAddresses.map(addr => (
                            <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center ${selectedAddressId === addr.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                                <div><p className="font-bold text-sm">{addr.nickname}</p><p className="text-xs text-gray-500 line-clamp-1">{addr.street}, {addr.number}</p></div>
                                {selectedAddressId === addr.id && <CheckCircle size={18} className="text-green-600"/>}
                            </div>
                        ))}
                        <Link href="/profile" className="block text-center text-xs text-pink-600 font-bold mt-2">+ Gerenciar Endereços</Link>
                    </div>
                )}

                {/* 2. Busca Manual (Se não tiver salvo ou quiser outro) */}
                {savedAddresses.length === 0 && (
                    <>
                        <div className="flex gap-2">
                            <input className="p-2 border rounded w-full text-sm" placeholder="CEP" value={cepInput} onChange={e => setCepInput(e.target.value)} maxLength={9}/>
                            <button onClick={handleBuscaCep} className="bg-slate-800 text-white px-3 rounded"><Search size={18}/></button>
                        </div>
                        <div className="h-[150px] bg-gray-100 rounded border relative">
                            {isLoaded && <GoogleMap mapContainerStyle={{width:'100%',height:'100%'}} center={userLocation} zoom={15} options={{disableDefaultUI:true}}><Marker position={userLocation}/></GoogleMap>}
                        </div>
                        <div className="flex gap-2"><input className="w-full p-2 border rounded text-sm bg-gray-50" value={address.street} readOnly/><input className="w-24 p-2 border-2 border-blue-100 font-bold rounded text-sm" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} placeholder="Nº"/></div>
                    </>
                )}
            </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg safe-area-bottom z-40">
        <div className="max-w-2xl mx-auto space-y-3">
             <div className="flex justify-between font-bold text-lg text-gray-800"><span>Total</span><span className="text-green-600">R$ {(cartTotal + shippingPrice).toFixed(2)}</span></div>
            <button onClick={handleCheckout} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg">
                <Send size={18}/> {paymentMethod === 'conta_aberta' ? 'Confirmar na Conta' : 'Enviar Pedido'}
            </button>
        </div>
      </div>
    </div>
  );
}