// src/app/(admin)/admin/customers/[id]/invoice/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { Loader2, Printer, ArrowLeft, Phone, Mail, MapPin, Calendar } from "lucide-react";
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

  // Configurações da Loja (Pode virar dinâmico depois)
  const COMPANY_INFO = {
    name: "Arte do Sabor",
    subtitle: "Doceria Artesanal",
    cnpj: "00.000.000/0001-00", // Substitua pelo real se tiver
    phone: "(63) 98122-1181",
    address: "Palmas, Tocantins",
    logoUrl: "/logo.jpg" // Caminho da sua logo na pasta public
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Carregar Cliente
        const userSnap = await getDoc(doc(db, "users", id));
        if (userSnap.exists()) {
          setClient({ uid: userSnap.id, ...userSnap.data() } as UserProfile);
        }

        // 2. Carregar Pedidos em Aberto (Conta Aberta + Não Pagos)
        // Inclui também lançamentos manuais (isManual) que estejam pendentes
        const q = query(
          collection(db, "orders"),
          where("userId", "==", id),
          where("paymentMethod", "==", "conta_aberta"),
          orderBy("createdAt", "desc")
        );
        
        const snap = await getDocs(q);
        const fetchedOrders = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          // Filtra apenas o que não foi pago e não foi cancelado
          .filter((o: any) => !o.isPaid && o.status !== 'cancelado');

        setOrders(fetchedOrders);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const totalDebt = orders.reduce((acc, order) => acc + order.total, 0);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;
  if (!client) return <div className="p-10 text-center">Cliente não encontrado.</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 print:p-0 print:bg-white">
      
      {/* Barra de Ações (Escondida na Impressão) */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold bg-white px-4 py-2 rounded-lg shadow-sm border">
            <ArrowLeft size={18}/> Voltar
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-slate-800 transition">
            <Printer size={18}/> Imprimir / Salvar PDF
        </button>
      </div>

      {/* DOCUMENTO DA BOLETA */}
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow-xl print:shadow-none print:w-full print:max-w-none">
        
        {/* Cabeçalho Empresa */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8">
            <div className="flex gap-4">
                <div className="w-20 h-20 rounded-full border-2 border-pink-100 overflow-hidden relative">
                    {/* Exibe Logo */}
                    <img src={COMPANY_INFO.logoUrl} alt="Logo" className="w-full h-full object-cover"/>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-serif">{COMPANY_INFO.name}</h1>
                    <p className="text-sm text-pink-600 font-bold uppercase tracking-wider mb-2">{COMPANY_INFO.subtitle}</p>
                    <div className="text-xs text-gray-500 space-y-1">
                        <p className="flex items-center gap-1"><Phone size={10}/> {COMPANY_INFO.phone}</p>
                        <p className="flex items-center gap-1"><MapPin size={10}/> {COMPANY_INFO.address}</p>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <h2 className="text-4xl font-bold text-slate-900 mb-1">FATURA</h2>
                <p className="text-sm text-gray-400 font-medium">Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
        </div>

        {/* Dados do Cliente */}
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Faturado Para</p>
                <h3 className="text-xl font-bold text-slate-800">{client.name}</h3>
                <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                    {client.phone && <p className="flex items-center gap-2"><Phone size={12}/> {client.phone}</p>}
                    {client.email && <p className="flex items-center gap-2"><Mail size={12}/> {client.email}</p>}
                </div>
            </div>
            <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Valor Total em Aberto</p>
                <p className="text-3xl font-bold text-red-600">R$ {totalDebt.toFixed(2)}</p>
            </div>
        </div>

        {/* Tabela de Itens */}
        <div className="mb-8">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Calendar size={16}/> Detalhamento de Consumo
            </h3>
            
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-100 text-xs font-bold text-slate-500 uppercase">
                        <th className="py-3 pr-4">Data</th>
                        <th className="py-3 pr-4">ID</th>
                        <th className="py-3 pr-4 w-1/2">Descrição / Itens</th>
                        <th className="py-3 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                    {orders.length === 0 ? (
                        <tr><td colSpan={4} className="py-8 text-center text-gray-400">Nenhuma pendência encontrada.</td></tr>
                    ) : (
                        orders.map((order) => {
                            const date = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
                            
                            // Processar itens para texto legível
                            let description = order.description || "Pedido Delivery"; // Fallback
                            if (order.items) {
                                try {
                                    const parsed = JSON.parse(order.items);
                                    if (Array.isArray(parsed) && parsed.length > 0) {
                                        description = parsed.map((i: any) => `${i.quantity}x ${i.name}`).join(", ");
                                    }
                                } catch (e) {}
                            }

                            // Verifica se é lançamento manual negativo (Crédito/Abatimento)
                            const isCredit = order.total < 0;

                            return (
                                <tr key={order.id} className="group">
                                    <td className="py-4 pr-4 align-top text-gray-500 font-medium">
                                        {date.toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="py-4 pr-4 align-top">
                                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">
                                            #{order.shortId || order.id.slice(0,4)}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-4 align-top text-gray-800">
                                        {description}
                                        {order.isManual && <span className="ml-2 text-[10px] text-blue-500 bg-blue-50 px-1 rounded">Manual</span>}
                                    </td>
                                    <td className={`py-4 text-right align-top font-bold ${isCredit ? 'text-green-600' : 'text-slate-800'}`}>
                                        R$ {Math.abs(order.total).toFixed(2)} {isCredit ? '(Crédito)' : ''}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>

        {/* Rodapé e Totais */}
        <div className="border-t-2 border-slate-100 pt-6 flex flex-col items-end">
            <div className="w-full md:w-1/2 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal Compras</span>
                    <span>R$ {orders.filter(o => o.total > 0).reduce((a, b) => a + b.total, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                    <span>Créditos / Abatimentos</span>
                    <span>- R$ {Math.abs(orders.filter(o => o.total < 0).reduce((a, b) => a + b.total, 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 border-t border-gray-200 pt-3 mt-2">
                    <span>Total a Pagar</span>
                    <span>R$ {totalDebt.toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* Footer Impresso */}
        <div className="mt-16 pt-8 border-t border-dashed border-gray-300 text-center hidden print:block">
            <p className="font-serif font-bold text-lg mb-2">Obrigado pela preferência!</p>
            <p className="text-xs text-gray-400">Este documento não possui valor fiscal. Gerado eletronicamente por {COMPANY_INFO.name}.</p>
        </div>

      </div>
    </div>
  );
}