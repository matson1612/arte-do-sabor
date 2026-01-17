// src/app/(shop)/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Loader2, ShoppingBag, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
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

  if (!user) return <div className="p-10 text-center">Faça login.</div>;
  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-pink-600"/></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Meus Pedidos</h1>
      {orders.length === 0 ? <p className="text-center text-gray-400">Nenhum pedido.</p> : (
        <div className="space-y-4">
            {orders.map((order) => {
                const date = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
                let itemsList: any[] = [];
                try { itemsList = JSON.parse(order.items); } catch(e){}
                
                const canCancel = order.status === 'em_aberto';

                return (
                    <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-sm font-bold text-slate-800 block">Pedido #{order.shortId || order.id.slice(0,4)}</span>
                                <p className="text-xs text-gray-500">{date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                            <StatusBadge status={order.status} />
                        </div>

                        <div className="border-t border-b py-2 my-2 space-y-1">
                            {itemsList.map((item: any, idx: number) => (
                                <div key={idx} className="text-sm text-gray-600 flex justify-between"><span>{item.quantity}x {item.name}</span></div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center mt-3">
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-500 font-bold uppercase">{order.paymentMethod === 'conta_aberta' ? 'Na Conta' : order.paymentMethod}</span>
                                {canCancel && (
                                    <button onClick={() => handleCancel(order.id)} className="text-red-500 text-xs font-bold flex items-center gap-1 hover:underline">
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
    return <span className={`${current.bg} ${current.text} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}><Icon size={12}/> {current.label}</span>;
}