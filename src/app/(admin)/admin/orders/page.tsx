// src/app/(admin)/admin/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, increment, getDoc, runTransaction } from "firebase/firestore";
import { Order, OrderStatus, Product } from "@/types";
import { Loader2, Filter, Clock, Truck, CheckCircle, ChefHat, MessageCircle, DollarSign, Edit, X, Plus, Trash2, Save } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]); // Para o modal de edição
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");

  // Estados do Modal de Edição
  const [isEditing, setIsEditing] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editTotal, setEditTotal] = useState(0);

  useEffect(() => {
    // Carrega pedidos
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        setLoading(false);
    });

    // Carrega produtos (para o select de adicionar item)
    getDocs(collection(db, "products")).then(snap => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });

    return () => unsub();
  }, []);

  // --- LÓGICA DE ESTOQUE E STATUS ---
  const updateStatus = async (order: Order, newStatus: OrderStatus) => {
    try {
        const oldStatus = order.status;
        
        // Regra de Estoque: Baixar quando entra em produção
        if (oldStatus === 'em_aberto' && newStatus === 'produzindo') {
            await adjustStock(order, -1); // Remove do estoque
        }
        // Regra de Estoque: Devolver se cancelar (após ter baixado)
        if (oldStatus !== 'em_aberto' && oldStatus !== 'cancelado' && newStatus === 'cancelado') {
            await adjustStock(order, 1); // Devolve ao estoque
        }

        await updateDoc(doc(db, "orders", order.id), { status: newStatus });
        notifyClient(order, newStatus);
    } catch (e) {
        console.error(e);
        alert("Erro ao atualizar. Verifique se há estoque suficiente.");
    }
  };

  const adjustStock = async (order: Order, multiplier: number) => {
      let items: any[] = [];
      try { items = JSON.parse(order.items); } catch(e){}
      
      // Usa transaction para garantir integridade
      await runTransaction(db, async (transaction) => {
          for (const item of items) {
              // Se tiver ID vinculado, atualiza o estoque desse produto
              if (item.id) {
                  const productRef = doc(db, "products", item.id);
                  const productSnap = await transaction.get(productRef);
                  if (productSnap.exists() && productSnap.data().stock !== null) {
                      const newStock = (productSnap.data().stock || 0) + (item.quantity * multiplier);
                      if (newStock < 0) throw new Error(`Estoque insuficiente para ${item.name}`);
                      transaction.update(productRef, { stock: newStock });
                  }
              }
          }
      });
  };

  const notifyClient = (order: Order, newStatus: string) => {
      if (!order.userPhone) return;
      const phone = order.userPhone.replace(/\D/g, '');
      let msg = "";
      const orderId = order.shortId || order.id.slice(0,4);

      switch(newStatus) {
          case 'produzindo': msg = `👨‍🍳 Olá ${order.userName}, seu pedido #${orderId} começou a ser preparado!`; break;
          case 'entrega': msg = `🛵 Saiu para entrega! Seu pedido #${orderId} está a caminho.`; break;
          case 'finalizado': msg = `✅ Pedido #${orderId} finalizado. Obrigado!`; break;
          case 'cancelado': msg = `❌ O pedido #${orderId} foi cancelado.`; break;
      }
      if (msg) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- LÓGICA DE EDIÇÃO ---
  const openEditModal = (order: Order) => {
      setIsEditing(order);
      try {
          const items = JSON.parse(order.items);
          setEditItems(items);
          setEditTotal(order.total);
      } catch(e) { setEditItems([]); }
  };

  const saveEdit = async () => {
      if (!isEditing) return;
      try {
          await updateDoc(doc(db, "orders", isEditing.id), {
              items: JSON.stringify(editItems),
              total: editTotal
          });
          alert("Pedido atualizado!");
          setIsEditing(null);
      } catch(e) { alert("Erro ao salvar edição."); }
  };

  const editAddItem = (productId: string) => {
      const prod = products.find(p => p.id === productId);
      if (!prod) return;
      // Adiciona item simples (sem complementos, para simplificar a edição rápida)
      const newItem = {
          id: prod.id, name: prod.name, price: prod.basePrice, quantity: 1, 
          finalPrice: prod.basePrice, selectedOptions: {}
      };
      const newItems = [...editItems, newItem];
      setEditItems(newItems);
      recalcTotal(newItems);
  };

  const editRemoveItem = (index: number) => {
      const newItems = [...editItems];
      newItems.splice(index, 1);
      setEditItems(newItems);
      recalcTotal(newItems);
  };

  const editChangeQty = (index: number, delta: number) => {
      const newItems = [...editItems];
      newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
      setEditItems(newItems);
      recalcTotal(newItems);
  };

  const recalcTotal = (items: any[]) => {
      // Recalcula considerando o preço unitário salvo no item
      const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      setEditTotal(total + (isEditing?.shippingPrice || 0));
  };

  // --- RENDER ---
  const filteredOrders = filter === "todos" ? orders : 
                         filter === "boleta_pendente" ? orders.filter(o => o.paymentMethod === 'conta_aberta' && o.status !== 'finalizado' && o.status !== 'cancelado') :
                         orders.filter(o => o.status === filter);

  return (
    <div className="pb-20">
      {/* Header e Filtros (Igual anterior) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">Gestão de Pedidos <span className="text-sm bg-gray-200 px-2 py-1 rounded-full">{filteredOrders.length}</span></h1>
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
            const isPendente = order.paymentMethod === 'conta_aberta' && order.status !== 'finalizado' && order.status !== 'cancelado';

            return (
                <div key={order.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${order.status === 'finalizado' ? 'border-l-green-500 opacity-60' : order.status === 'cancelado' ? 'border-l-red-500 opacity-60' : 'border-l-blue-500'}`}>
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{order.userName} 
                                        <button onClick={() => openEditModal(order)} className="ml-2 text-gray-400 hover:text-blue-600"><Edit size={14}/></button>
                                    </h3>
                                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                        <Clock size={10}/> {date.toLocaleDateString()} às {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        <span className="bg-gray-100 px-1 rounded ml-1 font-bold">#{order.shortId || order.id.slice(0,4)}</span>
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.paymentMethod === 'conta_aberta' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{order.paymentMethod === 'conta_aberta' ? 'CONTA MENSAL' : order.paymentMethod}</span>
                            </div>
                            <div className="mt-3 bg-gray-50 p-3 rounded text-sm text-gray-700 space-y-1 border border-gray-100">
                                {items.map((i, idx) => (
                                    <div key={idx} className="flex justify-between"><span>{i.quantity}x {i.name}</span></div>
                                ))}
                            </div>
                            <div className="mt-2 flex justify-between items-end"><p className="text-xs text-gray-500">{order.deliveryMethod === 'delivery' ? 'Entrega' : 'Retirada'}</p><p className="font-bold text-lg text-green-600">Total: R$ {order.total.toFixed(2)}</p></div>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[180px] border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 lg:pl-6 justify-center">
                            {/* Botões de Status */}
                            {isPendente && <button onClick={() => { if(confirm("Quitar pedido?")) updateStatus(order, 'finalizado'); }} className="w-full p-2 bg-green-600 text-white rounded text-xs font-bold flex justify-center gap-2 mb-1"><DollarSign size={14}/> QUITAR</button>}
                            
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => updateStatus(order, 'produzindo')} className="p-2 bg-blue-50 text-blue-600 rounded text-xs font-bold flex flex-col items-center"><ChefHat size={14}/> Produzir</button>
                                <button onClick={() => updateStatus(order, 'entrega')} className="p-2 bg-orange-50 text-orange-600 rounded text-xs font-bold flex flex-col items-center"><Truck size={14}/> Rota</button>
                                <button onClick={() => updateStatus(order, 'finalizado')} className="p-2 bg-green-50 text-green-600 rounded text-xs font-bold flex flex-col items-center"><CheckCircle size={14}/> Finalizar</button>
                                <button onClick={() => { if(confirm("Cancelar este pedido?")) updateStatus(order, 'cancelado'); }} className="p-2 bg-red-50 text-red-600 rounded text-xs font-bold flex flex-col items-center"><X size={14}/> Cancelar</button>
                            </div>
                            
                            {order.userPhone && <button onClick={() => window.open(`https://wa.me/${order.userPhone.replace(/\D/g, '')}`, '_blank')} className="mt-2 text-xs text-gray-400 hover:text-green-600 flex justify-center gap-1"><MessageCircle size={12}/> Abrir Conversa</button>}
                        </div>
                    </div>
                </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center"><h3 className="font-bold">Editar Pedido</h3><button onClick={() => setIsEditing(null)}><X/></button></div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    {editItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <div className="flex-1">
                                <p className="font-bold text-sm">{item.name}</p>
                                <p className="text-xs text-gray-500">R$ {item.price.toFixed(2)} un</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => editChangeQty(idx, -1)} className="w-6 h-6 bg-gray-200 rounded font-bold">-</button>
                                <span className="text-sm font-bold">{item.quantity}</span>
                                <button onClick={() => editChangeQty(idx, 1)} className="w-6 h-6 bg-gray-200 rounded font-bold">+</button>
                                <button onClick={() => editRemoveItem(idx)} className="text-red-500 ml-2"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                    
                    <div className="pt-4 border-t">
                        <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Adicionar Produto</label>
                        <select className="w-full p-2 border rounded" onChange={(e) => { if(e.target.value) { editAddItem(e.target.value); e.target.value = ""; } }}>
                            <option value="">Selecione...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.basePrice.toFixed(2)}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div><p className="text-xs text-gray-500">Novo Total</p><p className="font-bold text-lg text-green-600">R$ {editTotal.toFixed(2)}</p></div>
                    <button onClick={saveEdit} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"><Save size={18}/> Salvar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}