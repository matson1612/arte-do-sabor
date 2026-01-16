// src/app/(admin)/admin/customers/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { User, ShoppingCart, Phone, MapPin, Loader2 } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // 1. Busca usuários e pedidos em paralelo
        const [usersSnap, ordersSnap] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "orders"))
        ]);

        const orders = ordersSnap.docs.map(d => d.data());
        
        // 2. Processa cada usuário
        const processedUsers = usersSnap.docs.map(doc => {
            const userData = doc.data();
            const userId = doc.id;

            // Filtra pedidos deste usuário
            const userOrders = orders.filter((o: any) => o.userId === userId);
            
            // Calcula total gasto e quantidade de pedidos
            const totalSpent = userOrders.reduce((acc, curr: any) => acc + (curr.total || 0), 0);
            const orderCount = userOrders.length;
            
            // Pega data do último pedido
            const lastOrder = userOrders.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
            const lastOrderDate = lastOrder?.createdAt 
                ? new Date(lastOrder.createdAt.seconds * 1000).toLocaleDateString('pt-BR') 
                : "Nunca";

            return {
                id: userId,
                ...userData,
                totalSpent,
                orderCount,
                lastOrderDate
            };
        });

        // Ordena por quem gasta mais (VIPs no topo)
        setCustomers(processedUsers.sort((a, b) => b.totalSpent - a.totalSpent));

      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-600"/></div>;

  return (
    <div className="pb-20">
        <h1 className="text-2xl font-bold mb-6">Meus Clientes ({customers.length})</h1>

        <div className="grid gap-4">
            {customers.map((customer) => (
                <div key={customer.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    
                    {/* Dados Pessoais */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xl">
                            {customer.name ? customer.name.charAt(0).toUpperCase() : <User/>}
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">{customer.name || "Cliente sem Nome"}</p>
                            <div className="flex gap-3 text-sm text-gray-500 mt-1">
                                {customer.phone && <span className="flex items-center gap-1"><Phone size={12}/> {customer.phone}</span>}
                                {customer.address?.district && <span className="flex items-center gap-1"><MapPin size={12}/> {customer.address.district}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Estatísticas do Cliente */}
                    <div className="flex gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                        <div className="text-center">
                            <p className="text-xs font-bold text-gray-400 uppercase">Pedidos</p>
                            <p className="font-bold text-gray-800 flex items-center gap-1 justify-center">
                                <ShoppingCart size={14} className="text-pink-500"/> {customer.orderCount}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Gasto</p>
                            <p className="font-bold text-green-600">
                                {customer.totalSpent.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-gray-400 uppercase">Última Compra</p>
                            <p className="text-sm font-medium text-gray-600">{customer.lastOrderDate}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}