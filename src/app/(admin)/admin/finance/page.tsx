"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, where, updateDoc } from "firebase/firestore";
import { 
  Loader2, TrendingUp, TrendingDown, DollarSign, Plus, Calendar, 
  Trash2, ArrowUpRight, ArrowDownLeft, Filter, User, Pencil, X, Clock,
  FileText, Printer, CheckCircle, Search, Phone // <--- NOVOS IMPORTS
} from "lucide-react";
import { FinancialRecord, Order, ExpenseCategory, UserProfile } from "@/types";

const CATEGORIES: { id: ExpenseCategory; label: string; color: string }[] = [
    { id: 'venda_manual', label: 'Venda Direta / Balcão', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'insumos', label: 'Insumos / Mercado', color: 'bg-orange-100 text-orange-700' },
    { id: 'embalagens', label: 'Embalagens', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'contas_fixas', label: 'Contas Fixas', color: 'bg-blue-100 text-blue-700' },
    { id: 'pessoal', label: 'Pessoal', color: 'bg-purple-100 text-purple-700' },
    { id: 'marketing', label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
    { id: 'manutencao', label: 'Manutenção', color: 'bg-gray-100 text-gray-700' },
    { id: 'outros', label: 'Outros', color: 'bg-stone-100 text-stone-700' },
];

// Interface auxiliar para a Boleta
interface ClientDebt {
  userName: string;
  userPhone: string;
  totalDebt: number;
  orders: any[];
}

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0, receivables: 0 });
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Estados do Modal de Lançamento (Existente)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
      description: "", 
      amount: "", 
      category: "insumos" as ExpenseCategory, 
      type: "expense" as "income" | "expense",
      date: new Date().toISOString().slice(0, 10),
      clientId: "" 
  });
  const [saving, setSaving] = useState(false);

  // --- NOVOS ESTADOS PARA A BOLETA ---
  const [isBoletaOpen, setIsBoletaOpen] = useState(false);
  const [groupedDebts, setGroupedDebts] = useState<ClientDebt[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingBoleta, setLoadingBoleta] = useState(false);

  useEffect(() => {
    loadData();
    loadUsers();
  }, [monthFilter]);

  const loadUsers = async () => {
      try {
          const snap = await getDocs(collection(db, "users"));
          setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      } catch (e) { console.error("Erro ao carregar usuários", e); }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [year, month] = monthFilter.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // 1. Pedidos (Receitas Automáticas)
      const ordersQ = query(
          collection(db, "orders"), 
          where("createdAt", ">=", startDate),
          where("createdAt", "<=", endDate)
      );
      const ordersSnap = await getDocs(ordersQ);
      
      const orderIncomes = ordersSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Order))
        .filter(o => o.status !== 'cancelado') 
        .map(o => {
            const isRecebido = o.paymentMethod !== 'conta_aberta' || o.isPaid;
            return {
                id: o.id,
                type: 'income',
                description: `Pedido #${o.shortId || o.id.slice(0,4)} - ${o.userName}`,
                amount: Number(o.total) || 0,
                date: o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(),
                category: 'Vendas Sistema',
                status: isRecebido ? 'recebido' : 'pendente',
                isSystem: true
            };
        });

      // 2. Lançamentos Manuais
      const recordsSnap = await getDocs(query(collection(db, "expenses"), orderBy("date", "desc")));
      
      const manualRecords = recordsSnap.docs
        .map(d => {
            const data = d.data();
            return { id: d.id, ...data } as any;
        })
        .filter(e => {
            if (!e.date || typeof e.date !== 'string') return false; 
            return e.date.startsWith(monthFilter);
        })
        .map(e => {
            const client = users.find(u => u.uid === e.clientId);
            return {
                id: e.id,
                type: e.type || 'expense', 
                description: e.description || "Sem descrição",
                amount: Number(e.amount) || 0,
                date: new Date(e.date + 'T12:00:00'),
                category: e.category || 'outros',
                status: 'efetivado',
                isSystem: false,
                clientId: e.clientId,
                clientName: client?.name
            };
        });

      // 3. Unificar
      const all = [...orderIncomes, ...manualRecords].sort((a, b) => b.date.getTime() - a.date.getTime());
      
      // --- CÁLCULOS ---
      const totalIncome = all
        .filter(t => t.type === 'income' && (t.status === 'recebido' || t.status === 'efetivado'))
        .reduce((acc, curr) => acc + (curr.amount || 0), 0);
      
      const totalReceivables = all
        .filter(t => t.type === 'income' && t.status === 'pendente')
        .reduce((acc, curr) => acc + (curr.amount || 0), 0);
        
      const totalExpense = all
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + (curr.amount || 0), 0);
      
      setTransactions(all);
      setSummary({ income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense, receivables: totalReceivables });

    } catch (e) { 
        console.error("Erro fatal no financeiro:", e); 
        setTransactions([]);
        setSummary({ income: 0, expense: 0, balance: 0, receivables: 0 });
    } 
    finally { setLoading(false); }
  };

  // --- FUNÇÕES DA BOLETA GERAL (NOVO) ---
  const fetchBoletaData = async () => {
      setLoadingBoleta(true);
      setIsBoletaOpen(true);
      try {
          // Busca TODOS os pedidos (sem filtro de data) para achar dívidas antigas
          const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
          const snap = await getDocs(q);
          
          let recOrders: any[] = [];
          
          snap.forEach(doc => {
              const data = doc.data();
              if (data.status === 'cancelado') return;
              // Se é conta aberta e NÃO está pago
              if (data.paymentMethod === 'conta_aberta' && !data.isPaid) {
                  recOrders.push({
                      id: doc.id,
                      ...data,
                      dateObj: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date()
                  });
              }
          });

          // Agrupar por Cliente
          const groups: Record<string, ClientDebt> = {};
          recOrders.forEach(order => {
              const key = order.userPhone || order.userName || "Desconhecido";
              if (!groups[key]) {
                  groups[key] = {
                      userName: order.userName || "Cliente Sem Nome",
                      userPhone: order.userPhone || "",
                      totalDebt: 0,
                      orders: []
                  };
              }
              groups[key].orders.push(order);
              groups[key].totalDebt += Number(order.total) || 0;
          });

          setGroupedDebts(Object.values(groups).sort((a, b) => b.totalDebt - a.totalDebt));

      } catch (e) { console.error(e); alert("Erro ao gerar boleta."); }
      finally { setLoadingBoleta(false); }
  };

  const handleMarkAsPaid = async (orderId: string) => {
      if(!confirm("Confirmar recebimento deste pedido?")) return;
      try {
          await updateDoc(doc(db, "orders", orderId), { isPaid: true });
          // Atualiza tanto a boleta quanto o dashboard
          fetchBoletaData();
          loadData(); 
      } catch (e) { alert("Erro ao atualizar."); }
  };

  const filteredDebts = groupedDebts.filter(d => 
      d.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.userPhone.includes(searchTerm)
  );

  // --- FUNÇÕES DO CRUD DE LANÇAMENTOS (EXISTENTE) ---
  const openModal = (record?: any) => {
      if (record) {
          setEditingId(record.id);
          setFormData({
              description: record.description,
              amount: record.amount.toString(),
              category: record.category,
              type: record.type,
              date: record.date.toISOString().slice(0, 10),
              clientId: record.clientId || ""
          });
      } else {
          setEditingId(null);
          setFormData({ 
              description: "", amount: "", category: "insumos", type: "expense", 
              date: new Date().toISOString().slice(0, 10), clientId: "" 
          });
      }
      setIsModalOpen(true);
  };

  const handleSave = async () => {
      if (!formData.description || !formData.amount) return alert("Preencha os campos obrigatórios.");
      setSaving(true);
      try {
          const payload = {
              description: formData.description,
              amount: parseFloat(formData.amount),
              category: formData.category,
              type: formData.type,
              date: formData.date,
              clientId: formData.clientId || null, 
              updatedAt: serverTimestamp()
          };

          if (editingId) {
              await updateDoc(doc(db, "expenses", editingId), payload);
          } else {
              await addDoc(collection(db, "expenses"), { ...payload, createdAt: serverTimestamp() });
          }

          setIsModalOpen(false);
          loadData(); 
      } catch (e) { alert("Erro ao salvar"); console.error(e); }
      finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Tem certeza que deseja excluir este lançamento?")) return;
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
                <input type="month" className="outline-none text-sm font-bold text-gray-600 bg-transparent" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
            </div>
        </div>

        {/* Cards Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Recebido</p><h3 className="text-xl font-bold text-emerald-600">R$ {summary.income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp size={20}/></div>
            </div>
            
            {/* CARD A RECEBER (ATUALIZADO COM BOTÃO) */}
            <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="text-xs font-bold text-orange-400 uppercase mb-1">A Receber (Mês)</p>
                        <h3 className="text-xl font-bold text-orange-600">R$ {summary.receivables.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><Clock size={20}/></div>
                </div>
                <button 
                    onClick={fetchBoletaData}
                    className="w-full bg-orange-100 text-orange-800 py-2 rounded-lg text-xs font-bold hover:bg-orange-200 transition flex items-center justify-center gap-2"
                >
                    <FileText size={14}/> Ver Boleta Geral
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Despesas</p><h3 className="text-xl font-bold text-red-600">R$ {summary.expense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><TrendingDown size={20}/></div>
            </div>
            
            <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between ${summary.balance >= 0 ? 'bg-slate-800 text-white border-slate-700' : 'bg-red-50 text-red-800 border-red-200'}`}>
                <div><p className={`text-xs font-bold uppercase mb-1 ${summary.balance >= 0 ? 'text-slate-400' : 'text-red-400'}`}>Saldo Líquido</p><h3 className="text-xl font-bold">R$ {summary.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${summary.balance >= 0 ? 'bg-slate-700 text-emerald-400' : 'bg-red-200 text-red-600'}`}><DollarSign size={20}/></div>
            </div>
        </div>

        {/* Lista de Transações (Extrato) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-700 flex items-center gap-2"><Filter size={16}/> Extrato</h3>
                <button onClick={() => openModal()} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-sm">
                    <Plus size={16}/> Novo Lançamento
                </button>
            </div>

            {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400"/></div> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold border-b">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4">Cliente (Vínculo)</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 w-20 text-center">Ações</th>
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
                                                {t.status === 'pendente' && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200">A Receber</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600 text-xs">
                                            {t.clientName ? <span className="flex items-center gap-1 text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded w-fit"><User size={12}/> {t.clientName}</span> : t.isSystem ? <span className="text-gray-400">-</span> : <span className="text-gray-400 italic">Não vinculado</span>}
                                        </td>
                                        <td className="p-4">
                                            {t.isSystem ? <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold border border-emerald-100">Venda Sistema</span> : <span className={`${catStyle.color} px-2 py-1 rounded-md text-xs font-bold border border-white shadow-sm`}>{catStyle.label}</span>}
                                        </td>
                                        <td className={`p-4 text-right font-bold ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>{isIncome ? '+' : '-'} R$ {t.amount.toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            {!t.isSystem && ( 
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => openModal(t)} className="text-blue-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50" title="Editar"><Pencil size={16}/></button>
                                                    <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50" title="Excluir"><Trash2 size={16}/></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {transactions.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhuma movimentação neste mês.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* MODAL EDITAR/CRIAR LANÇAMENTO */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col">
                    <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                        <h2 className="font-bold text-gray-800">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex bg-gray-100 p-1 rounded-xl mb-2">
                            <button onClick={() => setFormData({...formData, type: 'expense', category: 'insumos'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Despesa (-)</button>
                            <button onClick={() => setFormData({...formData, type: 'income', category: 'venda_manual'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Receita (+)</button>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Descrição</label>
                            <input autoFocus className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ex: Venda Avulsa / Conta de Luz" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Valor (R$)</label>
                                <input type="number" className="w-full p-3 border rounded-xl outline-none" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Data</label>
                                <input type="date" className="w-full p-3 border rounded-xl outline-none bg-white" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                            </div>
                        </div>
                        {formData.type === 'income' && (
                            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                <label className="text-xs font-bold text-purple-700 uppercase block mb-1 flex items-center gap-1"><User size={12}/> Vincular Cliente (Opcional)</label>
                                <select className="w-full p-2 bg-white border border-purple-200 rounded-lg text-sm text-gray-700 outline-none" value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})}>
                                    <option value="">-- Cliente Não Identificado --</option>
                                    {users.map(u => (<option key={u.uid} value={u.uid}>{u.name} ({u.email})</option>))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Categoria</label>
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                {CATEGORIES.map(cat => (<button key={cat.id} onClick={() => setFormData({...formData, category: cat.id})} className={`p-2 rounded-lg text-xs font-bold border transition-all ${formData.category === cat.id ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{cat.label}</button>))}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
                        <button onClick={handleSave} disabled={saving} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 flex justify-center items-center gap-2 transition shadow-lg">
                            {saving ? <Loader2 className="animate-spin"/> : (editingId ? "Salvar Alterações" : "Confirmar Lançamento")}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL DA BOLETA COMPLETA (NOVO) --- */}
        {isBoletaOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:p-0 print:bg-white">
                <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:h-auto print:rounded-none print:shadow-none print:w-full">
                    
                    {/* Cabeçalho da Boleta */}
                    <div className="p-6 border-b flex justify-between items-center bg-slate-50 print:bg-white print:border-b-2">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Relatório de Mensalistas (Boleta)</h2>
                            <p className="text-sm text-slate-500 print:hidden">Contas em aberto agrupadas por cliente (Histórico Completo).</p>
                            <p className="hidden print:block text-sm text-slate-500">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            <button onClick={() => window.print()} className="p-2 text-slate-600 hover:bg-slate-200 rounded-full" title="Imprimir"><Printer/></button>
                            <button onClick={() => setIsBoletaOpen(false)} className="p-2 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-full"><X/></button>
                        </div>
                    </div>

                    {/* Filtro */}
                    <div className="p-4 border-b print:hidden">
                        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                            <Search size={18} className="text-gray-400"/>
                            <input className="bg-transparent outline-none w-full" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                        </div>
                    </div>

                    {/* Conteúdo (Lista) */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 print:overflow-visible">
                        {loadingBoleta ? <div className="text-center p-10"><Loader2 className="animate-spin inline"/> Carregando dados...</div> : filteredDebts.map((client, idx) => (
                            <div key={idx} className="border rounded-xl p-4 break-inside-avoid print:border-gray-300">
                                <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{client.userName}</h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-2"><Phone size={14}/> {client.userPhone}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Total Devido</p>
                                        <p className="text-xl font-bold text-red-600">{client.totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                </div>
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="p-2 rounded-l">Data</th>
                                            <th className="p-2">Pedido #</th>
                                            <th className="p-2">Valor</th>
                                            <th className="p-2 rounded-r print:hidden">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {client.orders.map(order => (
                                            <tr key={order.id}>
                                                <td className="p-2">{order.dateObj.toLocaleDateString('pt-BR')}</td>
                                                <td className="p-2 font-mono text-xs">{order.shortId}</td>
                                                <td className="p-2 font-bold">R$ {Number(order.total).toFixed(2)}</td>
                                                <td className="p-2 print:hidden">
                                                    <button onClick={() => handleMarkAsPaid(order.id)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition text-xs flex items-center gap-1 font-bold" title="Baixar">
                                                        <CheckCircle size={14}/> Baixar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                        {!loadingBoleta && filteredDebts.length === 0 && <p className="text-center text-gray-400">Nenhum débito encontrado.</p>}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}