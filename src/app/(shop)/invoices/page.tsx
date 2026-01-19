// src/app/(shop)/invoices/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Loader2, FileText, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MyInvoicesPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filtro: Conta Aberta + Não Pago + Não Cancelado
        const debtOrders = allOrders.filter((o: any) => 
            o.paymentMethod === 'conta_aberta' && 
            o.isPaid !== true && 
            o.status !== 'cancelado'
        );
        setOrders(debtOrders);
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const openTotal = orders.reduce((acc, o) => acc + (o.total || 0), 0);

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-600"/></div>;

  return (
    <div className="pb-20 pt-6 px-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6"><Link href="/profile"><ArrowLeft/></Link><h1 className="font-bold text-xl">Minha Fatura em Aberto</h1></div>
      <div className="bg-gradient-to-r from-purple-700 to-indigo-600 rounded-2xl p-6 text-white shadow-lg mb-6"><p className="opacity-80 text-sm font-medium mb-1">Total a Pagar</p><h2 className="text-4xl font-bold">R$ {openTotal.toFixed(2)}</h2></div>
      <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><FileText size={18}/> Detalhamento</h3>
      <div className="space-y-3">
        {orders.length === 0 ? <div className="text-center py-10 bg-white rounded-xl border border-dashed"><p className="text-gray-400 font-medium">Tudo pago! Nenhuma pendência.</p></div> 
        : orders.map(order => {
            const date = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
            let itemsText = ""; try { itemsText = JSON.parse(order.items).map((i: any) => `${i.quantity}x ${i.name}`).join(", "); } catch(e) {}
            return (
                <div key={order.id} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1"><Calendar size={10}/> {date.toLocaleDateString('pt-BR')}</span><span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 rounded">#{order.shortId || '---'}</span></div>
                        <p className="text-sm text-gray-800 line-clamp-2">{itemsText}</p>
                    </div>
                    <div className="text-right"><p className="font-bold text-gray-900">R$ {order.total.toFixed(2)}</p><p className="text-[10px] font-bold uppercase text-yellow-600">Pendente</p></div>
                </div>
            )
         })}
      </div>
    </div>
  );
}