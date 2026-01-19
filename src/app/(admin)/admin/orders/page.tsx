// src/app/(admin)/admin/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, runTransaction } from "firebase/firestore";
import { Order, OrderStatus, Product, CartItem, Option } from "@/types";
import { Loader2, Filter, Clock, Truck, CheckCircle, ChefHat, MessageCircle, DollarSign, Edit, X, Trash2, Search, Calendar } from "lucide-react";

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

  useEffect(() => {
    // Carrega Pedidos
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        setLoading(false);
    });

    // Carrega Produtos (para edição)
    getDocs(collection(db, "products")).then(snap => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });

    return () => unsub();
  }, []);

  // --- LÓGICA DE ESTOQUE COMPLETA (PRODUTO + COMPLEMENTOS) ---
  const adjustStock = async (order: Order, multiplier: number) => {
      let items: CartItem[] = [];
      try { items = JSON.parse(order.items); } catch(e){ return; }
      
      await runTransaction(db, async (transaction) => {
          for (const item of items) {
              // 1. Baixa Produto Principal
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

              // 2. Baixa Complementos
              if (item.selectedOptions) {
                  for (const [groupId, opts] of Object.entries(item.selectedOptions)) {
                      const groupRef = doc(db, "complement_groups", groupId);
                      const groupSnap = await transaction.get(groupRef);
                      
                      if (groupSnap.exists()) {
                          const groupData = groupSnap.data();
                          let optionsList = groupData.options || [];
                          let changed = false;

                          // Percorre as opções escolhidas neste grupo
                          (opts as Option[]).forEach(selectedOpt => {
                              const idx = optionsList.findIndex((o: any) => o.id === selectedOpt.id);
                              if (idx !== -1) {
                                  const currentStock = optionsList[idx].stock;
                                  if (currentStock !== null) {
                                      // Multiplica pela qtd do item principal (ex: 2 lanches = 2 bacons)
                                      optionsList[idx].stock = currentStock + (item.quantity * multiplier);
                                      changed = true;
                                  }
                              }
                          });

                          if (changed) {
                              transaction.update(groupRef, { options: optionsList });
                          }
                      }
                  }
              }
          }
      });
  };

  const updateStatus = async (order: Order, newStatus: OrderStatus) => {
    try {
        const oldStatus = order.status;
        
        // Baixa estoque ao iniciar produção
        if (oldStatus === 'em_aberto' && newStatus === 'produzindo') {
            await adjustStock(order, -1);
        }
        // Devolve estoque ao cancelar (se já tiver baixado)
        if (oldStatus !== 'em_aberto' && oldStatus !== 'cancelado' && newStatus === 'cancelado') {
            await adjustStock(order, 1);
        }

        await updateDoc(doc(db, "orders", order.id), { status: newStatus });
        notifyClient(order, newStatus);
    } catch (e) {
        console.error(e);
        alert("Erro ao atualizar status/estoque.");
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
      // 1. Filtro de Status
      if (statusFilter !== "todos") {
          if (statusFilter === "boleta_pendente") {
              if (order.paymentMethod !== 'conta_aberta' || order.status === 'finalizado' || order.status === 'cancelado') return false;
          } else if (order.status !== statusFilter) {
              return false;
          }
      }
      
      // 2. Filtro de Cliente (Nome)
      if (clientFilter && !order.userName.toLowerCase().includes(clientFilter.toLowerCase())) return false;

      // 3. Filtro de Produto (Dentro dos itens JSON)
      if (productFilter && !order.items.toLowerCase().includes(productFilter.toLowerCase())) return false;

      // 4. Filtro de Data
      if (dateFilter) {
          const orderDate = new Date(order.createdAt?.seconds * 1000).toISOString().split('T')[0];
          if (orderDate !== dateFilter) return false;
      }

      return true;
  });

  // Cores e Estilos Visuais Reforçados
  const getStatusStyle = (status: string) => {
      switch(status) {
          case 'em_aberto': return 'border-l-yellow-500 bg-yellow-50';
          case 'produzindo': return 'border-l-blue-600 bg-blue-50';
          case 'entrega': return 'border-l-orange-500 bg-orange-50';
          case 'finalizado': return 'border-l-green-600 bg-white opacity-70 grayscale-[0.5]';
          case 'cancelado': return 'border-l-red-600 bg-red-50 opacity-60';
          default: return 'border-l-gray-400 bg-white';
      }
  };

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'em_aberto': return '🟡 AGUARDANDO';
          case 'produzindo': return '👨‍🍳 PRODUZINDO';
          case 'entrega': return '🛵 EM ROTA';
          case 'finalizado': return '✅ FINALIZADO';
          case 'cancelado': return '❌ CANCELADO';
          default: return status;
      }
  };

  return (
    <div className="pb-20 p-4 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6 mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                Painel de Pedidos <span className="text-sm bg-gray-200 px-3 py-1 rounded-full text-gray-700">{filteredOrders.length}</span>
            </h1>
          </div>
          
          {/* BARRA DE FILTROS */}
          <div className="bg-white p-4 rounded-xl shadow-sm border grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Status</label>
                  <div className="relative">
                      <Filter className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                      <select className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm font-bold outline-none focus:ring-2 ring-pink-100" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                          <option value="todos">Todos os Status</option>
                          <option value="em_aberto">🟡 Novos / Abertos</option>
                          <option value="produzindo">👨‍🍳 Em Produção</option>
                          <option value="entrega">🛵 Em Rota</option>
                          <option value="boleta_pendente">💰 Boletas Pendentes</option>
                          <option value="finalizado">✅ Finalizados</option>
                          <option value="cancelado">❌ Cancelados</option>
                      </select>
                  </div>
              </div>

              <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Cliente</label>
                  <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                      <input className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 ring-pink-100" placeholder="Nome do cliente..." value={clientFilter} onChange={e => setClientFilter(e.target.value)} />
                  </div>
              </div>

              <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Produto</label>
                  <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                      <input className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 ring-pink-100" placeholder="Ex: X-Bacon..." value={productFilter} onChange={e => setProductFilter(e.target.value)} />
                  </div>
              </div>

              <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-1">Data</label>
                  <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                      <input type="date" className="w-full pl-10 p-2 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 ring-pink-100" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                  </div>
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
                <div key={order.id} className={`p-5 rounded-xl shadow-md border-l-[6px] transition-all hover:shadow-lg ${getStatusStyle(order.status)}`}>
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                        
                        {/* Esquerda: Informações */}
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900 text-lg">{order.userName}</h3>
                                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono text-gray-600">#{order.shortId || order.id.slice(0,4)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                                        <Clock size={12}/> {date.toLocaleDateString()} às {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isBoleta ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {isBoleta ? 'CONTA MENSAL' : order.paymentMethod}
                                </span>
                            </div>

                            <div className="bg-white/50 p-3 rounded-lg border border-gray-200/50 space-y-1">
                                {items.map((i, idx) => (
                                    <div key={idx} className="flex justify-between text-sm text-gray-700">
                                        <span className="font-medium">{i.quantity}x {i.name}</span>
                                        {/* Detalhe de opções se quiser mostrar aqui */}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-3 flex justify-between items-end">
                                <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                    {order.deliveryMethod === 'delivery' ? <><Truck size={14}/> Entrega</> : '🏪 Retirada'}
                                </p>
                                <p className="font-bold text-xl text-slate-800">R$ {order.total.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Direita: Ações */}
                        <div className="flex flex-col justify-center gap-3 min-w-[200px] border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 border-gray-200">
                            
                            {/* Status Label Gigante */}
                            <div className="text-center">
                                <span className={`text-sm font-black uppercase tracking-widest ${
                                    order.status === 'em_aberto' ? 'text-yellow-600' : 
                                    order.status === 'produzindo' ? 'text-blue-600' : 
                                    order.status === 'entrega' ? 'text-orange-600' : 
                                    order.status === 'finalizado' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {getStatusLabel(order.status)}
                                </span>
                                {isPendente && <div className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded mt-1">Aguardando Quitação</div>}
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <button onClick={() => updateStatus(order, 'produzindo')} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-bold flex flex-col items-center transition"><ChefHat size={18} className="mb-1"/> Produzir</button>
                                <button onClick={() => updateStatus(order, 'entrega')} className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-xs font-bold flex flex-col items-center transition"><Truck size={18} className="mb-1"/> Rota</button>
                                <button onClick={() => updateStatus(order, 'finalizado')} className="col-span-2 p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs font-bold flex items-center justify-center gap-2 transition"><CheckCircle size={18}/> {isPendente ? 'QUITAR & FINALIZAR' : 'FINALIZAR'}</button>
                                <button onClick={() => { if(confirm("Cancelar este pedido? O estoque será devolvido.")) updateStatus(order, 'cancelado'); }} className="col-span-2 p-1 text-red-400 hover:text-red-600 text-[10px] font-bold flex items-center justify-center gap-1 transition"><X size={12}/> Cancelar Pedido</button>
                            </div>
                            
                            {order.userPhone && (
                                <button onClick={() => window.open(`https://wa.me/${order.userPhone.replace(/\D/g, '')}`, '_blank')} className="mt-1 text-xs text-gray-400 hover:text-green-600 flex justify-center items-center gap-1">
                                    <MessageCircle size={14}/> WhatsApp
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
          })}
          {filteredOrders.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                <Filter className="mx-auto text-gray-300 mb-2" size={48}/>
                <p className="text-gray-500 font-medium">Nenhum pedido encontrado com estes filtros.</p>
                <button onClick={() => { setFilterFilter("todos"); setClientFilter(""); setProductFilter(""); setDateFilter(""); }} className="text-pink-600 text-sm font-bold mt-2 hover:underline">Limpar Filtros</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function setFilterFilter(arg0: string) { throw new Error("Function not implemented."); }