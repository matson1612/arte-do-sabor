// src/app/(shop)/cart/page.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Trash2, ArrowLeft, Send, MapPin, Search, Loader2, ShoppingBag, CreditCard, FileText, CheckCircle, Plus, Minus, AlertTriangle, Phone, QrCode, Copy, X, Link as LinkIcon, Banknote } from "lucide-react";
import { useState, useEffect } from "react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, runTransaction, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { generateShortId } from "@/utils/generateId"; 
import { Option } from "@/types";
import { QRCodeSVG } from "qrcode.react"; // Biblioteca de QR Code
import { generatePixCopyPaste } from "@/utils/pix"; // Utilitário de PIX

const PHONE_NUMBER = "5563981221181"; 
const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 
const DEFAULT_CENTER = { lat: -10.183760, lng: -48.333650 }; 

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const { user, loginGoogle, profile } = useAuth();
  
  // Estados de Pagamento e Entrega
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('pix'); // Padrão PIX
  
  // Endereço
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [address, setAddress] = useState({ street: "", number: "", district: "", complement: "" });
  const [cepInput, setCepInput] = useState("");
  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER);
  
  // Controle
  const [shippingPrice, setShippingPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);
  const [missingPhone, setMissingPhone] = useState("");

  // PIX Modal
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [pixCopied, setPixCopied] = useState(false);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const isMonthlyOrReseller = profile?.clientType === 'monthly' || profile?.clientType === 'reseller';

  useEffect(() => {
    // Validação de Estoque
    const validateCartStock = async () => {
        if (items.length === 0) return;
        const warnings: string[] = [];
        for (const item of items) {
            if (!item.id) continue;
            try {
                const prodSnap = await getDoc(doc(db, "products", item.id));
                if (prodSnap.exists()) {
                    const realStock = prodSnap.data().stock;
                    if (realStock !== null && realStock <= 0) {
                        warnings.push(`"${item.name}" esgotou.`);
                        removeFromCart(item.cartId);
                    } else if (realStock !== null && item.quantity > realStock) {
                        warnings.push(`"${item.name}": Qtd ajustada para ${realStock}.`);
                        updateQuantity(item.cartId, realStock);
                    }
                }
            } catch (e) { console.error(e); }
        }
        if (warnings.length > 0) setStockWarnings(warnings);
    };
    validateCartStock();
  }, []); 

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
        if (snap.exists() && snap.data().savedAddresses) {
            setSavedAddresses(snap.data().savedAddresses);
            setSelectedAddressId(snap.data().savedAddresses[0].id);
        }
    });
  }, [user]);

  useEffect(() => {
    if (paymentMethod === 'conta_aberta' || deliveryMethod === 'pickup') setShippingPrice(0);
    else setShippingPrice(8.00); // Frete Fixo Exemplo
  }, [deliveryMethod, paymentMethod]);

  // Gerar PIX ao abrir modal
  const handleOpenPix = () => {
      const total = cartTotal + shippingPrice;
      const code = generatePixCopyPaste(total);
      setPixCode(code);
      setPixCopied(false);
      setShowPixModal(true);
  };

  const handleCopyPix = () => {
      navigator.clipboard.writeText(pixCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
  };

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
                      if (status === 'OK' && results?.[0]) setUserLocation({ lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() });
                  });
              }
          }
      } catch (e) { alert("Erro CEP"); }
  };

  const handleCheckout = async () => {
    if (!user) { loginGoogle(); return; }
    if (isSubmitting) return;

    const finalPhone = profile?.phone || missingPhone;
    if (!finalPhone || finalPhone.length < 8) return alert("Informe um WhatsApp válido para contato.");

    const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId);
    if (deliveryMethod === 'delivery' && !selectedAddr && !address.number && paymentMethod !== 'conta_aberta') {
        return alert("Por favor, selecione ou informe um endereço.");
    }

    setIsSubmitting(true);
    const finalTotal = cartTotal + shippingPrice;
    const shortId = generateShortId(); 

    try {
        if (!profile?.phone && missingPhone) {
            await updateDoc(doc(db, "users", user.uid), { phone: missingPhone });
        }

        await runTransaction(db, async (transaction) => {
            // ... (Lógica de Estoque Mantida igual ao anterior) ...
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
            const groupSnaps = new Map();

            for (const prodId of productDecrements.keys()) { const ref = doc(db, "products", prodId); productSnaps.set(prodId, await transaction.get(ref)); }
            for (const groupId of groupOptionDecrements.keys()) { const ref = doc(db, "complement_groups", groupId); groupSnaps.set(groupId, await transaction.get(ref)); }

            for (const [prodId, qty] of productDecrements.entries()) {
                const snap = productSnaps.get(prodId);
                if (!snap.exists()) throw new Error("Produto não encontrado.");
                const current = snap.data().stock;
                if (current !== null) {
                    if (current < qty) throw new Error(`Estoque insuficiente: ${snap.data().name}`);
                    transaction.update(doc(db, "products", prodId), { stock: current - qty });
                }
            }

            for (const [groupId, opts] of groupOptionDecrements.entries()) {
                const snap = groupSnaps.get(groupId);
                const list = snap.data().options || [];
                let chg = false;
                for (const [optId, qty] of opts.entries()) {
                    const idx = list.findIndex((o:any) => o.id === optId);
                    if (idx !== -1 && list[idx].stock !== null) {
                        if (list[idx].stock < qty) throw new Error(`Sem estoque: ${list[idx].name}`);
                        list[idx].stock -= qty;
                        chg = true;
                    }
                }
                if (chg) transaction.update(doc(db, "complement_groups", groupId), { options: list });
            }

            const newOrderRef = doc(collection(db, "orders"));
            transaction.set(newOrderRef, {
                shortId: shortId,
                userId: user.uid,
                userName: profile?.name || user.displayName,
                userPhone: finalPhone,
                items: JSON.stringify(items),
                total: finalTotal,
                status: 'em_aberto',
                paymentMethod: paymentMethod,
                deliveryMethod: deliveryMethod,
                createdAt: serverTimestamp(),
                shippingPrice: shippingPrice,
                address: deliveryMethod === 'delivery' ? (selectedAddr || address) : null,
                isPaid: false 
            });
        });

        // Formatação da Mensagem
        let payText = "Outros";
        if (paymentMethod === 'pix') payText = "PIX";
        if (paymentMethod === 'link_debito') payText = "Link Débito (Enviar Link)";
        if (paymentMethod === 'link_credito') payText = "Link Crédito (Enviar Link)";
        if (paymentMethod === 'money') payText = "Dinheiro";
        if (paymentMethod === 'conta_aberta') payText = "Conta Mensal";

        let msg = `*PEDIDO #${shortId}* - ${profile?.name || user.displayName}\n`;
        if (paymentMethod === 'conta_aberta') msg += `⚠️ *PEDIDO NA CONTA*\n`;
        msg += `--------------------------------\n`;
        items.forEach(i => msg += `${i.quantity}x ${i.name}\n`);
        
        if (deliveryMethod === 'delivery') msg += `📦 *Entrega*\n`;
        else msg += `🏪 *Retirada*\n`;
        
        msg += `💳 Pagamento: ${payText}\n📞: ${finalPhone}\n\n*TOTAL: R$ ${finalTotal.toFixed(2)}*`;

        window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
        
        // Se for PIX, sugere abrir o modal de pagamento se o usuário ainda não pagou
        if (paymentMethod === 'pix') {
             const confirmPix = confirm("Pedido Enviado! Deseja ver o código PIX para pagamento agora?");
             if(confirmPix) handleOpenPix();
             else clearCart();
        } else {
            clearCart();
        }

    } catch (error: any) {
        console.error(error);
        alert(error.message || "Erro ao processar pedido.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (items.length === 0) return <div className="p-10 text-center flex flex-col items-center justify-center min-h-[60vh]"><ShoppingBag className="text-gray-200 mb-4" size={64}/><p className="text-gray-500 font-medium">Seu carrinho está vazio.</p><Link href="/" className="text-pink-600 font-bold mt-4 hover:underline">Voltar ao Cardápio</Link></div>;

  return (
    <div className="pb-40 pt-2 px-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6"><Link href="/"><ArrowLeft/></Link><h1 className="font-bold text-lg">Seu Pedido</h1></div>

      {/* Avisos de Estoque */}
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

      {/* Pagamento */}
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-4">
        <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><CreditCard size={16}/> Forma de Pagamento</h2>
        
        <div className="grid grid-cols-2 gap-2">
            {/* PIX */}
            <button onClick={() => setPaymentMethod('pix')} className={`py-3 px-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'pix' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                <QrCode size={18}/> PIX (QR Code)
            </button>
            {/* Dinheiro */}
            <button onClick={() => setPaymentMethod('money')} className={`py-3 px-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'money' ? 'bg-green-50 border-green-600 text-green-800 ring-1 ring-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                <Banknote size={18}/> Dinheiro
            </button>
            {/* Links */}
            <button onClick={() => setPaymentMethod('link_debito')} className={`py-3 px-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'link_debito' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                <LinkIcon size={18}/> Link Débito
            </button>
            <button onClick={() => setPaymentMethod('link_credito')} className={`py-3 px-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'link_credito' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                <LinkIcon size={18}/> Link Crédito
            </button>
        </div>

        {/* Botão Extra para Gerar PIX Agora */}
        {paymentMethod === 'pix' && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between">
                <div className="text-xs text-emerald-800">
                    <p className="font-bold">Pagar com PIX</p>
                    <p>Gere o código para pagar agora.</p>
                </div>
                <button onClick={handleOpenPix} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700">
                    Gerar QR Code
                </button>
            </div>
        )}

        {/* Conta Aberta (Mensalistas) */}
        {isMonthlyOrReseller && (
            <button onClick={() => setPaymentMethod('conta_aberta')} className={`w-full mt-2 py-3 border-2 border-dashed rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'conta_aberta' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'border-purple-200 text-purple-600'}`}>
                <FileText size={18}/> Pagar na Conta / Boleta
            </button>
        )}
      </div>

      {/* Entrega */}
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
                                <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center ${selectedAddressId === addr.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                                    <div><p className="font-bold text-sm">{addr.nickname}</p><p className="text-xs text-gray-500 line-clamp-1">{addr.street}, {addr.number}</p></div>
                                    {selectedAddressId === addr.id && <CheckCircle size={18} className="text-green-600"/>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-2"><input className="p-2 border rounded w-full text-sm" placeholder="CEP" value={cepInput} onChange={e => setCepInput(e.target.value)} maxLength={9}/><button onClick={handleBuscaCep} className="bg-slate-800 text-white px-3 rounded"><Search size={18}/></button></div>
                            <div className="h-[150px] bg-gray-100 rounded border relative">{isLoaded && <GoogleMap mapContainerStyle={{width:'100%',height:'100%'}} center={userLocation} zoom={15} options={{disableDefaultUI:true}}><Marker position={userLocation}/></GoogleMap>}</div>
                            <div className="flex gap-2"><input className="w-full p-2 border rounded text-sm bg-gray-50" value={address.street} readOnly/><input className="w-24 p-2 border-2 border-blue-100 font-bold rounded text-sm" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} placeholder="Nº"/></div>
                        </>
                    )}
                </div>
            )}
          </div>
      )}

      {/* Footer Total */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg safe-area-bottom z-40">
        <div className="max-w-2xl mx-auto space-y-3">
             <div className="flex justify-between font-bold text-lg text-gray-800"><span>Total</span><span className="text-green-600">R$ {(cartTotal + shippingPrice).toFixed(2)}</span></div>
            <button onClick={handleCheckout} disabled={isSubmitting} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg">
                {isSubmitting ? <Loader2 className="animate-spin"/> : <><Send size={18}/> {paymentMethod === 'conta_aberta' ? 'Confirmar na Conta' : 'Enviar Pedido'}</>}
            </button>
        </div>
      </div>

      {/* MODAL PIX */}
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