// src/app/(admin)/admin/customers/[id]/invoice/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { Loader2, Printer, ArrowLeft, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Filtro de Datas (Padrão: Mês Atual)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const loadReport = async () => {
    setLoading(true);
    try {
        // 1. Dados do Cliente
        const userSnap = await getDoc(doc(db, "users", id));
        if (userSnap.exists()) {
            setClient(userSnap.data());
        }

        // 2. Pedidos do Cliente (Busca simples, filtro de data feito em memória para facilitar)
        const q = query(collection(db, "orders"), where("userId", "==", id), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filtra por data e status (apenas entregues/finalizados contam para pagamento)
        const start = new Date(startDate + "T00:00:00");
        const end = new Date(endDate + "T23:59:59");

        const filtered = allOrders.filter((o: any) => {
            if (!o.createdAt) return false;
            const orderDate = new Date(o.createdAt.seconds * 1000);
            // Permite pedidos "finalizados" ou "entregues" (ajuste conforme seus status)
            const isValidStatus = o.status !== 'cancelado'; 
            return orderDate >= start && orderDate <= end && isValidStatus;
        });

        setOrders(filtered.reverse()); // Ordem cronológica para o extrato

    } catch (error) {
        console.error(error);
        alert("Erro ao gerar extrato.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [startDate, endDate]);

  const totalAmount = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  if (loading && !client) return <div className="p-20 text-center"><Loader2 className="animate-spin inline"/> Gerando...</div>;

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      
      {/* Controles (Não aparecem na impressão) */}
      <div className="print:hidden max-w-4xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
            <h1 className="font-bold text-lg">Gerar Boleta / Extrato</h1>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-gray-500">De</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded text-sm"/>
            </div>
            <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase text-gray-500">Até</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded text-sm"/>
            </div>
            <button onClick={loadReport} className="bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200"><Calendar size={20}/></button>
        </div>

        <button onClick={handlePrint} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800">
            <Printer size={20}/> Imprimir / PDF
        </button>
      </div>

      {/* ÁREA DE IMPRESSÃO (A FOLHA A4) */}
      <div className="max-w-4xl mx-auto bg-white p-10 shadow-lg print:shadow-none print:w-full print:max-w-none print:p-0">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">EXTRATO MENSAL</h1>
                <p className="text-gray-500 text-sm mt-1">Arte do Sabor</p>
                <p className="text-gray-500 text-sm">CNPJ/CPF: SEU_CNPJ_AQUI</p>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-gray-400 uppercase">Referência</p>
                <p className="font-medium text-gray-800">
                    {new Date(startDate).toLocaleDateString('pt-BR')} até {new Date(endDate).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-sm font-bold text-gray-400 uppercase mt-2">Data Emissão</p>
                <p className="font-medium text-gray-800">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
        </div>

        {/* Dados do Cliente */}
        <div className="mb-8 bg-gray-50 p-4 rounded border print:border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Cliente</p>
            <h2 className="text-xl font-bold text-slate-800">{client?.name || "Nome não cadastrado"}</h2>
            <div className="flex gap-6 mt-2 text-sm text-gray-600">
                <span>Telefone: {client?.phone || "--"}</span>
                {client?.address && <span>Endereço: {client.address.street}, {client.address.number} - {client.address.district}</span>}
            </div>
        </div>

        {/* Tabela de Pedidos */}
        <table className="w-full text-left mb-8">
            <thead>
                <tr className="border-b-2 border-gray-200">
                    <th className="py-2 font-bold text-sm text-gray-600">Data</th>
                    <th className="py-2 font-bold text-sm text-gray-600">Descrição / Itens</th>
                    <th className="py-2 font-bold text-sm text-gray-600 text-right">Valor</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {orders.map((order) => {
                    const date = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
                    let itemsList = "Itens não carregados";
                    try {
                        const parsed = JSON.parse(order.items);
                        itemsList = parsed.map((i: any) => `${i.quantity}x ${i.name}`).join(', ');
                    } catch (e) {}

                    return (
                        <tr key={order.id}>
                            <td className="py-3 text-sm text-gray-700 w-32 align-top">
                                {date.toLocaleDateString('pt-BR')}<br/>
                                <span className="text-xs text-gray-400">{date.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                            </td>
                            <td className="py-3 text-sm text-gray-800 align-top">
                                {itemsList}
                            </td>
                            <td className="py-3 text-sm font-bold text-slate-900 text-right align-top">
                                {order.total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>

        {/* Totais */}
        <div className="flex justify-end border-t-2 border-slate-900 pt-4">
            <div className="text-right">
                <p className="text-sm font-bold text-gray-500 uppercase">Total a Pagar</p>
                <p className="text-4xl font-bold text-slate-900 mt-1">
                    {totalAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </p>
                <p className="text-xs text-gray-500 mt-2">Vencimento: 5º dia útil</p>
            </div>
        </div>

        {/* Rodapé Impressão */}
        <div className="mt-20 pt-8 border-t border-dashed text-center text-sm text-gray-400 print:block hidden">
            <p>Comprovante de Conferência - Arte do Sabor</p>
        </div>

      </div>
    </div>
  );
}