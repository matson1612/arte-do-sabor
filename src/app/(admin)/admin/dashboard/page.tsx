// src/app/(admin)/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { 
  Loader2, Calendar, TrendingUp, DollarSign, ShoppingBag, 
  CreditCard, Printer, ArrowRight, X, FileText, TrendingDown 
} from "lucide-react";
import { Order, FinancialRecord } from "@/types";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  // Filtros de Data
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), // Início do mês
    end: new Date().toISOString().slice(0, 10) // Hoje
  });

  // Dados Brutos
  const [orders, setOrders] = useState<Order[]>([]);
  const [manualIncomes, setManualIncomes] = useState<FinancialRecord[]>([]);
  const [expenses, setExpenses] = useState<FinancialRecord[]>([]);

  // Dados Processados
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageTicket: 0,
    totalExpenses: 0,
    netProfit: 0
  });

  const [topProducts, setTopProducts] = useState<{name: string, qty: number}[]>([]);
  const [salesByDay, setSalesByDay] = useState<{date: string, total: number}[]>([]);

  // Modal de Relatório
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    title: string;
    type: 'revenue' | 'orders' | 'expenses';
    data: any[];
  }>({ isOpen: false, title: "", type: 'revenue', data: [] });

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Ajuste de datas para o query (Início do dia Start até Fim do dia End)
      const startDate = new Date(dateRange.start);
      startDate.setHours(0,0,0,0);
      
      const endDate = new Date(dateRange.end);
      endDate.setHours(23,59,59,999);

      // 1. Buscar Pedidos (Somente Válidos)
      const ordersQ = query(
        collection(db, "orders"),
        where("createdAt", ">=", startDate),
        where("createdAt", "<=", endDate)
      );
      const ordersSnap = await getDocs(ordersQ);
      const fetchedOrders = ordersSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Order))
        .filter(o => o.status !== 'cancelado'); // Ignora cancelados

      // 2. Buscar Movimentações Financeiras (Receitas Manuais e Despesas)
      // Como 'date' em expenses é string YYYY-MM-DD, filtramos manualmente ou usamos query de string
      const financeSnap = await getDocs(query(collection(db, "expenses"), orderBy("date", "desc")));
      const financeData = financeSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as FinancialRecord))
        .filter(f => f.date >= dateRange.start && f.date <= dateRange.end);

      const fetchedIncomes = financeData.filter(f => f.type === 'income');
      const fetchedExpenses = financeData.filter(f => f.type === 'expense');

      // --- PROCESSAMENTO DE MÉTRICAS ---
      
      // Faturamento: Pedidos + Receitas Manuais
      const ordersTotal = fetchedOrders.reduce((acc, o) => acc + o.total, 0);
      const manualTotal = fetchedIncomes.reduce((acc, i) => acc + i.amount, 0);
      const totalRevenue = ordersTotal + manualTotal;

      // Despesas
      const expensesTotal = fetchedExpenses.reduce((acc, e) => acc + e.amount, 0);

      // Produtos Mais Vendidos
      const productCount: Record<string, number> = {};
      fetchedOrders.forEach(o => {
        try {
          const items = JSON.parse(o.items);
          items.forEach((i: any) => {
            productCount[i.name] = (productCount[i.name] || 0) + i.quantity;
          });
        } catch (e) {}
      });
      const sortedProducts = Object.entries(productCount)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      // Vendas por Dia (Para Gráfico/Lista)
      const salesMap: Record<string, number> = {};
      // Agrupa Pedidos
      fetchedOrders.forEach(o => {
        const dateKey = new Date(o.createdAt.seconds * 1000).toLocaleDateString('pt-BR');
        salesMap[dateKey] = (salesMap[dateKey] || 0) + o.total;
      });
      // Agrupa Manuais
      fetchedIncomes.forEach(i => {
        // Assume i.date como string YYYY-MM-DD
        const dateParts = i.date.split('-'); 
        const dateKey = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        salesMap[dateKey] = (salesMap[dateKey] || 0) + i.amount;
      });
      
      const salesTimeline = Object.entries(salesMap)
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => {
            const [d1, m1, y1] = a.date.split('/').map(Number);
            const [d2, m2, y2] = b.date.split('/').map(Number);
            return new Date(y2, m2-1, d2).getTime() - new Date(y1, m1-1, d1).getTime();
        }); // Mais recente primeiro

      setOrders(fetchedOrders);
      setManualIncomes(fetchedIncomes);
      setExpenses(fetchedExpenses);
      
      setMetrics({
        totalRevenue,
        totalOrders: fetchedOrders.length + fetchedIncomes.length, // Considera manuais como "pedidos" para contagem
        averageTicket: (fetchedOrders.length + fetchedIncomes.length) > 0 ? totalRevenue / (fetchedOrders.length + fetchedIncomes.length) : 0,
        totalExpenses: expensesTotal,
        netProfit: totalRevenue - expensesTotal
      });

      setTopProducts(sortedProducts);
      setSalesByDay(salesTimeline);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openReport = (type: 'revenue' | 'orders' | 'expenses') => {
    let data: any[] = [];
    let title = "";

    if (type === 'revenue') {
        title = "Relatório Detalhado de Receitas";
        // Unifica para o relatório
        const ords = orders.map(o => ({
            date: new Date(o.createdAt.seconds * 1000).toLocaleDateString('pt-BR'),
            desc: `Pedido #${o.shortId || o.id.slice(0,4)} - ${o.userName}`,
            val: o.total,
            tag: 'Pedido'
        }));
        const mans = manualIncomes.map(m => ({
            date: new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR'),
            desc: m.description,
            val: m.amount,
            tag: 'Manual'
        }));
        data = [...ords, ...mans].sort((a,b) => b.val - a.val);
    } else if (type === 'expenses') {
        title = "Relatório de Despesas Operacionais";
        data = expenses.map(e => ({
            date: new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR'),
            desc: e.description,
            val: e.amount,
            tag: e.category
        }));
    }

    setReportModal({ isOpen: true, title, type, data });
  };

  return (
    <div className="pb-20">
      
      {/* --- CABEÇALHO E FILTROS --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
            <p className="text-xs text-slate-400">Acompanhe o desempenho da sua loja</p>
        </div>
        
        <div className="flex items-center gap-2 bg-stone-50 p-2 rounded-xl border border-stone-200">
            <div className="flex items-center gap-2 px-2">
                <Calendar size={16} className="text-stone-400"/>
                <span className="text-xs font-bold text-stone-500 hidden md:inline">Período:</span>
            </div>
            <input 
                type="date" 
                className="bg-white border rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-pink-500"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-stone-300">até</span>
            <input 
                type="date" 
                className="bg-white border rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-pink-500"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
        </div>
      </div>

      {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-pink-500"/></div> : (
        <>
            {/* --- CARDS DE KPIs --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Faturamento */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative group">
                    <button onClick={() => openReport('revenue')} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg transition backdrop-blur-sm" title="Ver Detalhes">
                        <FileText size={18} className="text-white"/>
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><TrendingUp size={20}/></div>
                        <span className="text-sm font-medium text-slate-300">Faturamento Bruto</span>
                    </div>
                    <h3 className="text-3xl font-bold">R$ {metrics.totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                    <p className="text-xs text-slate-400 mt-2">Pedidos + Lançamentos Manuais</p>
                </div>

                {/* Lucro Líquido */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm relative">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><DollarSign size={20}/></div>
                        <span className="text-sm font-bold text-slate-500">Lucro Líquido Estimado</span>
                    </div>
                    <h3 className={`text-3xl font-bold ${metrics.netProfit >= 0 ? 'text-slate-800' : 'text-red-500'}`}>R$ {metrics.netProfit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                    <p className="text-xs text-slate-400 mt-2">Receita - Despesas Cadastradas</p>
                </div>

                {/* Despesas */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm relative group">
                    <button onClick={() => openReport('expenses')} className="absolute top-4 right-4 bg-stone-100 hover:bg-stone-200 p-2 rounded-lg transition text-stone-500" title="Ver Detalhes">
                        <FileText size={18}/>
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500"><TrendingDown size={20}/></div>
                        <span className="text-sm font-bold text-slate-500">Despesas Totais</span>
                    </div>
                    <h3 className="text-3xl font-bold text-red-600">R$ {metrics.totalExpenses.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                    <p className="text-xs text-slate-400 mt-2">{expenses.length} lançamentos no período</p>
                </div>

                {/* Ticket Médio */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><CreditCard size={20}/></div>
                        <span className="text-sm font-bold text-slate-500">Ticket Médio</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800">R$ {metrics.averageTicket.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                    <p className="text-xs text-slate-400 mt-2">Média por venda realizada</p>
                </div>
            </div>

            {/* --- DETALHES OPERACIONAIS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* TOP PRODUTOS */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><ShoppingBag size={18} className="text-pink-500"/> Produtos Mais Vendidos</h3>
                    <div className="space-y-4">
                        {topProducts.length === 0 ? <p className="text-stone-400 text-sm">Sem dados de produtos.</p> : topProducts.map((p, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-stone-100 text-stone-600'}`}>{i + 1}</span>
                                    <span className="text-sm font-medium text-slate-700 line-clamp-1">{p.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{p.qty} un</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* VENDAS POR DIA (Gráfico Simples em Lista) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-6 overflow-hidden">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> Performance Diária</h3>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {salesByDay.length === 0 ? <p className="text-stone-400 text-sm">Sem vendas no período.</p> : salesByDay.map((day, i) => {
                            // Cálculo da largura da barra (máximo relativo ao maior dia)
                            const maxVal = Math.max(...salesByDay.map(d => d.total));
                            const widthPercent = (day.total / maxVal) * 100;
                            
                            return (
                                <div key={i} className="group">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-slate-600">{day.date}</span>
                                        <span className="font-bold text-emerald-600">R$ {day.total.toFixed(2)}</span>
                                    </div>
                                    <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${widthPercent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </>
      )}

      {/* --- MODAL DE RELATÓRIO / IMPRESSÃO --- */}
      {reportModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col">
                
                {/* Header Modal */}
                <div className="p-6 border-b flex justify-between items-center bg-stone-50 rounded-t-2xl">
                    <div>
                        <h2 className="font-bold text-xl text-slate-800">{reportModal.title}</h2>
                        <p className="text-xs text-stone-500 mt-1">Período: {new Date(dateRange.start).toLocaleDateString('pt-BR')} a {new Date(dateRange.end).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex gap-2 print:hidden">
                        <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition"><Printer size={16}/> Imprimir</button>
                        <button onClick={() => setReportModal({ ...reportModal, isOpen: false })} className="p-2 hover:bg-stone-200 rounded-lg text-stone-500"><X size={20}/></button>
                    </div>
                </div>

                {/* Conteúdo Relatório */}
                <div className="flex-1 overflow-y-auto p-6 print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-stone-100 text-xs font-bold text-stone-500 uppercase">
                                <th className="py-2">Data</th>
                                <th className="py-2">Descrição / Origem</th>
                                <th className="py-2">Tipo</th>
                                <th className="py-2 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-stone-50">
                            {reportModal.data.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-3 text-stone-600 font-medium">{item.date}</td>
                                    <td className="py-3 text-slate-800">{item.desc}</td>
                                    <td className="py-3"><span className="bg-stone-100 text-stone-600 px-2 py-1 rounded text-xs font-bold border border-stone-200">{item.tag}</span></td>
                                    <td className="py-3 text-right font-bold text-slate-800">R$ {item.val.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t-2 border-stone-100">
                            <tr>
                                <td colSpan={3} className="py-4 text-right font-bold text-slate-500 uppercase text-xs">Total do Período</td>
                                <td className="py-4 text-right font-bold text-xl text-slate-900">
                                    R$ {reportModal.data.reduce((a, b) => a + b.val, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    {/* Footer Impresso */}
                    <div className="mt-8 pt-8 border-t border-dashed border-gray-300 text-center hidden print:block">
                        <p className="text-xs text-gray-400">Relatório gerado em {new Date().toLocaleString('pt-BR')} | Sistema Admin Arte do Sabor</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Estilos de Impressão Global */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .fixed, .fixed * { visibility: visible; }
          .fixed { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: white; z-index: 9999; }
          /* Esconde botões de fechar/imprimir ao imprimir */
          .print\\:hidden { display: none !important; }
          /* Garante rolagem na impressão se necessário */
          .overflow-y-auto { overflow: visible !important; height: auto !important; }
        }
      `}</style>
    </div>
  );
}