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
            if (!item.id) continue;
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

  // 4. CÁLCULO DE FRETE (ROTA DE CARRO + ISENÇÃO MENSALISTA)
  useEffect(() => {
    // CORREÇÃO: Se for Retirada OU Conta Mensal, zera o frete
    if (deliveryMethod === 'pickup' || paymentMethod === 'conta_aberta') { 
        setShippingPrice(0); 
        setShippingDetails(paymentMethod === 'conta_aberta' ? "Isento (Mensalista)" : ""); 
        return; 
    }
    
    if (!storeSettings || !selectedAddressId || !isLoaded || !window.google) return;

    const addr = savedAddresses.find(a => a.id === selectedAddressId);
    if (!addr) return;

    // Função interna para aplicar preço baseada na KM encontrada
    const applyDistancePricing = (distKm: number) => {
        let finalPrice = 0;
        const rule = storeSettings.shipping.distanceTable.find(r => distKm >= r.minKm && distKm <= r.maxKm);
        
        if (rule) {
            finalPrice = rule.price;
        } else {
            // Se passar da tabela, pega a última faixa
            const maxRule = storeSettings.shipping.distanceTable[storeSettings.shipping.distanceTable.length - 1];
            finalPrice = maxRule ? maxRule.price : 0;
        }

        // Frete Grátis
        if(storeSettings.shipping.freeShippingAbove && storeSettings.shipping.freeShippingAbove > 0 && cartTotal >= storeSettings.shipping.freeShippingAbove) {
            finalPrice = 0;
            setShippingDetails("Frete Grátis");
        } else {
            setShippingDetails(`${distKm.toFixed(1)} km (Rota)`);
        }
        setShippingPrice(finalPrice);
    };

    // --- LÓGICA 1: PLANO DIRETOR (USAR DISTANCE MATRIX) ---
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
                console.error("❌ Erro Google Matrix:", status);
                if (window.google?.maps?.geometry) {
                    const from = new window.google.maps.LatLng(storeSettings.location.lat, storeSettings.location.lng);
                    const to = new window.google.maps.LatLng(addr.location.lat, addr.location.lng);
                    const linearKm = window.google.maps.geometry.spherical.computeDistanceBetween(from, to) / 1000;
                    applyDistancePricing(linearKm); 
                    setShippingDetails(`${linearKm.toFixed(1)} km (Linear - Verifique API)`);
                }
            }
        });
    } 
    // --- LÓGICA 2: OUTRAS LOCALIDADES ---
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
  }, [deliveryMethod, paymentMethod, selectedAddressId, storeSettings, savedAddresses, cartTotal, isLoaded]);

  // --- Funções Auxiliares ---

  const handleOpenEditAddress = (addr: UserAddress) => {
      setEditingAddrId(addr.id);
      setNewAddr({ ...addr });
      if(addr.location) setAddrMapLoc(addr.location);
      setIsAddrModalOpen(true);
  };

  const handleNewAddress = () => {
      setEditingAddrId(null);
      setNewAddr({ regionType: 'plano_diretor', street: "", number: "", district: "", complement: "", nickname: "Casa", cep: "" });
      setAddrMapLoc(DEFAULT_CENTER);
      setIsAddrModalOpen(true);
  };

  const handleSaveAddress = async () => {
      if(!newAddr.street || !newAddr.number) return alert("Preencha rua e número");
      if(!user) return;

      let updatedList = [...savedAddresses];
      const addressData: UserAddress = {
          id: editingAddrId || crypto.randomUUID(),
          ...newAddr as UserAddress,
          location: addrMapLoc
      };

      if (editingAddrId) {
          updatedList = updatedList.map(a => a.id === editingAddrId ? addressData : a);
      } else {
          updatedList.push(addressData);
          setSelectedAddressId(addressData.id);
      }

      await updateDoc(doc(db, "users", user.uid), { savedAddresses: updatedList });
      setSavedAddresses(updatedList);
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

        await runTransaction(db, async (transaction) => {
            const productDecrements = new Map<string, number>();
            const groupOptionDecrements = new Map<string, Map<string, number>>();
            const addProdDec = (id: string, qty: number) => { const current = productDecrements.get(id) || 0; productDecrements.set(id, current + qty); };

            for (const item of items) {
                if (item.id) addProdDec(item.id, item.quantity);
                if (item.selectedOptions) {
                    for (const [groupId, opts] of Object.entries(item.selectedOptions)) {
                        for (const opt of (opts as Option[])) {
                            if (opt.linkedProductId) addProdDec(opt.linkedProductId, item.quantity);
                            else {
                                if (!groupOptionDecrements.has(groupId)) groupOptionDecrements.set(groupId, new Map());
                                const grpMap = groupOptionDecrements.get(groupId)!;
                                grpMap.set(opt.id, (grpMap.get(opt.id) || 0) + item.quantity);
                            }
                        }
                    }
                }
            }

            const productSnaps = new Map();
            for (const prodId of productDecrements.keys()) { const ref = doc(db, "products", prodId); productSnaps.set(prodId, await transaction.get(ref)); }
            
            for (const [prodId, qty] of productDecrements.entries()) {
                const snap = productSnaps.get(prodId);
                if (!snap.exists()) throw new Error("Produto não encontrado.");
                const current = snap.data().stock;
                if (current !== null) {
                    if (current < qty) throw new Error(`Estoque insuficiente: ${snap.data().name}`);
                    transaction.update(doc(db, "products", prodId), { stock: current - qty });
                }
            }

            // CORREÇÃO: Garante que o campo address não seja undefined
            // Se for conta_aberta ou retirada, o endereço é null.
            // Se for delivery padrão, tenta pegar selectedAddr, se não tiver, vai null (e não undefined)
            const finalAddress = (paymentMethod === 'conta_aberta' || deliveryMethod === 'pickup') 
                ? null 
                : (selectedAddr || null);

            const newOrderRef = doc(collection(db, "orders"));
            transaction.set(newOrderRef, {
                shortId: shortId, userId: user.uid, userName: profile?.name || user.displayName, userPhone: finalPhone,
                items: JSON.stringify(items), total: finalTotal, status: 'em_aberto', paymentMethod: paymentMethod,
                deliveryMethod: deliveryMethod, createdAt: serverTimestamp(), shippingPrice: shippingPrice,
                address: finalAddress, // <--- Aqui estava o erro (agora corrigido)
                isPaid: false 
            });
        });

        const payConfig = storeSettings?.paymentMethods[paymentMethod as keyof typeof storeSettings.paymentMethods];
        const payText = payConfig ? payConfig.label : paymentMethod.toUpperCase();

        let msg = `*PEDIDO #${shortId}* - ${profile?.name || user.displayName}\n`;
        if (paymentMethod === 'conta_aberta') msg += `⚠️ *PEDIDO NA CONTA*\n`;
        msg += `--------------------------------\n`;
        items.forEach(i => msg += `${i.quantity}x ${i.name}\n`);
        
        if (deliveryMethod === 'delivery' && paymentMethod !== 'conta_aberta') {
            const addr = savedAddresses.find(a => a.id === selectedAddressId);
            msg += `📦 *Entrega (${addr?.regionType === 'plano_diretor' ? 'Plano Diretor' : addr?.sectorName})*\n`;
            msg += `📍 ${addr?.street}, ${addr?.number} - ${addr?.district}\n`;
            if(addr?.complement) msg += `Obs: ${addr.complement}\n`;
            if(addr?.location) msg += `🗺️ Maps: http://googleusercontent.com/maps.google.com/?q=${addr.location.lat},${addr.location.lng}\n`;
        } else if (paymentMethod === 'conta_aberta') {
            msg += `📄 *Pagamento Mensalista (Sem Entrega/Frete)*\n`;
        } else {
            msg += `🏪 *Retirada no Balcão*\n`;
        }
        
        msg += `💳 Pagamento: ${payText}\n📞: ${finalPhone}\n\n*TOTAL: R$ ${finalTotal.toFixed(2)}*`;

        const phone = storeSettings?.whatsapp || "5563981221181";
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
        
        if (paymentMethod === 'pix') { if(confirm("Abrir PIX?")) handleOpenPix(); else clearCart(); }
        else clearCart();

    } catch (error: any) { console.error(error); alert(error.message || "Erro ao processar pedido."); } finally { setIsSubmitting(false); }
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

      {/* Lista de Itens */}
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

      {/* Telefone Obrigatório */}
      {user && !profile?.phone && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-4 animate-in slide-in-from-left">
              <label className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-2"><Phone size={16}/> WhatsApp para Contato (Obrigatório)</label>
              <input className="w-full p-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="(00) 00000-0000" value={missingPhone} onChange={e => setMissingPhone(e.target.value)}/>
          </div>
      )}

      {/* Entrega e Endereço */}
      {paymentMethod !== 'conta_aberta' && (
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4 mb-4">
            <h2 className="font-bold text-sm flex gap-2 items-center"><MapPin size={16} className="text-pink-600"/> Entrega</h2>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setDeliveryMethod('delivery')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${deliveryMethod === 'delivery' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Entrega</button>
                <button onClick={() => setDeliveryMethod('pickup')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${deliveryMethod === 'pickup' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Retirar</button>
            </div>
            {deliveryMethod === 'delivery' && (
                <div className="space-y-3 animate-in fade-in">
                    {savedAddresses.length > 0 ? (
                        <div className="space-y-2 mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase">Selecione:</p>
                            {savedAddresses.map(addr => (
                                <div key={addr.id} className={`p-3 border rounded-xl cursor-pointer flex justify-between items-center ${selectedAddressId === addr.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                                    <div onClick={() => setSelectedAddressId(addr.id)} className="flex-1">
                                        <span className="text-xs font-bold bg-white border px-2 py-0.5 rounded text-gray-500 uppercase">{addr.nickname}</span>
                                        <p className="font-bold text-sm mt-1">{addr.street}, {addr.number}</p>
                                        <p className="text-xs text-gray-500">{addr.district} ({addr.regionType === 'plano_diretor' ? 'Plano Diretor' : addr.sectorName})</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedAddressId === addr.id && <CheckCircle size={18} className="text-pink-600"/>}
                                        <button onClick={() => handleOpenEditAddress(addr)} className="text-gray-400 hover:text-blue-500 p-1"><Pencil size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    <button onClick={handleNewAddress} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50">+ Novo Endereço</button>
                </div>
            )}
          </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border mb-24">
        <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><CreditCard size={16}/> Forma de Pagamento</h2>
        
        <div className="grid grid-cols-2 gap-2">
            {storeSettings?.paymentMethods.pix.active && (<button onClick={() => setPaymentMethod('pix')} className={`py-3 px-2 border rounded-lg text-xs font-bold ${paymentMethod === 'pix' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' : 'bg-white text-gray-600 border-gray-200'}`}><QrCode size={18}/> PIX</button>)}
            {storeSettings?.paymentMethods.money.active && (<button onClick={() => setPaymentMethod('money')} className={`py-3 px-2 border rounded-lg text-xs font-bold ${paymentMethod === 'money' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white text-gray-600 border-gray-200'}`}><Banknote size={18}/> Dinheiro</button>)}
            {storeSettings?.paymentMethods.link_debit.active && (<button onClick={() => setPaymentMethod('link_debit')} className={`py-3 px-2 border rounded-lg text-xs font-bold ${paymentMethod === 'link_debit' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-gray-600 border-gray-200'}`}><LinkIcon size={18}/> Débito</button>)}
            {storeSettings?.paymentMethods.link_credit.active && (<button onClick={() => setPaymentMethod('link_credito')} className={`py-3 px-2 border rounded-lg text-xs font-bold ${paymentMethod === 'link_credito' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white text-gray-600 border-gray-200'}`}><LinkIcon size={18}/> Crédito</button>)}
        </div>

        {/* Conta Aberta (Mensalistas) */}
        {isMonthlyOrReseller && storeSettings?.paymentMethods.monthly.active && (
            <button onClick={() => setPaymentMethod('conta_aberta')} className={`w-full mt-2 py-3 border-2 border-dashed rounded-lg text-sm font-bold ${paymentMethod === 'conta_aberta' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'border-purple-200 text-purple-600'}`}>
                <FileText size={18}/> Pagar na Conta / Boleta
            </button>
        )}

        {/* Botão Extra para Gerar PIX Agora */}
        {paymentMethod === 'pix' && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between">
                <div className="text-xs text-emerald-800"><p className="font-bold">Pagar com PIX</p><p>Gere o código agora.</p></div>
                <button onClick={handleOpenPix} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700">Gerar QR Code</button>
            </div>
        )}
      </div>

      {/* Footer Total */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg safe-area-bottom z-40">
        <div className="max-w-2xl mx-auto space-y-3">
             <div className="flex justify-between font-bold text-lg text-gray-800"><span>Total</span><span className="text-green-600">R$ {(cartTotal + shippingPrice).toFixed(2)}</span></div>
             <div className="flex justify-between text-xs text-gray-500"><span className="flex items-center gap-1">Frete: {deliveryMethod === 'pickup' ? 'Grátis' : `R$ ${shippingPrice.toFixed(2)}`} {shippingDetails && <span className="font-normal text-gray-400">({shippingDetails})</span>}</span></div>
            
            {/* Botão Final com Bloqueio de Loja */}
            <button 
                onClick={handleCheckout} 
                disabled={isSubmitting || isStoreClosed} 
                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg ${isStoreClosed ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
                {isSubmitting ? <Loader2 className="animate-spin"/> : isStoreClosed ? 'LOJA FECHADA' : <><Send size={18}/> {paymentMethod === 'conta_aberta' ? 'Confirmar na Conta' : 'Enviar Pedido'}</>}
            </button>
        </div>
      </div>

      {/* Modal Novo Endereço */}
      {isAddrModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-md rounded-2xl p-6 h-[85vh] sm:h-auto overflow-y-auto animate-in slide-in-from-bottom">
                    <h2 className="font-bold text-lg mb-4">{editingAddrId ? 'Editar Endereço' : 'Novo Endereço'}</h2>
                    <div className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Salvar como</label><input className="w-full p-2 border rounded" placeholder="Ex: Casa, Trabalho" value={newAddr.nickname} onChange={e => setNewAddr({...newAddr, nickname: e.target.value})} /></div>

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
                            {isLoaded && <GoogleMap mapContainerStyle={{width:'100%',height:'100%'}} center={addrMapLoc} zoom={16} onClick={(e) => e.latLng && setAddrMapLoc({lat: e.latLng.lat(), lng: e.latLng.lng()})}><Marker position={addrMapLoc} draggable onDragEnd={(e) => e.latLng && setAddrMapLoc({lat: e.latLng.lat(), lng: e.latLng.lng()})}/></GoogleMap>}
                            
                            {/* BOTÃO COPIAR LINK */}
                            <div className="absolute top-2 right-2"><button onClick={handleCopyPix} className="bg-white/90 p-2 rounded-lg shadow text-blue-600 hover:text-blue-800 border border-blue-100" title="Copiar Link do Mapa"><Copy size={16}/></button></div>
                            <div className="absolute bottom-1 left-0 w-full text-center"><span className="bg-white/80 text-[10px] px-2 rounded shadow">Confirme a localização no mapa</span></div>
                        </div>

                        <div className="flex gap-2 pt-2"><button onClick={() => setIsAddrModalOpen(false)} className="flex-1 py-3 border rounded-xl font-bold">Cancelar</button><button onClick={handleSaveAddress} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">Salvar Endereço</button></div>
                    </div>
                </div>
            </div>
        )}

      {/* Modal PIX */}
      {showPixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-300">
                  <button onClick={() => setShowPixModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-2 rounded-full hover:bg-stone-100"><X size={20}/></button>
                  <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3"><QrCode size={24}/></div>
                      <h3 className="text-xl font-bold text-stone-800">Pagamento PIX</h3>
                      <p className="text-sm text-stone-500">Valor Total: <strong className="text-emerald-600">R$ {(cartTotal + shippingPrice).toFixed(2)}</strong></p>
                  </div>
                  <div className="flex justify-center mb-6 p-4 bg-white border-2 border-stone-100 rounded-2xl shadow-inner">
                      <QRCodeSVG value={pixCode} size={200} />
                  </div>
                  <button onClick={handleCopyPix} className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${pixCopied ? 'bg-green-600 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>
                      {pixCopied ? <CheckCircle size={18}/> : <Copy size={18}/>}
                      {pixCopied ? "Código Copiado!" : "Copiar Código PIX"}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}