// src/app/(admin)/admin/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Order, OrderStatus } from "@/types";
import { Loader2, Filter, Clock, Truck, CheckCircle, ChefHat } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        setOrders(data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    try {
        await updateDoc(doc(db, "orders", id), { status: newStatus });
    } catch (e) {
        alert("Erro ao atualizar status");
    }
  };

  const filteredOrders = filter === "todos" ? orders : orders.filter(o => o.status === filter);

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'em_aberto': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'produzindo': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'entrega': return 'bg-orange-100 text-orange-800 border-orange-200';
          case 'finalizado': return 'bg-green-100 text-green-800 border-green-200';
          case 'cancelado': return 'bg-red-100 text-red-800 border-red-200';
          default: return 'bg-gray-100 text-gray-600';
      }
  };

  return (
    <div className="pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Gestão de Pedidos 
            <span className="text-sm bg-gray-200 px-2 py-1 rounded-full text-gray-600 font-normal">{filteredOrders.length}</span>
          </h1>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm w-full md:w-auto">
              <Filter size={16} className="ml-2 text-gray-400"/>
              <select 
                className="bg-transparent p-2 outline-none text-sm font-bold text-gray-700 w-full"
                value={filter} 
                onChange={e => setFilter(e.target.value)}
              >
                  <option value="todos">Todos</option>
                  <option value="em_aberto">🟡 Em Aberto</option>
                  <option value="produzindo">👨‍🍳 Produzindo</option>
                  <option value="entrega">🛵 Em Rota</option>
                  <option value="finalizado">✅ Finalizados</option>
                  <option value="cancelado">❌ Cancelados</option>
              </select>
          </div>
      </div>
      
      {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-600"/></div> : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
            let items: any[] = [];
            try { items = JSON.parse(order.items); } catch(e){}

            return (
                <div key={order.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${order.status === 'finalizado' ? 'border-l-green-500 opacity-80' : order.status === 'cancelado' ? 'border-l-red-500 opacity-60' : 'border-l-blue-500'}`}>
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                        
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{order.userName || "Cliente"}</h3>
                                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                        <Clock size={10}/> {date.toLocaleDateString()} às {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.paymentMethod === 'conta_aberta' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {order.paymentMethod === 'conta_aberta' ? 'CONTA MENSAL' : order.paymentMethod}
                                </span>
                            </div>

                            <div className="mt-3 bg-gray-50 p-3 rounded text-sm text-gray-700 space-y-1 border border-gray-100">
                                {items.map((i, idx) => (
                                    <div key={idx} className="flex justify-between border-b border-dashed last:border-0 pb-1 last:pb-0 border-gray-200">
                                        <span>{i.quantity}x {i.name}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-2 flex justify-between items-end">
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    {order.deliveryMethod === 'delivery' ? <><Truck size={12}/> Entrega</> : '🏪 Retirada'}
                                </p>
                                <p className="font-bold text-lg text-green-600">Total: R$ {order.total.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[180px] border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 lg:pl-6 justify-center">
                            <div className={`p-2 rounded border text-center font-bold text-xs uppercase mb-2 ${getStatusColor(order.status)}`}>
                                {order.status === 'em_aberto' && 'Aguardando'}
                                {order.status === 'produzindo' && 'Produzindo'}
                                {order.status === 'entrega' && 'Na Rua'}
                                {order.status === 'finalizado' && 'Concluído'}
                                {order.status === 'cancelado' && 'Cancelado'}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => updateStatus(order.id, 'produzindo')} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs font-bold flex flex-col items-center gap-1 border border-blue-100"><ChefHat size={16}/> Produzir</button>
                                <button onClick={() => updateStatus(order.id, 'entrega')} className="p-2 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 text-xs font-bold flex flex-col items-center gap-1 border border-orange-100"><Truck size={16}/> Rota</button>
                                <button onClick={() => updateStatus(order.id, 'finalizado')} className="col-span-2 p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 text-xs font-bold flex items-center justify-center gap-2 border border-green-100"><CheckCircle size={16}/> Finalizar</button>
                            </div>
                        </div>
                    </div>
                </div>
            );
          })}
        </div>
      )}
    </div>
  );
}