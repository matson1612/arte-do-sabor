// src/app/(admin)/admin/orders/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, runTransaction } from "firebase/firestore";
import { Order, OrderStatus, Product, CartItem, Option } from "@/types";
import { Loader2, Filter, Clock, Truck, CheckCircle, ChefHat, MessageCircle, DollarSign, Edit, X, Search, Calendar, Bell, Trash2, Save } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState("todos");
  const [clientFilter, setClientFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Edição
  const [isEditing, setIsEditing] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editTotal, setEditTotal] = useState(0);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");

    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
        if (!isFirstLoad.current) {
            const hasNewOrder = snap.docChanges().some(change => change.type === 'added');
            if (hasNewOrder) audioRef.current?.play().catch(() => {});
        }
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        setLoading(false);
        isFirstLoad.current = false;
    });

    getDocs(collection(db, "products")).then(snap => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });

    return () => unsub();
  }, []);

  // --- LÓGICA DE ESTOQUE E STATUS ---
  const adjustStock = async (order: Order, multiplier: number) => {
      let items: CartItem[] = [];
      try { items = JSON.parse(order.items); } catch(e){ return; }
      
      await runTransaction(db, async (transaction) => {
          for (const item of items) {
              if (item.id) {
                  const productRef = doc(db, "products", item.id);
                  const productSnap = await transaction.get(productRef);
                  if (productSnap.exists()) {
                      const data = productSnap.data();
                      if (data.stock !== null) {
                          const newStock = data.stock + (item.quantity * multiplier);
                          transaction.update(productRef, { stock: newStock });
                      }
                  }
              }
              if (item.selectedOptions) {
                  for (const [groupId, opts] of Object.entries(item.selectedOptions)) {
                      const groupRef = doc(db, "complement_groups", groupId);
                      const groupSnap = await transaction.get(groupRef);
                      if (groupSnap.exists()) {
                          const groupData = groupSnap.data();
                          let optionsList = groupData.options || [];
                          let changed = false;
                          (opts as Option[]).forEach(selectedOpt => {
                              const idx = optionsList.findIndex((o: any) => o.id === selectedOpt.id);
                              if (idx !== -1 && optionsList[idx].stock !== null) {
                                  optionsList[idx].stock = optionsList[idx].stock + (item.quantity * multiplier);
                                  changed = true;
                              }
                          });
                          if (changed) transaction.update(groupRef, { options: optionsList });
                      }
                  }
              }
          }
      });
  };

  const updateStatus = async (order: Order, newStatus: OrderStatus) => {
    try {
        const oldStatus = order.status;
        if (oldStatus === 'em_aberto' && newStatus === 'produzindo') await adjustStock(order, -1);
        if (oldStatus !== 'em_aberto' && oldStatus !== 'cancelado' && newStatus === 'cancelado') await adjustStock(order, 1);

        await updateDoc(doc(db, "orders", order.id), { status: newStatus });
        notifyClient(order, newStatus);
    } catch (e) {
        console.error(e);
        alert("Erro ao atualizar.");
    }
  };

  const notifyClient = (order: Order, newStatus: string) => {
      if (!order.userPhone) return;
      const phone = order.userPhone.replace(/\D/g, '');
      const orderId = order.shortId || order.id.slice(0,4);
      let msg = "";

      switch(newStatus) {
          case 'produzindo': msg = `👨‍🍳 Pedido #${orderId}: Começamos a preparar!`; break;
          case 'entrega': msg = `🛵 Pedido #${orderId}: Saiu para entrega!`; break;
          case 'finalizado': msg = `✅ Pedido #${orderId}: Entregue com sucesso.`; break;
          case 'cancelado': msg = `❌ Pedido #${orderId}: Foi cancelado.`; break;
      }
      if (msg) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- FILTROS ---
  const filteredOrders = orders.filter(order => {
      if (statusFilter !== "todos") {
          if (statusFilter === "boleta_pendente") {
              if (order.paymentMethod !== 'conta_aberta' || order.status === 'finalizado' || order.status === 'cancelado') return false;
          } else if (order.status !== statusFilter) {
              return false;
          }
      }
      if (clientFilter && !order.userName.toLowerCase().includes(clientFilter.toLowerCase())) return false;
      if (productFilter && !order.items.toLowerCase().includes(productFilter.toLowerCase())) return false;
      if (dateFilter) {
          const orderDate = new Date(order.createdAt?.seconds * 1000).toISOString().split('T')[0];
          if (orderDate !== dateFilter) return false;
      }
      return true;
  });

  const getStatusStyle = (status: string) => {
      switch(status) {
          case 'em_aberto': return 'border-l-yellow-500 bg-yellow-50';
          case 'produzindo': return 'border-l-blue-600 bg-blue-50';
          case 'entrega': return 'border-l-orange-500 bg-orange-50';
          case 'finalizado': return 'border-l-green-600 bg-white opacity-70';
          case 'cancelado': return 'border-l-red-600 bg-red-50 opacity-60';
          default: return 'border-l-gray-400 bg-white';
      }
  };

  // Funções de Edição
  const openEditModal = (order: Order) => { setIsEditing(order); try { setEditItems(JSON.parse(order.items)); setEditTotal(order.total); } catch(e) { setEditItems([]); } };
  const saveEdit = async () => { if (!isEditing) return; try { await updateDoc(doc(db, "orders", isEditing.id), { items: JSON.stringify(editItems), total: editTotal }); alert("Atualizado!"); setIsEditing(null); } catch(e) { alert("Erro ao editar"); } };
  const editAddItem = (productId: string) => { const p = products.find(x => x.id === productId); if(p) { const newItem = { id: p.id, name: p.name, price: p.basePrice, quantity: 1, finalPrice: p.basePrice, selectedOptions: {} }; const list = [...editItems, newItem]; setEditItems(list); recalcTotal(list); } };
  const editRemoveItem = (idx: number) => { const list = [...editItems]; list.splice(idx, 1); setEditItems(list); recalcTotal(list); };
  const editChangeQty = (idx: number, delta: number) => { const list = [...editItems]; list[idx].quantity = Math.max(1, list[idx].quantity + delta); setEditItems(list); recalcTotal(list); };
  const recalcTotal = (list: any[]) => { const t = list.reduce((a, b) => a + (b.price * b.quantity), 0); setEditTotal(t + (isEditing?.shippingPrice || 0)); };

  return (
    <div className="pb-20 p-4 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6 mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                Painel <span className="text-sm bg-gray-200 px-3 py-1 rounded-full text-gray-700">{filteredOrders.length}</span>
            </h1>
            <div className="text-xs text-gray-400 flex items-center gap-1">
                <Bell size={14} className="text-pink-500 animate-pulse"/> Áudio ON
            </div>
          </div>
          
          {/* BARRA DE FILTROS RESPONSIVA (Grid mudado aqui) */}
          <div className="bg-white p-4 rounded-xl shadow-sm border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Status</label>
                  <div className="relative">
                      <Filter className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                      <select className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm font-bold outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                          <option value="todos">Todos</option>
                          <option value="em_aberto">🟡 Novos</option>
                          <option value="produzindo">👨‍🍳 Produção</option>
                          <option value="entrega">🛵 Rota</option>
                          <option value="boleta_pendente">💰 Boletas</option>
                          <option value="finalizado">✅ Fim</option>
                      </select>
                  </div>
              </div>

              <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Cliente</label>
                  <div className="relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={16}/><input className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm outline-none" placeholder="Nome..." value={clientFilter} onChange={e => setClientFilter(e.target.value)} /></div>
              </div>

              <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Produto</label>
                  <div className="relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={16}/><input className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm outline-none" placeholder="Item..." value={productFilter} onChange={e => setProductFilter(e.target.value)} /></div>
              </div>

              <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Data</label>
                  <div className="relative"><Calendar className="absolute left-3 top-2.5 text-gray-400" size={16}/><input type="date" className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm outline-none" value={dateFilter} onChange={e => setDateFilter(e.target.value)} /></div>
              </div>
          </div>
      </div>
      
      {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-600"/></div> : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map(order => {
            const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
            let items: any[] = [];
            try { items = JSON.parse(order.items); } catch(e){}
            const isBoleta = order.paymentMethod === 'conta_aberta';
            const isPendente = isBoleta && order.status !== 'finalizado' && order.status !== 'cancelado';

            return (
                <div key={order.id} className={`p-5 rounded-xl shadow-md border-l-[6px] transition-all ${getStatusStyle(order.status)}`}>
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                        
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900 text-lg">{order.userName} 
                                            <button onClick={() => openEditModal(order)} className="ml-2 text-gray-400 hover:text-blue-600"><Edit size={14}/></button>
                                        </h3>
                                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono text-gray-600">#{order.shortId || order.id.slice(0,4)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1"><Clock size={12}/> {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${isBoleta ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{isBoleta ? 'CONTA' : 'VISTA'}</span>
                            </div>

                            <div className="bg-white/50 p-3 rounded-lg border border-gray-200/50 space-y-1">
                                {items.map((i, idx) => (
                                    <div key={idx} className="flex justify-between text-sm text-gray-700"><span className="font-medium">{i.quantity}x {i.name}</span></div>
                                ))}
                            </div>
                            
                            <div className="mt-3 flex justify-between items-end">
                                <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">{order.deliveryMethod === 'delivery' ? <><Truck size={14}/> Entrega</> : '🏪 Retirada'}</p>
                                <p className="font-bold text-xl text-slate-800">R$ {order.total.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center gap-3 min-w-[100%] lg:min-w-[200px] border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 border-gray-200">
                            {isPendente && <button onClick={() => { if(confirm("Quitar pedido?")) updateStatus(order, 'finalizado'); }} className="w-full p-2 bg-green-600 text-white rounded text-xs font-bold flex justify-center gap-2 mb-1"><DollarSign size={14}/> QUITAR</button>}
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <button onClick={() => updateStatus(order, 'produzindo')} className="p-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex flex-col items-center"><ChefHat size={18} className="mb-1"/> Produzir</button>
                                <button onClick={() => updateStatus(order, 'entrega')} className="p-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold flex flex-col items-center"><Truck size={18} className="mb-1"/> Rota</button>
                                <button onClick={() => updateStatus(order, 'finalizado')} className="col-span-2 p-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><CheckCircle size={18}/> FINALIZAR</button>
                                <button onClick={() => { if(confirm("Cancelar este pedido?")) updateStatus(order, 'cancelado'); }} className="col-span-2 p-1 text-red-400 hover:text-red-600 text-[10px] font-bold flex items-center justify-center gap-1"><X size={12}/> Cancelar</button>
                            </div>
                            
                            {order.userPhone && <button onClick={() => window.open(`https://wa.me/${order.userPhone.replace(/\D/g, '')}`, '_blank')} className="mt-1 text-xs text-gray-400 hover:text-green-600 flex justify-center items-center gap-1"><MessageCircle size={14}/> WhatsApp</button>}
                        </div>
                    </div>
                </div>
            );
          })}
        </div>
      )}

      {/* MODAL EDIÇÃO */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center"><h3 className="font-bold">Editar Pedido</h3><button onClick={() => setIsEditing(null)}><X/></button></div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    {editItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <div className="flex-1"><p className="font-bold text-sm">{item.name}</p></div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => editChangeQty(idx, -1)} className="w-6 h-6 bg-gray-200 rounded font-bold">-</button><span className="text-sm font-bold">{item.quantity}</span><button onClick={() => editChangeQty(idx, 1)} className="w-6 h-6 bg-gray-200 rounded font-bold">+</button><button onClick={() => editRemoveItem(idx)} className="text-red-500 ml-2"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                    <div className="pt-4 border-t"><label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Adicionar Produto</label><select className="w-full p-2 border rounded" onChange={(e) => { if(e.target.value) { editAddItem(e.target.value); e.target.value = ""; } }}><option value="">Selecione...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center"><button onClick={saveEdit} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"><Save size={18}/> Salvar</button></div>
            </div>
        </div>
      )}
    </div>
  );
}