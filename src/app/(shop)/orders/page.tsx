// src/app/(shop)/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Loader2, ShoppingBag, Clock, CheckCircle, XCircle, Trash2, ArrowLeft, Package } from "lucide-react";
import Link from "next/link";

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
        setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleCancel = async (orderId: string) => {
      if(!confirm("Tem certeza que deseja cancelar este pedido?")) return;
      try {
          await updateDoc(doc(db, "orders", orderId), { status: 'cancelado' });
      } catch(e) { alert("Erro ao cancelar."); }
  };

  if (!user) return <div className="p-20 text-center text-stone-500">Faça login.</div>;
  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-pink-500"/></div>;

  return (
    <div className="max-w-2xl mx-auto pb-20">
      
      {/* Header com Voltar */}
      <div className="flex items-center gap-4 mb-8">
          <Link href="/profile" className="p-2 bg-white rounded-full border border-stone-200 text-stone-500 hover:text-stone-800 transition"><ArrowLeft size={20}/></Link>
          <h1 className="text-2xl font-bold text-stone-800">Meus Pedidos</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
            <Package size={48} className="mx-auto mb-4 text-stone-300"/>
            <p className="text-stone-500 font-medium">Você ainda não fez pedidos.</p>
            <Link href="/" className="text-pink-600 font-bold mt-2 inline-block hover:underline">Ir para o Cardápio</Link>
        </div>
      ) : (
        <div className="space-y-4">
            {orders.map((order) => {
                const date = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
                let itemsList: any[] = []; try { itemsList = JSON.parse(order.items); } catch(e){}
                
                const isBoleta = order.paymentMethod === 'conta_aberta';
                const isPendente = isBoleta && !order.isPaid && order.status !== 'cancelado';
                const canCancel = order.status === 'em_aberto';

                return (
                    <div key={order.id} className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-xs font-bold bg-stone-100 text-stone-600 px-3 py-1 rounded-full mb-1 inline-block">Pedido #{order.shortId || order.id.slice(0,4)}</span>
                                <p className="text-xs text-stone-400 pl-1">{date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                            <StatusBadge status={order.status} />
                        </div>
                        
                        <div className="border-t border-stone-100 py-3 my-2 space-y-1">
                            {itemsList.map((item: any, idx: number) => (
                                <div key={idx} className="text-sm text-stone-600 flex justify-between">
                                    <span><span className="font-bold">{item.quantity}x</span> {item.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-50">
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">{isBoleta ? 'Na Conta' : order.paymentMethod}</span>
                                {isBoleta && <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${isPendente ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{isPendente ? 'A Pagar' : 'Pago'}</span>}
                                {canCancel && (
                                    <button onClick={() => handleCancel(order.id)} className="text-red-500 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition">
                                        <Trash2 size={12}/> Cancelar
                                    </button>
                                )}
                            </div>
                            <span className="font-bold text-lg text-green-600">R$ {order.total.toFixed(2)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        'em_aberto': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Recebido' },
        'produzindo': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Loader2, label: 'Preparando' },
        'entrega': { bg: 'bg-purple-100', text: 'text-purple-700', icon: ShoppingBag, label: 'Saiu p/ Entrega' },
        'finalizado': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Entregue' },
        'cancelado': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Cancelado' },
    };
    const current = styles[status] || styles['em_aberto'];
    const Icon = current.icon;
    return <span className={`${current.bg} ${current.text} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm`}><Icon size={12}/> {current.label}</span>;
}