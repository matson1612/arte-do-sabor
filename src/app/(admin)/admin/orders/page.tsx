// src/app/(admin)/admin/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Order, OrderStatus } from "@/types";
import { Loader2, Filter, Clock, Truck, CheckCircle, ChefHat, MessageCircle, DollarSign } from "lucide-react";

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

  const notifyClient = (order: Order, newStatus: string) => {
      if (!order.userPhone) return;
      const phone = order.userPhone.replace(/\D/g, '');
      let msg = "";
      
      // Usa o ID Curto se existir, senão usa os 4 primeiros do ID longo
      const displayId = order.shortId || order.id.slice(0,4);

      switch(newStatus) {
          case 'produzindo': msg = `👨‍🍳 Olá ${order.userName}, seu pedido #${displayId} começou a ser preparado!`; break;
          case 'entrega': msg = `🛵 Saiu para entrega! Seu pedido #${displayId} está a caminho.`; break;
          case 'finalizado': msg = `✅ Pedido #${displayId} finalizado. Obrigado pela preferência!`; break;
          case 'cancelado': msg = `❌ O pedido #${displayId} foi cancelado.`; break;
      }

      if (msg) {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
  };

  const updateStatus = async (order: Order, newStatus: OrderStatus) => {
    try {
        await updateDoc(doc(db, "orders", order.id), { status: newStatus });
        notifyClient(order, newStatus);
    } catch (e) {
        alert("Erro ao atualizar status");
    }
  };

  const handleQuitarBoleta = async (order: Order) => {
      if(!confirm(`Confirmar pagamento/quitação do pedido de R$ ${order.total.toFixed(2)}?`)) return;
      await updateStatus(order, 'finalizado');
  };

  const filteredOrders = filter === "todos" ? orders : 
                         filter === "boleta_pendente" ? orders.filter(o => o.paymentMethod === 'conta_aberta' && o.status !== 'finalizado' && o.status !== 'cancelado') :
                         orders.filter(o => o.status === filter);

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
              <select className="bg-transparent p-2 outline-none text-sm font-bold text-gray-700 w-full" value={filter} onChange={e => setFilter(e.target.value)}>
                  <option value="todos">Todos</option>
                  <option value="em_aberto">🟡 Novos / Abertos</option>
                  <option value="produzindo">👨‍🍳 Produzindo</option>
                  <option value="entrega">🛵 Em Rota</option>
                  <option value="boleta_pendente">💰 Boletas Abertas</option>
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
            
            const isBoleta = order.paymentMethod === 'conta_aberta';
            const isPendente = isBoleta && order.status !== 'finalizado' && order.status !== 'cancelado';

            return (
                <div key={order.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${order.status === 'finalizado' ? 'border-l-green-500 opacity-60' : isPendente ? 'border-l-purple-500' : 'border-l-blue-500'}`}>
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{order.userName}</h3>
                                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                        <Clock size={10}/> {date.toLocaleDateString()} às {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        <span className="bg-gray-100 px-1 rounded font-bold ml-1">#{order.shortId || order.id.slice(0,4)}</span>
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${isBoleta ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {isBoleta ? 'CONTA MENSAL' : order.paymentMethod}
                                </span>
                            </div>

                            <div className="mt-3 bg-gray-50 p-3 rounded text-sm text-gray-700 space-y-1 border border-gray-100">
                                {items.map((i, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{i.quantity}x {i.name}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 flex justify-between items-end">
                                <p className="text-xs text-gray-500">{order.deliveryMethod === 'delivery' ? 'Entrega' : 'Retirada'}</p>
                                <p className="font-bold text-lg text-green-600">R$ {order.total.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[180px] border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 lg:pl-6 justify-center">
                            <div className={`p-1 rounded text-center font-bold text-xs uppercase mb-1 ${getStatusColor(order.status)}`}>
                                {order.status.replace('_', ' ')}
                            </div>
                            
                            {isPendente && (
                                <button onClick={() => handleQuitarBoleta(order)} className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-bold flex items-center justify-center gap-2 animate-pulse mb-1">
                                    <DollarSign size={14}/> QUITAR BOLETA
                                </button>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => updateStatus(order, 'produzindo')} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs font-bold flex flex-col items-center"><ChefHat size={14}/> Produzir</button>
                                <button onClick={() => updateStatus(order, 'entrega')} className="p-2 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 text-xs font-bold flex flex-col items-center"><Truck size={14}/> Rota</button>
                                <button onClick={() => updateStatus(order, 'finalizado')} className="col-span-2 p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 text-xs font-bold flex items-center justify-center gap-1"><CheckCircle size={14}/> Finalizar</button>
                            </div>
                            
                            {order.userPhone && (
                                <button onClick={() => window.open(`https://wa.me/${order.userPhone.replace(/\D/g, '')}`, '_blank')} className="mt-2 text-xs text-gray-400 hover:text-green-600 flex items-center justify-center gap-1">
                                    <MessageCircle size={12}/> Abrir Conversa
                                </button>
                            )}
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