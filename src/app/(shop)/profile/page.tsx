"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Order } from "@/types";
import { LogOut, ShoppingBag, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, logout, profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (user) {
      const loadOrders = async () => {
        try {
          const q = query(
            collection(db, "orders"), 
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
          );
          const snap = await getDocs(q);
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
          setOrders(data);
        } catch (e) {
          console.error("Erro ao buscar pedidos", e);
        } finally {
          setLoadingOrders(false);
        }
      };
      loadOrders();
    }
  }, [user]);

  if (authLoading) return <div>Carregando...</div>;
  if (!user) return <div className="p-10 text-center">Faça login para ver seu perfil.</div>;

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      {/* Header do Perfil */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex items-center gap-4">
            {user.photoURL && <img src={user.photoURL} className="w-16 h-16 rounded-full" alt="Perfil" />}
            <div>
                <h1 className="text-xl font-bold">{profile?.name}</h1>
                <p className="text-gray-500 text-sm">{profile?.email}</p>
                {/* Aqui você pode mostrar se ele é VIP/Fiado se quiser, mas talvez seja melhor esconder do cliente */}
            </div>
        </div>
        <button onClick={logout} className="text-red-500 hover:bg-red-50 p-2 rounded"><LogOut size={20}/></button>
      </div>

      {/* Lista de Pedidos */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShoppingBag /> Meus Pedidos
        </h2>

        {loadingOrders ? (
             <div className="text-center py-10"><Loader2 className="animate-spin mx-auto"/></div>
        ) : orders.length === 0 ? (
             <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl">Você ainda não fez nenhum pedido.</div>
        ) : (
            <div className="space-y-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-xs text-gray-400">
                                    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : "Data Recente"}
                                </span>
                                <p className="font-bold text-gray-800">Total: R$ {order.total.toFixed(2)}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize
                                ${order.status === 'finalizado' ? 'bg-green-100 text-green-700' : 
                                  order.status === 'em_aberto' ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-blue-100 text-blue-700'}`}>
                                {order.status.replace('_', ' ')}
                            </span>
                        </div>
                        {/* Detalhes dos Itens (precisa parsear o JSON) */}
                        <div className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                            {JSON.parse(order.items).map((i: any, idx: number) => (
                                <div key={idx}>{i.quantity}x {i.name}</div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}