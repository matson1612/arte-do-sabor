// src/app/(shop)/cart/page.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Trash2, ArrowLeft, Send, MapPin, ShoppingBag, Store, PlusCircle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const PHONE_NUMBER = "5563999999999"; 

export default function CartPage() {
  const { items, removeFromCart, cartTotal, clearCart } = useCart();
  const { user, loginGoogle } = useAuth();
  
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  
  // Endereços do Usuário
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shippingPrice, setShippingPrice] = useState(0);

  // Carrega Endereços Salvos
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            const data = snap.data();
            if (data.savedAddresses && data.savedAddresses.length > 0) {
                setSavedAddresses(data.savedAddresses);
                setSelectedAddressId(data.savedAddresses[0].id); // Seleciona o primeiro por padrão
            }
        }
    };
    fetchProfile();
  }, [user]);

  // Cálculo de Frete Simples (Baseado no método)
  useEffect(() => {
    if (deliveryMethod === 'pickup') {
        setShippingPrice(0);
    } else {
        // Aqui você pode criar lógica por bairro futuramente
        // Por enquanto, frete fixo de R$ 8,00 para entrega
        setShippingPrice(8.00); 
    }
  }, [deliveryMethod, selectedAddressId]);

  const handleCheckout = () => {
    if (!user) { loginGoogle(); return; }

    const finalTotal = cartTotal + shippingPrice;
    const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId);
    
    if (deliveryMethod === 'delivery' && !selectedAddr) {
        return alert("Selecione um endereço para entrega ou cadastre um novo.");
    }
    
    let msg = `*NOVO PEDIDO - ${user.displayName}*\n----------------\n`;
    items.forEach(i => msg += `${i.quantity}x ${i.name}\n`);
    msg += `----------------\n`;
    
    if (deliveryMethod === 'delivery' && selectedAddr) {
        msg += `📦 *Entrega* (${selectedAddr.nickname}) - R$ ${shippingPrice.toFixed(2)}\n`;
        msg += `📍 ${selectedAddr.street}, ${selectedAddr.number} - ${selectedAddr.district}\n`;
        if (selectedAddr.complement) msg += `Obs: ${selectedAddr.complement}\n`;
        // Link do Maps com as coordenadas salvas no endereço
        if(selectedAddr.location) {
             msg += `🗺️ Maps: http://googleusercontent.com/maps.google.com/?q=${selectedAddr.location.lat},${selectedAddr.location.lng}\n`;
        }
    } else { 
        msg += `🏪 *Retirada no Balcão*\n`; 
    }
    
    msg += `💳 Pagamento: ${paymentMethod.toUpperCase()}\n\n*TOTAL: R$ ${finalTotal.toFixed(2)}*`;
    window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    clearCart();
  };

  if (items.length === 0) return <div className="p-10 text-center flex flex-col items-center justify-center min-h-[60vh]"><ShoppingBag className="text-gray-200 mb-4" size={64}/><p className="text-gray-500 font-medium">Seu carrinho está vazio.</p><Link href="/" className="text-pink-600 font-bold mt-4 hover:underline">Voltar ao Cardápio</Link></div>;

  return (
    <div className="pb-40 pt-2 px-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6"><Link href="/"><ArrowLeft/></Link><h1 className="font-bold text-lg">Seu Pedido</h1></div>
      
      {/* ITENS */}
      <div className="space-y-3 mb-6">
        {items.map(item => (
            <div key={item.cartId} className="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm">
                <div><p className="font-bold text-sm text-gray-800">{item.quantity}x {item.name}</p><p className="text-xs text-green-600 font-bold">R$ {item.finalPrice.toFixed(2)}</p></div>
                <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 p-2 hover:bg-red-50 rounded-full transition"><Trash2 size={18}/></button>
            </div>
        ))}
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
                {savedAddresses.length === 0 ? (
                    <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-sm text-gray-500 mb-2">Você não tem endereços salvos.</p>
                        <Link href="/profile" className="text-sm bg-slate-800 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-slate-700">
                            <PlusCircle size={16}/> Cadastrar Endereço
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase">Selecione o Endereço:</p>
                        {savedAddresses.map(addr => (
                            <div 
                                key={addr.id} 
                                onClick={() => setSelectedAddressId(addr.id)}
                                className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${selectedAddressId === addr.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                                <div>
                                    <p className="font-bold text-sm text-gray-800">{addr.nickname}</p>
                                    <p className="text-xs text-gray-500 line-clamp-1">{addr.street}, {addr.number}</p>
                                </div>
                                {selectedAddressId === addr.id && <CheckCircle size={18} className="text-green-600"/>}
                            </div>
                        ))}
                        <Link href="/profile" className="block text-center text-xs text-pink-600 font-bold mt-2 hover:underline">+ Gerenciar Endereços</Link>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* PAGAMENTO & TOTAL */}
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
        <h2 className="font-bold text-sm mb-3">Pagamento</h2>
        <div className="flex gap-2">{['pix', 'card', 'money'].map(p => (<button key={p} onClick={() => setPaymentMethod(p)} className={`flex-1 py-2 border rounded text-sm capitalize ${paymentMethod === p ? 'bg-pink-50 border-pink-500 text-pink-700 font-bold' : ''}`}>{p === 'card' ? 'Cartão' : p === 'money' ? 'Dinheiro' : 'PIX'}</button>))}</div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg safe-area-bottom z-40">
        <div className="max-w-2xl mx-auto space-y-3">
             <div className="flex justify-between font-bold text-lg text-gray-800"><span>Total</span><span className="text-green-600">R$ {(cartTotal + shippingPrice).toFixed(2)}</span></div>
            <button onClick={handleCheckout} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg"><Send size={18}/> Enviar Pedido</button>
        </div>
      </div>
    </div>
  );
}