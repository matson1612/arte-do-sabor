// src/app/(admin)/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { DollarSign, ShoppingBag, TrendingUp, Calendar, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  // Métricas
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  
  // Tabelas
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Busca apenas pedidos finalizados ou entregues para o financeiro real
        // (Se quiser ver tudo, remova o 'where')
        const q = query(collection(db, "orders")); 
        const snap = await getDocs(q);
        const orders = snap.docs.map(d => d.data());

        // 1. Cálculos Gerais
        let revenue = 0;
        let count = 0;
        const productCount: Record<string, number> = {};
        const months: Record<string, number> = {};

        orders.forEach((order: any) => {
            // Considera apenas pedidos válidos para soma (opcional: filtrar status)
            if (order.status !== 'cancelado') {
                revenue += order.total || 0;
                count++;

                // Agrupa por Mês (Ex: "10/2023")
                const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
                const monthKey = date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
                months[monthKey] = (months[monthKey] || 0) + order.total;

                // Contagem de Produtos
                try {
                    const items = JSON.parse(order.items || "[]");
                    items.forEach((item: any) => {
                        productCount[item.name] = (productCount[item.name] || 0) + item.quantity;
                    });
                } catch (e) {}
            }
        });

        setTotalRevenue(revenue);
        setTotalOrders(count);
        setAvgTicket(count > 0 ? revenue / count : 0);

        // 2. Ranking de Produtos
        const sortedProducts = Object.entries(productCount)
            .map(([name, qtd]) => ({ name, qtd }))
            .sort((a, b) => b.qtd - a.qtd)
            .slice(0, 5); // Top 5
        setTopProducts(sortedProducts);

        // 3. Dados Mensais
        const sortedMonths = Object.entries(months)
            .map(([date, total]) => ({ date, total }))
            .reverse(); // Mais recente primeiro
        setMonthlyData(sortedMonths);

      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-600"/></div>;

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard Financeiro</h1>

      {/* CARDS DE KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full"><DollarSign size={24}/></div>
            <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Faturamento Total</p>
                <p className="text-2xl font-bold text-gray-800">{totalRevenue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><ShoppingBag size={24}/></div>
            <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Total Pedidos</p>
                <p className="text-2xl font-bold text-gray-800">{totalOrders}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full"><TrendingUp size={24}/></div>
            <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Ticket Médio</p>
                <p className="text-2xl font-bold text-gray-800">{avgTicket.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TOP PRODUTOS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><ShoppingBag size={20}/> Mais Vendidos</h2>
            <div className="space-y-3">
                {topProducts.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b pb-2 last:border-0">
                        <span className="text-gray-700 font-medium">#{idx+1} {p.name}</span>
                        <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-bold">{p.qtd} vendas</span>
                    </div>
                ))}
                {topProducts.length === 0 && <p className="text-gray-400">Sem dados ainda.</p>}
            </div>
        </div>

        {/* RELATÓRIO MENSAL */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar size={20}/> Histórico Mensal</h2>
            <div className="space-y-3">
                {monthlyData.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b pb-2 last:border-0">
                        <span className="text-gray-700 font-medium">{m.date}</span>
                        <span className="font-bold text-green-600">{m.total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}