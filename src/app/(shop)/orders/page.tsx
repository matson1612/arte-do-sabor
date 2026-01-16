"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Loader2, ShoppingBag, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        // Busca pedidos onde userId == id do usuario logado
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (!user) return <div className="p-10 text-center">Faça login para ver seus pedidos.</div>;
  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-pink-600"/></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Meus Pedidos</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm">
            <ShoppingBag className="mx-auto text-gray-300 mb-4" size={48}/>
            <p className="text-gray-500">Você ainda não fez nenhum pedido.</p>
            <Link href="/" className="text-pink-600 font-bold mt-2 inline-block">Ver Cardápio</Link>
        </div>
      ) : (
        <div className="space-y-4">
            {orders.map((order) => (
                <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className="text-xs text-gray-400 font-mono">#{order.id.slice(0,6)}</span>
                            <p className="font-bold text-gray-800">
                                {new Date(order.createdAt?.seconds * 1000).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        <StatusBadge status={order.status} />
                    </div>

                    <div className="border-t border-b py-2 my-2 space-y-1">
                        {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="text-sm text-gray-600 flex justify-between">
                                <span>{item.quantity}x {item.name}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center mt-3">
                        <span className="text-sm text-gray-500">Total</span>
                        <span className="font-bold text-lg text-green-600">R$ {order.total.toFixed(2)}</span>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        'pendente': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Pendente' },
        'preparando': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Loader2, label: 'Preparando' },
        'entregando': { bg: 'bg-purple-100', text: 'text-purple-700', icon: ShoppingBag, label: 'Saiu p/ Entrega' },
        'concluido': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Entregue' },
        'cancelado': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Cancelado' },
    };

    const current = styles[status] || styles['pendente'];
    const Icon = current.icon;

    return (
        <span className={`${current.bg} ${current.text} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
            <Icon size={12}/> {current.label}
        </span>
    );
}