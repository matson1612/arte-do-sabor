// src/app/(admin)/admin/customers/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { User, ShoppingCart, Phone, MapPin, Loader2, FileText } from "lucide-react";
import { UserProfile } from "@/types";

interface CustomerWithStats extends UserProfile {
  id: string; // Garantir ID
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersSnap, ordersSnap] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "orders"))
        ]);

        const orders = ordersSnap.docs.map(d => d.data());
        
        const processedUsers = usersSnap.docs.map(doc => {
            const userData = doc.data() as UserProfile;
            const userId = doc.id;

            const userOrders = orders.filter((o: any) => o.userId === userId);
            const totalSpent = userOrders.reduce((acc, curr: any) => acc + (curr.total || 0), 0);
            
            // Data do último pedido
            const lastOrder = userOrders.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
            const lastOrderDate = lastOrder?.createdAt 
                ? new Date(lastOrder.createdAt.seconds * 1000).toLocaleDateString('pt-BR') 
                : "Nunca";

            return {
                id: userId,
                ...userData,
                clientType: userData.clientType || 'standard',
                totalSpent,
                orderCount: userOrders.length,
                lastOrderDate
            };
        });

        // Ordena: Mensalistas primeiro, depois quem gasta mais
        setCustomers(processedUsers.sort((a, b) => {
            if (a.clientType === 'monthly' && b.clientType !== 'monthly') return -1;
            if (a.clientType !== 'monthly' && b.clientType === 'monthly') return 1;
            return b.totalSpent - a.totalSpent;
        }));

      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const changeClientType = async (userId: string, newType: string) => {
    // Atualiza visualmente na hora (otimista)
    setCustomers(prev => prev.map(c => c.id === userId ? { ...c, clientType: newType as any } : c));
    try {
        await updateDoc(doc(db, "users", userId), { clientType: newType });
    } catch (error) {
        alert("Erro ao salvar categoria.");
    }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-600"/></div>;

  return (
    <div className="pb-20">
        <h1 className="text-2xl font-bold mb-6">Meus Clientes ({customers.length})</h1>

        <div className="grid gap-4">
            {customers.map((customer) => (
                <div key={customer.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex flex-col md:flex-row justify-between md:items-center gap-4 ${customer.clientType === 'monthly' ? 'border-l-purple-600' : 'border-l-gray-300'}`}>
                    
                    {/* Dados Pessoais */}
                    <div className="flex items-center gap-4 min-w-[250px]">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl text-white ${customer.clientType === 'monthly' ? 'bg-purple-600' : 'bg-gray-400'}`}>
                            {customer.name ? customer.name.charAt(0).toUpperCase() : <User/>}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-800">{customer.name || "Cliente sem Nome"}</p>
                                {customer.clientType === 'monthly' && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">MENSALISTA</span>}
                            </div>
                            <div className="flex flex-col text-sm text-gray-500 mt-1">
                                {customer.phone && <span className="flex items-center gap-1"><Phone size={12}/> {customer.phone}</span>}
                                {customer.address?.district && <span className="flex items-center gap-1"><MapPin size={12}/> {customer.address.district}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Controles e Estatísticas */}
                    <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-end">
                        
                        {/* Seletor de Categoria */}
                        <div className="w-full md:w-auto">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Categoria</label>
                            <select 
                                className={`w-full md:w-40 p-2 rounded border text-sm font-bold outline-none ${customer.clientType === 'monthly' ? 'text-purple-700 bg-purple-50 border-purple-200' : 'text-gray-700'}`}
                                value={customer.clientType}
                                onChange={(e) => changeClientType(customer.id, e.target.value)}
                            >
                                <option value="standard">🛒 Padrão (Vista)</option>
                                <option value="monthly">🤝 Mensalista (Prazo)</option>
                            </select>
                        </div>

                        {/* Estatísticas */}
                        <div className="flex gap-6 w-full md:w-auto justify-around md:justify-start">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Pedidos</p>
                                <p className="font-bold text-gray-800 flex items-center gap-1 justify-center">
                                    <ShoppingCart size={14} className="text-pink-500"/> {customer.orderCount}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Gasto Total</p>
                                <p className="font-bold text-green-600">
                                    {customer.totalSpent.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                </p>
                            </div>
                        </div>

                        {/* Botão Extrato */}
                        <Link 
                            href={`/admin/customers/${customer.id}/invoice`}
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 text-sm transition"
                        >
                            <FileText size={16}/>
                            {customer.clientType === 'monthly' ? "Gerar Boleta" : "Histórico"}
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}