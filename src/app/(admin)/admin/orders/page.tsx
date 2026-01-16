"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc } from "firebase/firestore";
import { Order, OrderStatus } from "@/types";
import { Loader2 } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    // Atualiza local
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    // Atualiza banco
    await updateDoc(doc(db, "orders", id), { status: newStatus });
  };

  return (
    <div className="pb-20">
      <h1 className="text-2xl font-bold mb-6">Gestão de Pedidos</h1>
      
      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    {/* Dados do Cliente */}
                    <div>
                        <h3 className="font-bold text-gray-800">{order.userName}</h3>
                        <p className="text-xs text-gray-500">ID: {order.id.slice(0,6)}...</p>
                        <div className="mt-2 text-sm text-gray-600">
                             {JSON.parse(order.items).map((i: any, idx: number) => (
                                <span key={idx} className="block">• {i.quantity}x {i.name}</span>
                            ))}
                        </div>
                        <p className="font-bold mt-2 text-pink-600">R$ {order.total.toFixed(2)}</p>
                    </div>

                    {/* Controles */}
                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <label className="text-xs font-bold text-gray-500 uppercase">Alterar Status</label>
                        <select 
                            className="p-2 border rounded bg-gray-50 font-medium"
                            value={order.status}
                            onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                        >
                            <option value="em_aberto">🟡 Em Aberto</option>
                            <option value="em_preparo">👨‍🍳 Em Preparo</option>
                            <option value="entrega">🛵 Saiu p/ Entrega</option>
                            <option value="finalizado">✅ Finalizado</option>
                        </select>

                        {/* Aqui futuramente você pode ver se o usuário é "fiado" 
                            buscando os dados dele pelo order.userId */}
                    </div>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}