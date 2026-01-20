// src/app/(admin)/admin/finance/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, where } from "firebase/firestore";
import { 
  Loader2, TrendingUp, TrendingDown, DollarSign, Plus, Calendar, 
  Trash2, ArrowUpRight, ArrowDownLeft, Filter 
} from "lucide-react";
import { Expense, Order, ExpenseCategory } from "@/types";

const CATEGORIES: { id: ExpenseCategory; label: string; color: string }[] = [
    { id: 'insumos', label: 'Insumos / Mercado', color: 'bg-orange-100 text-orange-700' },
    { id: 'embalagens', label: 'Embalagens', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'contas_fixas', label: 'Contas Fixas (Luz/Água)', color: 'bg-blue-100 text-blue-700' },
    { id: 'pessoal', label: 'Pessoal / Diárias', color: 'bg-purple-100 text-purple-700' },
    { id: 'marketing', label: 'Marketing / Anúncios', color: 'bg-pink-100 text-pink-700' },
    { id: 'manutencao', label: 'Manutenção', color: 'bg-gray-100 text-gray-700' },
    { id: 'outros', label: 'Outros', color: 'bg-stone-100 text-stone-700' },
];

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", category: "insumos" as ExpenseCategory, date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [monthFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [year, month] = monthFilter.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // 1. Buscar Pedidos (Receitas)
      const ordersQ = query(
          collection(db, "orders"), 
          where("createdAt", ">=", startDate),
          where("createdAt", "<=", endDate)
      );
      const ordersSnap = await getDocs(ordersQ);
      
      const incomes = ordersSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Order))
        .filter(o => o.status !== 'cancelado') 
        .map(o => {
            // Lógica de Recebimento Real
            const isRecebido = o.paymentMethod !== 'conta_aberta' || o.isPaid;
            
            return {
                id: o.id,
                type: 'income',
                description: `Pedido #${o.shortId || o.id.slice(0,4)} - ${o.userName}`,
                amount: o.total,
                date: o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(),
                category: 'Vendas',
                status: isRecebido ? 'recebido' : 'pendente'
            };
        });

      // 2. Buscar Despesas
      const expensesSnap = await getDocs(query(collection(db, "expenses"), orderBy("date", "desc")));
      const expenses = expensesSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Expense))
        .filter(e => e.date.startsWith(monthFilter))
        .map(e => ({
            id: e.id,
            type: 'expense',
            description: e.description,
            amount: Number(e.amount),
            date: new Date(e.date + 'T12:00:00'),
            category: e.category,
            status: 'pago'
        }));

      // 3. Unificar
      const all = [...incomes, ...expenses].sort((a, b) => b.date.getTime() - a.date.getTime());
      
      const totalIncome = incomes.filter(i => i.status === 'recebido').reduce((acc, curr) => acc + curr.amount, 0);
      const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
      
      setTransactions(all);
      setSummary({ income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense });

    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleSaveExpense = async () => {
      if (!newExpense.description || !newExpense.amount) return alert("Preencha descrição e valor.");
      setSaving(true);
      try {
          await addDoc(collection(db, "expenses"), {
              description: newExpense.description,
              amount: parseFloat(newExpense.amount),
              category: newExpense.category,
              date: newExpense.date,
              createdAt: serverTimestamp()
          });
          setIsModalOpen(false);
          setNewExpense({ description: "", amount: "", category: "insumos", date: new Date().toISOString().slice(0, 10) });
          loadData(); 
      } catch (e) { alert("Erro ao salvar"); }
      finally { setSaving(false); }
  };

  const handleDeleteExpense = async (id: string) => {
      if(!confirm("Excluir despesa?")) return;
      try {
          await deleteDoc(doc(db, "expenses", id));
          loadData();
      } catch (e) { alert("Erro ao excluir"); }
  };

  return (
    <div className="pb-20 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Fluxo de Caixa</h1>
            
            <div className="flex gap-2 items-center bg-white p-2 rounded-xl border shadow-sm">
                <Calendar size={18} className="text-gray-400"/>
                <input 
                    type="month" 
                    className="outline-none text-sm font-bold text-gray-600 bg-transparent"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                />
            </div>
        </div>

        {/* CARDS RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Entradas (Recebidas)</p>
                    <h3 className="text-2xl font-bold text-emerald-600">R$ {summary.income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp size={24}/></div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Saídas (Despesas)</p>
                    <h3 className="text-2xl font-bold text-red-600">R$ {summary.expense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><TrendingDown size={24}/></div>
            </div>

            <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between ${summary.balance >= 0 ? 'bg-slate-800 text-white border-slate-700' : 'bg-red-50 text-red-800 border-red-200'}`}>
                <div>
                    <p className={`text-xs font-bold uppercase mb-1 ${summary.balance >= 0 ? 'text-slate-400' : 'text-red-400'}`}>Saldo Líquido</p>
                    <h3 className="text-2xl font-bold">R$ {summary.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${summary.balance >= 0 ? 'bg-slate-700 text-emerald-400' : 'bg-red-200 text-red-600'}`}><DollarSign size={24}/></div>
            </div>
        </div>

        {/* LISTA */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-700 flex items-center gap-2"><Filter size={16}/> Movimentações</h3>
                <button onClick={() => setIsModalOpen(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-red-700 transition shadow-sm">
                    <Plus size={16}/> Lançar Despesa
                </button>
            </div>

            {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400"/></div> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold border-b">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {transactions.map((t) => {
                                const isIncome = t.type === 'income';
                                const catStyle = CATEGORIES.find(c => c.id === t.category) || { label: t.category, color: 'bg-gray-100 text-gray-600' };
                                
                                return (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-500 font-medium whitespace-nowrap">{t.date.toLocaleDateString('pt-BR')}</td>
                                        <td className="p-4 font-bold text-gray-700">
                                            <div className="flex items-center gap-2">
                                                {isIncome ? <div className="bg-emerald-100 p-1 rounded text-emerald-600"><ArrowDownLeft size={14}/></div> : <div className="bg-red-100 p-1 rounded text-red-600"><ArrowUpRight size={14}/></div>}
                                                {t.description}
                                                {t.status === 'pendente' && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">A Receber</span>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {isIncome ? (
                                                <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold border border-emerald-100">Venda</span>
                                            ) : (
                                                <span className={`${catStyle.color} px-2 py-1 rounded-md text-xs font-bold border border-white shadow-sm`}>{catStyle.label}</span>
                                            )}
                                        </td>
                                        <td className={`p-4 text-right font-bold ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {isIncome ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            {!isIncome && ( 
                                                <button onClick={() => handleDeleteExpense(t.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {transactions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhuma movimentação neste mês.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col">
                    <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                        <h2 className="font-bold text-gray-800">Nova Despesa</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><Plus className="rotate-45" size={24}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Descrição</label>
                            <input autoFocus className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-100" placeholder="Ex: Conta de Luz" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Valor (R$)</label>
                                <input type="number" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-100" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Data</label>
                                <input type="date" className="w-full p-3 border rounded-xl outline-none bg-white" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Categoria</label>
                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button key={cat.id} onClick={() => setNewExpense({...newExpense, category: cat.id})} className={`p-2 rounded-lg text-xs font-bold border transition-all ${newExpense.category === cat.id ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
                        <button onClick={handleSaveExpense} disabled={saving} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 flex justify-center items-center gap-2 transition shadow-lg">
                            {saving ? <Loader2 className="animate-spin"/> : "Confirmar Lançamento"}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}