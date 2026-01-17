// src/app/(admin)/admin/customers/[id]/invoice/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy, writeBatch } from "firebase/firestore";
import { Loader2, Printer, ArrowLeft, CheckCircle, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  // Carrega apenas o que é DÍVIDA (Em Aberto/Produção/Entrega E que seja Conta Aberta)
  const loadReport = async () => {
    setLoading(true);
    try {
        // 1. Cliente
        const userSnap = await getDoc(doc(db, "users", id));
        if (userSnap.exists()) setClient(userSnap.data());

        // 2. Pedidos
        const q = query(collection(db, "orders"), where("userId", "==", id), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const allOrders = snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));

        // FILTRO DE DÍVIDA: Conta Aberta + Status diferente de Finalizado/Cancelado
        const debtOrders = allOrders.filter((o: any) => 
            o.paymentMethod === 'conta_aberta' && 
            o.status !== 'finalizado' && 
            o.status !== 'cancelado'
        );

        setOrders(debtOrders.reverse()); // Do mais antigo para o novo

    } catch (error) {
        console.error(error);
        alert("Erro ao carregar dados.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, []);

  const totalAmount = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);

  // --- FUNÇÃO PARA QUITAR TUDO ---
  const handleSettleAll = async () => {
      if (!confirm(`Confirma o pagamento de R$ ${totalAmount.toFixed(2)}? Isso marcará ${orders.length} pedidos como FINALIZADOS.`)) return;
      
      setProcessing(true);
      try {
          const batch = writeBatch(db);
          orders.forEach(order => {
              // Muda para finalizado (Pago)
              batch.update(order.ref, { status: 'finalizado' });
          });
          await batch.commit();
          
          alert("Fatura quitada com sucesso!");
          loadReport(); // Recarrega a tela (deve ficar vazia)
      } catch (e) {
          alert("Erro ao quitar.");
          console.error(e);
      } finally {
          setProcessing(false);
      }
  };

  const handlePrint = () => { window.print(); };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline"/> Carregando...</div>;

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      
      {/* Controles (Escondidos na impressão) */}
      <div className="print:hidden max-w-4xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
            <div>
                <h1 className="font-bold text-lg">Boleta em Aberto</h1>
                <p className="text-xs text-gray-500">{orders.length} pedidos pendentes</p>
            </div>
        </div>
        
        <div className="flex gap-2">
            {orders.length > 0 && (
                <button 
                    onClick={handleSettleAll} 
                    disabled={processing}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                >
                    {processing ? <Loader2 className="animate-spin"/> : <DollarSign size={20}/>}
                    QUITAR TUDO
                </button>
            )}
            <button onClick={handlePrint} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800">
                <Printer size={20}/> Imprimir
            </button>
        </div>
      </div>

      {/* FOLHA DE IMPRESSÃO */}
      <div className="max-w-4xl mx-auto bg-white p-10 shadow-lg print:shadow-none print:w-full print:max-w-none print:p-0">
        
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">DEMONSTRATIVO DE DÉBITO</h1>
                <p className="text-gray-500 text-sm mt-1">Arte do Sabor</p>
                <p className="text-gray-500 text-sm">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-gray-400 uppercase">Situação</p>
                <p className="font-bold text-red-600 text-lg">PENDENTE</p>
            </div>
        </div>

        <div className="mb-8 bg-gray-50 p-4 rounded border print:border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Cliente</p>
            <h2 className="text-xl font-bold text-slate-800">{client?.name || "Nome não cadastrado"}</h2>
            <div className="flex gap-6 mt-2 text-sm text-gray-600">
                <span>Telefone: {client?.phone || "--"}</span>
            </div>
        </div>

        {/* Tabela */}
        {orders.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-xl mb-8">
                <CheckCircle className="mx-auto text-green-500 mb-2" size={40}/>
                <p className="text-gray-500 font-bold">Nenhuma pendência encontrada.</p>
                <p className="text-xs text-gray-400">Tudo pago!</p>
            </div>
        ) : (
            <table className="w-full text-left mb-8">
                <thead>
                    <tr className="border-b-2 border-gray-200">
                        <th className="py-2 font-bold text-sm text-gray-600">Data</th>
                        <th className="py-2 font-bold text-sm text-gray-600">ID</th>
                        <th className="py-2 font-bold text-sm text-gray-600">Itens</th>
                        <th className="py-2 font-bold text-sm text-gray-600 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {orders.map((order) => {
                        const date = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
                        let itemsList = "";
                        try { itemsList = JSON.parse(order.items).map((i: any) => `${i.quantity}x ${i.name}`).join(', '); } catch (e) {}

                        return (
                            <tr key={order.id}>
                                <td className="py-3 text-sm text-gray-700 w-24 align-top">
                                    {date.toLocaleDateString('pt-BR')}
                                </td>
                                <td className="py-3 text-xs font-mono text-gray-500 w-20 align-top">
                                    #{order.shortId || order.id.slice(0,4)}
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
        )}

        <div className="flex justify-end border-t-2 border-slate-900 pt-4">
            <div className="text-right">
                <p className="text-sm font-bold text-gray-500 uppercase">Total a Pagar</p>
                <p className="text-4xl font-bold text-slate-900 mt-1">
                    {totalAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </p>
            </div>
        </div>

        <div className="mt-20 pt-8 border-t border-dashed text-center text-sm text-gray-400 print:block hidden">
            <p>Comprovante de Conferência - Arte do Sabor</p>
        </div>

      </div>
    </div>
  );
}