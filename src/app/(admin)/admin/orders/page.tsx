// src/app/(admin)/admin/orders/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, runTransaction } from "firebase/firestore";
import { Order, OrderStatus, Product, CartItem, Option } from "@/types";
import { Loader2, Filter, Clock, Truck, CheckCircle, ChefHat, MessageCircle, DollarSign, Edit, X, Trash2, Search, Calendar, Bell, Save } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState("todos");
  const [clientFilter, setClientFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [isEditing, setIsEditing] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editTotal, setEditTotal] = useState(0);

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
    getDocs(collection(db, "products")).then(snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))));
    return () => unsub();
  }, []);

  const adjustStock = async (order: Order, multiplier: number) => {
      let items: CartItem[] = []; try { items = JSON.parse(order.items); } catch(e){ return; }
      await runTransaction(db, async (transaction) => {
          for (const item of items) {
              if (item.id) {
                  const pRef = doc(db, "products", item.id);
                  const pSnap = await transaction.get(pRef);
                  if (pSnap.exists() && pSnap.data().stock !== null) {
                      transaction.update(pRef, { stock: pSnap.data().stock + (item.quantity * multiplier) });
                  }
              }
              if (item.selectedOptions) {
                  for (const [gId, opts] of Object.entries(item.selectedOptions)) {
                      const gRef = doc(db, "complement_groups", gId);
                      const gSnap = await transaction.get(gRef);
                      if (gSnap.exists()) {
                          const list = gSnap.data().options || [];
                          let changed = false;
                          (opts as Option[]).forEach(o => {
                              const idx = list.findIndex((x:any) => x.id === o.id);
                              if (idx !== -1 && list[idx].stock !== null) {
                                  list[idx].stock += (item.quantity * multiplier);
                                  changed = true;
                              }
                          });
                          if(changed) transaction.update(gRef, { options: list });
                      }
                  }
              }
          }
      });
  };

  const updateStatus = async (order: Order, newStatus: OrderStatus) => {
    try {
        const oldStatus = order.status;
        if (oldStatus !== 'cancelado' && newStatus === 'cancelado') await adjustStock(order, 1);
        if (oldStatus === 'cancelado' && newStatus !== 'cancelado') await adjustStock(order, -1);

        await updateDoc(doc(db, "orders", order.id), { status: newStatus });
        notifyClient(order, newStatus);
    } catch (e) { alert("Erro ao atualizar."); }
  };

  // QUITAR BOLETA: Marca isPaid = true. NÃO muda o status de entrega (pode já ter sido entregue).
  const handleQuitarBoleta = async (order: Order) => {
      if(!confirm(`Confirmar pagamento de R$ ${order.total.toFixed(2)}?`)) return;
      await updateDoc(doc(db, "orders", order.id), { isPaid: true });
      alert("Pagamento registrado!");
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

  const filteredOrders = orders.filter(order => {
      if (statusFilter !== "todos") {
          if (statusFilter === "boleta_pendente") {
              // FILTRO CORRIGIDO: Se for conta aberta, não pago e não cancelado
              if (order.paymentMethod !== 'conta_aberta' || order.isPaid === true || order.status === 'cancelado') return false;
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

  const getStatusStyle = (status: string) => { switch(status) { case 'em_aberto': return 'border-l-yellow-500 bg-yellow-50'; case 'produzindo': return 'border-l-blue-600 bg-blue-50'; case 'entrega': return 'border-l-orange-500 bg-orange-50'; case 'finalizado': return 'border-l-green-600 bg-white opacity-70'; case 'cancelado': return 'border-l-red-600 bg-red-50 opacity-60'; default: return 'border-l-gray-400 bg-white'; } };
  const getStatusLabel = (status: string) => { switch(status) { case 'em_aberto': return 'AGUARDANDO'; case 'produzindo': return 'PRODUZINDO'; case 'entrega': return 'EM ROTA'; case 'finalizado': return 'ENTREGUE'; case 'cancelado': return 'CANCELADO'; default: return status; } };

  // Edição (mantida)
  const openEditModal = (order: Order) => { setIsEditing(order); try { setEditItems(JSON.parse(order.items)); setEditTotal(order.total); } catch(e) { setEditItems([]); } };
  const saveEdit = async () => { if (!isEditing) return; try { await updateDoc(doc(db, "orders", isEditing.id), { items: JSON.stringify(editItems), total: editTotal }); alert("Atualizado!"); setIsEditing(null); } catch(e) { alert("Erro ao editar"); } };
  const editAddItem = (productId: string) => { const p = products.find(x => x.id === productId); if(p) { const newItem = { id: p.id, name: p.name, price: p.basePrice, quantity: 1, finalPrice: p.basePrice, selectedOptions: {} }; setEditItems([...editItems, newItem]); setEditTotal(t => t + p.basePrice); } };
  const editRemoveItem = (idx: number) => { const list = [...editItems]; setEditTotal(t => t - (list[idx].price * list[idx].quantity)); list.splice(idx, 1); setEditItems(list); };
  const editChangeQty = (idx: number, delta: number) => { const list = [...editItems]; const oldVal = list[idx].price * list[idx].quantity; list[idx].quantity = Math.max(1, list[idx].quantity + delta); const newVal = list[idx].price * list[idx].quantity; setEditItems(list); setEditTotal(t => t - oldVal + newVal); };

  return (
    <div className="pb-20 p-4 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6 mb-8">
          <div className="flex justify-between items-center"><h1 className="text-2xl font-bold flex items-center gap-2">Painel <span className="text-sm bg-gray-200 px-3 py-1 rounded-full">{filteredOrders.length}</span></h1><div className="text-xs text-gray-400 flex items-center gap-1"><Bell size={14} className="text-pink-500 animate-pulse"/> Som ON</div></div>
          <div className="bg-white p-4 rounded-xl shadow-sm border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col"><label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Status</label><div className="relative"><Filter className="absolute left-3 top-2.5 text-gray-400" size={16}/><select className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm font-bold outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="todos">Todos</option><option value="em_aberto">🟡 Novos</option><option value="produzindo">👨‍🍳 Produção</option><option value="entrega">🛵 Rota</option><option value="boleta_pendente">💰 Boletas Abertas</option><option value="finalizado">✅ Fim</option><option value="cancelado">❌ Cancelados</option></select></div></div>
              <div className="flex flex-col"><label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Cliente</label><div className="relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={16}/><input className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm outline-none" placeholder="Nome..." value={clientFilter} onChange={e => setClientFilter(e.target.value)} /></div></div>
              <div className="flex flex-col"><label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Produto</label><div className="relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={16}/><input className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm outline-none" placeholder="Item..." value={productFilter} onChange={e => setProductFilter(e.target.value)} /></div></div>
              <div className="flex flex-col"><label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Data</label><div className="relative"><Calendar className="absolute left-3 top-2.5 text-gray-400" size={16}/><input type="date" className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm outline-none" value={dateFilter} onChange={e => setDateFilter(e.target.value)} /></div></div>
          </div>
      </div>

      {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-600"/></div> : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map(order => {
            const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
            let items: any[] = []; try { items = JSON.parse(order.items); } catch(e){}
            const isBoleta = order.paymentMethod === 'conta_aberta';
            const isPendente = isBoleta && !order.isPaid && order.status !== 'cancelado';

            return (
                <div key={order.id} className={`p-5 rounded-xl shadow-md border-l-[6px] transition-all ${getStatusStyle(order.status)}`}>
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2"><h3 className="font-bold text-gray-900 text-lg">{order.userName}<button onClick={() => openEditModal(order)} className="ml-2 text-gray-400 hover:text-blue-600"><Edit size={14}/></button></h3><span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono text-gray-600">#{order.shortId || order.id.slice(0,4)}</span></div>
                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1"><Clock size={12}/> {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isBoleta ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{isBoleta ? 'CONTA' : 'VISTA'}</span>
                            </div>
                            <div className="bg-white/50 p-3 rounded-lg border border-gray-200/50 space-y-1">{items.map((i, idx) => (<div key={idx} className="flex justify-between text-sm text-gray-700"><span className="font-medium">{i.quantity}x {i.name}</span></div>))}</div>
                            <div className="mt-3 flex justify-between items-end"><p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">{order.deliveryMethod === 'delivery' ? <><Truck size={14}/> Entrega</> : '🏪 Retirada'}</p><p className="font-bold text-xl text-slate-800">R$ {order.total.toFixed(2)}</p></div>
                        </div>

                        <div className="flex flex-col justify-center gap-3 min-w-[100%] lg:min-w-[200px] border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 border-gray-200">
                            <div className="text-center"><span className={`text-sm font-black uppercase tracking-widest ${order.status === 'em_aberto' ? 'text-yellow-600' : 'text-gray-600'}`}>{getStatusLabel(order.status)}</span>{isPendente && <div className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded mt-1">NÃO PAGO</div>}</div>
                            
                            {/* QUITAR (Se for boleta pendente) */}
                            {isPendente && <button onClick={() => handleQuitarBoleta(order)} className="w-full p-2 bg-green-600 text-white rounded text-xs font-bold flex justify-center gap-2 mb-1"><DollarSign size={14}/> QUITAR</button>}
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <button onClick={() => updateStatus(order, 'produzindo')} className="p-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex flex-col items-center"><ChefHat size={18}/> Produzir</button>
                                <button onClick={() => updateStatus(order, 'entrega')} className="p-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold flex flex-col items-center"><Truck size={18}/> Rota</button>
                                <button onClick={() => updateStatus(order, 'finalizado')} className="col-span-2 p-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><CheckCircle size={18}/> ENTREGUE</button>
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
      {/* Modal Edição mantido */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center"><h3 className="font-bold">Editar</h3><button onClick={() => setIsEditing(null)}><X/></button></div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4">{editItems.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded"><p className="font-bold text-sm">{item.name}</p><div className="flex items-center gap-2"><button onClick={() => editChangeQty(idx, -1)}>-</button><span>{item.quantity}</span><button onClick={() => editChangeQty(idx, 1)}>+</button><button onClick={() => editRemoveItem(idx)} className="text-red-500"><Trash2 size={16}/></button></div></div>))}<div className="pt-4"><label className="text-xs font-bold">Add Produto</label><select className="w-full p-2 border" onChange={(e) => { if(e.target.value) { editAddItem(e.target.value); e.target.value = ""; } }}><option value="">Selecione...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
                <div className="p-4 border-t flex justify-between"><p className="font-bold">Total: R$ {editTotal.toFixed(2)}</p><button onClick={saveEdit} className="bg-green-600 text-white px-4 py-2 rounded">Salvar</button></div>
            </div>
        </div>
      )}
    </div>
  );
}