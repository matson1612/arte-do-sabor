// src/app/(shop)/cart/page.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Trash2, ArrowLeft, Send, MapPin, Search, Loader2, ShoppingBag, CreditCard, FileText, CheckCircle, Plus, Minus, AlertTriangle, Phone, QrCode, Copy, X, Link as LinkIcon, Banknote, Save } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, serverTimestamp, runTransaction, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { generateShortId } from "@/utils/generateId"; 
import { Option, StoreSettings, UserAddress } from "@/types";
import { QRCodeSVG } from "qrcode.react"; 
import { generatePixCopyPaste } from "@/utils/pix";

const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 
const DEFAULT_CENTER = { lat: -10.183760, lng: -48.333650 }; 

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const { user, loginGoogle, profile } = useAuth();
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  
  // Dados
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Carrinho
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [shippingPrice, setShippingPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);
  const [missingPhone, setMissingPhone] = useState("");

  // Modal Novo Endereço
  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const [newAddr, setNewAddr] = useState<Partial<UserAddress>>({
      regionType: 'plano_diretor',
      street: "", number: "", district: "", complement: "", nickname: "Casa", cep: ""
  });
  const [addrMapLoc, setAddrMapLoc] = useState(DEFAULT_CENTER);

  // PIX
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [pixCopied, setPixCopied] = useState(false);

  useEffect(() => {
      getDoc(doc(db, "store_settings", "config")).then(snap => {
          if (snap.exists()) setStoreSettings(snap.data() as StoreSettings);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
        if (snap.exists() && snap.data().savedAddresses) {
            setSavedAddresses(snap.data().savedAddresses);
            if(snap.data().savedAddresses.length > 0) setSelectedAddressId(snap.data().savedAddresses[0].id);
        }
    });
  }, [user]);

  // CÁLCULO DE FRETE INTELIGENTE
  useEffect(() => {
    if (deliveryMethod === 'pickup') { setShippingPrice(0); return; }
    if (!storeSettings || !selectedAddressId) return;

    const addr = savedAddresses.find(a => a.id === selectedAddressId);
    if (!addr) return;

    let price = 0;

    // Caso 1: Plano Diretor (Distância)
    if (addr.regionType === 'plano_diretor' && addr.location && storeSettings.location && window.google) {
        const from = new window.google.maps.LatLng(storeSettings.location.lat, storeSettings.location.lng);
        const to = new window.google.maps.LatLng(addr.location.lat, addr.location.lng);
        const distKm = window.google.maps.geometry.spherical.computeDistanceBetween(from, to) / 1000;

        // Busca na tabela de distâncias
        const rule = storeSettings.shipping.distanceTable.find(r => distKm >= r.minKm && distKm <= r.maxKm);
        if (rule) price = rule.price;
        else {
            // Se exceder a tabela, pega o último valor
            const maxRule = storeSettings.shipping.distanceTable[storeSettings.shipping.distanceTable.length - 1];
            price = maxRule ? maxRule.price : 0;
        }
    } 
    // Caso 2: Outras Localidades (Fixo ou Misto)
    else if (addr.regionType === 'outras_localidades' && addr.sectorName) {
        const area = storeSettings.shipping.fixedAreas.find(a => a.name === addr.sectorName);
        if (area) {
            if (area.type === 'fixed') {
                price = area.price;
            } else if (area.type === 'km_plus_tax' && addr.location && storeSettings.location && window.google) {
                // Km + Taxa
                const from = new window.google.maps.LatLng(storeSettings.location.lat, storeSettings.location.lng);
                const to = new window.google.maps.LatLng(addr.location.lat, addr.location.lng);
                const distKm = window.google.maps.geometry.spherical.computeDistanceBetween(from, to) / 1000;
                
                // Ex: R$ 2,00 por Km (base) + Taxa fixa
                const baseKmPrice = 2; // Poderia vir do settings também
                price = (distKm * baseKmPrice) + (area.tax || 0);
            }
        }
    }
    setShippingPrice(price);
  }, [deliveryMethod, selectedAddressId, storeSettings, savedAddresses]);

  const handleSaveAddress = async () => {
      if(!newAddr.street || !newAddr.number) return alert("Preencha o endereço completo.");
      if(!user) return;

      const addressData: UserAddress = {
          id: crypto.randomUUID(),
          ...newAddr as UserAddress,
          location: addrMapLoc
      };

      const updatedList = [...savedAddresses, addressData];
      await updateDoc(doc(db, "users", user.uid), { savedAddresses: updatedList });
      setSavedAddresses(updatedList);
      setSelectedAddressId(addressData.id);
      setIsAddrModalOpen(false);
  };

  const handleBuscaCep = async () => {
      if(!newAddr.cep || newAddr.cep.length < 8) return alert("CEP Inválido");
      try {
          const res = await fetch(`https://viacep.com.br/ws/${newAddr.cep.replace(/\D/g,'')}/json/`);
          const data = await res.json();
          if(!data.erro) {
              setNewAddr(prev => ({...prev, street: data.logradouro, district: data.bairro}));
              if(window.google) {
                  const geocoder = new window.google.maps.Geocoder();
                  geocoder.geocode({ address: newAddr.cep }, (results, status) => {
                      if(status === 'OK' && results?.[0]) {
                          const loc = results[0].geometry.location;
                          setAddrMapLoc({ lat: loc.lat(), lng: loc.lng() });
                      }
                  });
              }
          }
      } catch(e) { alert("Erro CEP"); }
  };

  const handleOpenPix = () => {
      const total = cartTotal + shippingPrice;
      const code = generatePixCopyPaste(total, storeSettings?.pix);
      setPixCode(code); setPixCopied(false); setShowPixModal(true);
  };

  const handleCopyPix = () => { navigator.clipboard.writeText(pixCode); setPixCopied(true); setTimeout(() => setPixCopied(false), 2000); };

  const handleCheckout = async () => {
      // (Lógica de transação igual à original para manter segurança de estoque)
      // ...
      // Na construção da mensagem do WhatsApp:
      const finalTotal = cartTotal + shippingPrice;
      let msg = `*NOVO PEDIDO* - ${profile?.name || user?.displayName}\n`;
      // ... itens ...
      if(deliveryMethod === 'delivery') {
          const addr = savedAddresses.find(a => a.id === selectedAddressId);
          msg += `📦 *Entrega (${addr?.regionType === 'plano_diretor' ? 'Plano Diretor' : addr?.sectorName})*\n`;
          msg += `📍 ${addr?.street}, ${addr?.number} - ${addr?.district}\n`;
          if(addr?.complement) msg += `Obs: ${addr.complement}\n`;
          if(addr?.location) msg += `🗺️ Maps: https://www.google.com/maps/search/?api=1&query=${addr.location.lat},${addr.location.lng}\n`;
      }
      msg += `\n💰 Produtos: R$ ${cartTotal.toFixed(2)}\n🚚 Frete: R$ ${shippingPrice.toFixed(2)}\n*TOTAL: R$ ${finalTotal.toFixed(2)}*\n\n💳 Pagamento: ${paymentMethod}`;
      
      const phone = storeSettings?.whatsapp || "5563981221181";
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
      
      if(paymentMethod === 'pix') { if(confirm("Abrir PIX?")) handleOpenPix(); else clearCart(); }
      else clearCart();
  };

  if (items.length === 0) return <div className="p-10 text-center"><ShoppingBag className="mx-auto mb-4 text-gray-300" size={64}/><p>Carrinho vazio.</p><Link href="/" className="text-pink-600 font-bold">Voltar</Link></div>;

  return (
    <div className="pb-40 pt-4 px-4 max-w-2xl mx-auto">
        <h1 className="font-bold text-xl mb-6">Finalizar Pedido</h1>

        {/* Entrega */}
        <div className="bg-white p-4 rounded-xl shadow-sm border mb-4">
            <h2 className="font-bold text-sm mb-3 flex gap-2"><MapPin size={16}/> Entrega</h2>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg mb-4">
                <button onClick={() => setDeliveryMethod('delivery')} className={`flex-1 py-2 text-sm font-bold rounded-md ${deliveryMethod === 'delivery' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>Entrega</button>
                <button onClick={() => setDeliveryMethod('pickup')} className={`flex-1 py-2 text-sm font-bold rounded-md ${deliveryMethod === 'pickup' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>Retirar</button>
            </div>

            {deliveryMethod === 'delivery' && (
                <div>
                    {savedAddresses.map(addr => (
                        <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} className={`p-3 border rounded-xl mb-2 cursor-pointer flex justify-between items-center ${selectedAddressId === addr.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                            <div>
                                <span className="text-xs font-bold bg-white border px-2 py-0.5 rounded text-gray-500 uppercase">{addr.nickname}</span>
                                <p className="font-bold text-sm mt-1">{addr.street}, {addr.number}</p>
                                <p className="text-xs text-gray-500">{addr.district} ({addr.regionType === 'plano_diretor' ? 'Plano Diretor' : addr.sectorName})</p>
                            </div>
                            {selectedAddressId === addr.id && <CheckCircle size={18} className="text-pink-600"/>}
                        </div>
                    ))}
                    <button onClick={() => setIsAddrModalOpen(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50">+ Novo Endereço</button>
                </div>
            )}
        </div>

        {/* Itens e Pagamento (Igual ao anterior) */}
        {/* ... (Renderização dos itens e botões de pagamento usando storeSettings) ... */}
        
        {/* MODAL NOVO ENDEREÇO ATUALIZADO */}
        {isAddrModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-md rounded-2xl p-6 h-[85vh] sm:h-auto overflow-y-auto animate-in slide-in-from-bottom">
                    <h2 className="font-bold text-lg mb-4">Novo Endereço</h2>
                    <div className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Salvar como</label><input className="w-full p-2 border rounded" placeholder="Ex: Casa, Trabalho" value={newAddr.nickname} onChange={e => setNewAddr({...newAddr, nickname: e.target.value})} /></div>

                        {/* SELETOR DE REGIÃO */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setNewAddr({...newAddr, regionType: 'plano_diretor', sectorName: undefined})} className={`flex-1 py-2 text-xs font-bold rounded ${newAddr.regionType === 'plano_diretor' ? 'bg-white shadow text-slate-800' : 'text-gray-500'}`}>Plano Diretor</button>
                            <button onClick={() => setNewAddr({...newAddr, regionType: 'outras_localidades'})} className={`flex-1 py-2 text-xs font-bold rounded ${newAddr.regionType === 'outras_localidades' ? 'bg-white shadow text-slate-800' : 'text-gray-500'}`}>Outras Regiões</button>
                        </div>

                        {newAddr.regionType === 'plano_diretor' ? (
                            <div className="flex gap-2"><input className="w-full p-2 border rounded" placeholder="CEP (Busca Auto)" value={newAddr.cep} onChange={e => setNewAddr({...newAddr, cep: e.target.value})} maxLength={9}/><button onClick={handleBuscaCep} className="bg-slate-800 text-white px-3 rounded"><Search size={18}/></button></div>
                        ) : (
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Selecione o Setor</label>
                                <select className="w-full p-2 border rounded bg-white" value={newAddr.sectorName || ''} onChange={e => setNewAddr({...newAddr, sectorName: e.target.value})}>
                                    <option value="">-- Selecione --</option>
                                    {storeSettings?.shipping.fixedAreas.map(area => (
                                        <option key={area.id} value={area.name}>{area.name} (+R$ {area.price})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div><input className="w-full p-2 border rounded bg-gray-50" placeholder="Rua / Quadra" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})} /></div>
                        <div className="flex gap-2"><input className="w-24 p-2 border rounded" placeholder="Nº" value={newAddr.number} onChange={e => setNewAddr({...newAddr, number: e.target.value})} /><input className="flex-1 p-2 border rounded" placeholder="Complemento" value={newAddr.complement} onChange={e => setNewAddr({...newAddr, complement: e.target.value})} /></div>

                        <div className="h-40 rounded-lg overflow-hidden border relative bg-gray-100">
                            {isLoaded && <GoogleMap mapContainerStyle={{width:'100%',height:'100%'}} center={addrMapLoc} zoom={16}><Marker position={addrMapLoc} draggable onDragEnd={(e) => e.latLng && setAddrMapLoc({lat: e.latLng.lat(), lng: e.latLng.lng()})}/></GoogleMap>}
                            <div className="absolute bottom-1 left-0 w-full text-center"><span className="bg-white/80 text-[10px] px-2 rounded shadow">Confirme a localização no mapa</span></div>
                        </div>

                        <div className="flex gap-2 pt-2"><button onClick={() => setIsAddrModalOpen(false)} className="flex-1 py-3 border rounded-xl font-bold">Cancelar</button><button onClick={handleSaveAddress} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">Salvar Endereço</button></div>
                    </div>
                </div>
            </div>
        )}
        
        {/* Modal PIX e Footer (Mantidos) */}
    </div>
  );
}