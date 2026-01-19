// src/app/(shop)/invoices/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Loader2, FileText, Calendar, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
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
        
        // FILTRO CRÍTICO:
        // 1. Método de pagamento é 'conta_aberta'
        // 2. Pedido NÃO foi pago (isPaid !== true)
        // 3. Pedido NÃO foi cancelado
        const debtOrders = allOrders.filter((o: any) => 
            o.paymentMethod === 'conta_aberta' && 
            o.isPaid !== true && 
            o.status !== 'cancelado'
        );
        setOrders(debtOrders);
      } catch (error) { console.error("Erro invoices:", error); } 
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const openTotal = orders.reduce((acc, o) => acc + (o.total || 0), 0);

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-500"/></div>;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      
      {/* Header Página */}
      <div className="flex items-center gap-4 mb-8">
          <Link href="/profile" className="p-2 bg-white rounded-full border border-stone-200 text-stone-500 hover:text-stone-800 transition"><ArrowLeft size={20}/></Link>
          <h1 className="text-2xl font-bold text-stone-800">Minha Fatura Mensal</h1>
      </div>

      {/* Cartão de Total */}
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
            <p className="opacity-80 text-sm font-bold uppercase tracking-widest mb-1">Total em Aberto</p>
            <h2 className="text-5xl font-bold">R$ {openTotal.toFixed(2)}</h2>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold">
                <AlertCircle size={14}/> {orders.length} pedidos pendentes de quitação
            </div>
        </div>
        {/* Decorativo */}
        <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        <h3 className="font-bold text-stone-700 ml-2 flex items-center gap-2"><FileText size={18}/> Detalhamento</h3>
        
        {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-stone-200">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500 opacity-80"/>
                <p className="text-stone-500 font-medium">Tudo certo! Nenhuma pendência.</p>
            </div>
        ) : (
            orders.map(order => {
                const date = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
                let itemsText = ""; try { itemsText = JSON.parse(order.items).map((i: any) => `${i.quantity}x ${i.name}`).join(", "); } catch(e) {}
                
                return (
                    <div key={order.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-purple-200 transition">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs font-bold bg-stone-100 text-stone-600 px-3 py-1 rounded-full flex items-center gap-1">
                                    <Calendar size={12}/> {date.toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
                                    #{order.shortId || '---'}
                                </span>
                                {order.status === 'finalizado' && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">Entregue</span>}
                            </div>
                            <p className="text-sm text-stone-600 font-medium line-clamp-1">{itemsText}</p>
                        </div>
                        <div className="flex items-center justify-between sm:block sm:text-right border-t sm:border-t-0 border-stone-100 pt-3 sm:pt-0">
                            <span className="text-xs font-bold text-stone-400 sm:hidden">Valor</span>
                            <div>
                                <p className="font-bold text-xl text-stone-800">R$ {order.total.toFixed(2)}</p>
                                <p className="text-[10px] font-bold uppercase text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded inline-block mt-1">A Pagar</p>
                            </div>
                        </div>
                    </div>
                )
            })
        )}
      </div>
    </div>
  );
}