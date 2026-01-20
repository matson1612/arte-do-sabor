// src/app/(admin)/admin/customers/[id]/invoice/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Loader2, Printer, ArrowLeft, Phone, Mail, MapPin, Calendar, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserProfile } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerInvoicePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

  // Configurações da Empresa (Ajuste conforme sua necessidade)
  const COMPANY_INFO = {
    name: "Arte do Sabor",
    subtitle: "Doceria Artesanal",
    cnpj: "00.000.000/0001-00", 
    phone: "(63) 98122-1181",
    address: "Palmas, Tocantins",
    logoUrl: "/logo.jpg"
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // 1. Carregar Dados do Cliente
        const userSnap = await getDoc(doc(db, "users", id));
        if (userSnap.exists()) {
          setClient({ uid: userSnap.id, ...userSnap.data() } as UserProfile);
        }

        // 2. Carregar Pedidos
        // CORREÇÃO: Buscamos apenas pelo ID do usuário para evitar erro de índice no Firebase
        // A filtragem de "Conta Aberta" e "Não Pago" é feita no Javascript abaixo.
        const q = query(
          collection(db, "orders"),
          where("userId", "==", id)
        );
        
        const snap = await getDocs(q);
        
        const fetchedOrders = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((o: any) => {
             // FILTROS:
             // 1. Deve ser "conta_aberta" OU um lançamento manual (que sempre é conta)
             const isAccount = o.paymentMethod === 'conta_aberta';
             // 2. Não pode estar pago
             const isUnpaid = !o.isPaid;
             // 3. Não pode estar cancelado
             const isNotCancelled = o.status !== 'cancelado';

             return isAccount && isUnpaid && isNotCancelled;
          })
          // Ordenação via Javascript (Data mais recente primeiro)
          .sort((a: any, b: any) => {
              const dateA = a.createdAt?.seconds || 0;
              const dateB = b.createdAt?.seconds || 0;
              return dateB - dateA;
          });

        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Erro ao carregar fatura:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) loadData();
  }, [id]);

  const totalDebt = orders.reduce((acc, order) => acc + (Number(order.total) || 0), 0);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;
  if (!client) return <div className="p-10 text-center">Cliente não encontrado.</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 print:p-0 print:bg-white font-sans">
      
      {/* Barra de Ações (Oculta na Impressão) */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold bg-white px-4 py-2 rounded-lg shadow-sm border transition">
            <ArrowLeft size={18}/> Voltar
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-slate-800 transition">
            <Printer size={18}/> Imprimir / Salvar PDF
        </button>
      </div>

      {/* --- FOLHA DA FATURA --- */}
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow-xl print:shadow-none print:w-full print:max-w-none print:p-0">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-start border-b-2 border-gray-100 pb-8 mb-8">
            <div className="flex gap-5 items-center">
                <div className="w-24 h-24 rounded-full border border-gray-100 overflow-hidden relative shadow-sm">
                    <img src={COMPANY_INFO.logoUrl} alt="Logo" className="w-full h-full object-cover"/>
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 leading-none mb-1">{COMPANY_INFO.name}</h1>
                    <p className="text-sm text-pink-600 font-bold uppercase tracking-widest mb-3">{COMPANY_INFO.subtitle}</p>
                    <div className="text-xs text-gray-500 space-y-1">
                        <p className="flex items-center gap-1.5"><Phone size={12}/> {COMPANY_INFO.phone}</p>
                        <p className="flex items-center gap-1.5"><MapPin size={12}/> {COMPANY_INFO.address}</p>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <h2 className="text-5xl font-bold text-slate-800 tracking-tight mb-2">FATURA</h2>
                <div className="inline-block bg-gray-50 px-3 py-1 rounded border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold uppercase">Emissão</p>
                    <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </div>
        </div>

        {/* Info Cliente & Resumo */}
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-10">
            <div className="flex-1 bg-slate-50 p-5 rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Faturado Para</p>
                <h3 className="text-xl font-bold text-slate-800 mb-1">{client.name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                    {client.phone && <p className="flex items-center gap-2"><Phone size={12}/> {client.phone}</p>}
                    {client.email && <p className="flex items-center gap-2"><Mail size={12}/> {client.email}</p>}
                </div>
            </div>
            <div className="w-full md:w-64 bg-slate-900 text-white p-5 rounded-lg shadow-lg flex flex-col justify-center text-center md:text-right">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Valor Total em Aberto</p>
                <p className="text-3xl font-bold text-white">R$ {totalDebt.toFixed(2)}</p>
            </div>
        </div>

        {/* Tabela de Itens */}
        <div className="mb-8">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide border-b border-gray-100 pb-2">
                <FileText size={16} className="text-pink-500"/> Detalhamento de Consumo
            </h3>
            
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-200 text-xs font-bold text-slate-500 uppercase bg-gray-50">
                        <th className="py-3 px-4 rounded-tl-lg">Data</th>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4 w-1/2">Descrição</th>
                        <th className="py-3 px-4 text-right rounded-tr-lg">Valor</th>
                    </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                    {orders.length === 0 ? (
                        <tr><td colSpan={4} className="py-12 text-center text-gray-400 font-medium">Nenhuma pendência encontrada para este cliente.</td></tr>
                    ) : (
                        orders.map((order, idx) => {
                            const date = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : new Date();
                            
                            // Processar itens para texto legível
                            let description = order.description || "Pedido de Venda"; 
                            if (!order.isManual && order.items) {
                                try {
                                    const parsed = JSON.parse(order.items);
                                    if (Array.isArray(parsed) && parsed.length > 0) {
                                        description = parsed.map((i: any) => `${i.quantity}x ${i.name}`).join(", ");
                                    }
                                } catch (e) {}
                            }

                            // Verifica se é lançamento manual negativo (Crédito)
                            const isCredit = order.total < 0;

                            return (
                                <tr key={order.id} className={`group ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                    <td className="py-4 px-4 align-top text-gray-600 font-medium">
                                        {date.toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="py-4 px-4 align-top">
                                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded border border-slate-200">
                                            #{order.shortId || order.id.slice(0,4)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 align-top text-gray-800">
                                        <span className="block">{description}</span>
                                        {order.isManual && <span className="inline-block mt-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold border border-blue-100">Lançamento Manual</span>}
                                    </td>
                                    <td className={`py-4 px-4 text-right align-top font-bold ${isCredit ? 'text-green-600' : 'text-slate-900'}`}>
                                        {isCredit ? '-' : ''} R$ {Math.abs(order.total).toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>

        {/* Rodapé Totais */}
        <div className="flex justify-end pt-4">
            <div className="w-full md:w-1/2 space-y-3">
                <div className="flex justify-between text-sm text-gray-500 py-1">
                    <span>Subtotal Compras</span>
                    <span>R$ {orders.filter(o => o.total > 0).reduce((a, b) => a + Number(b.total), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600 py-1">
                    <span>Créditos / Abatimentos</span>
                    <span>- R$ {Math.abs(orders.filter(o => o.total < 0).reduce((a, b) => a + Number(b.total), 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 border-t-2 border-slate-100 pt-4 mt-2">
                    <span>Total a Pagar</span>
                    <span>R$ {totalDebt.toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* Footer Impresso */}
        <div className="mt-20 pt-8 border-t border-dashed border-gray-300 text-center hidden print:block">
            <p className="font-bold text-slate-800 mb-1">Obrigado pela preferência!</p>
            <p className="text-xs text-gray-400">Documento gerado eletronicamente por {COMPANY_INFO.name}. Não possui valor fiscal.</p>
        </div>

      </div>
    </div>
  );
}