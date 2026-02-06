// src/app/(shop)/invoices/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Loader2, FileText, Calendar, ArrowLeft, CheckCircle, AlertCircle, QrCode, Copy, X, Filter } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react"; 
import { generatePixCopyPaste } from "@/utils/pix";
import { StoreSettings } from "@/types";

export default function MyInvoicesPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // Estados de Filtro
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Estados do Modal PIX
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [copied, setCopied] = useState(false);

  // 1. Carregar Configurações (Chave PIX)
  useEffect(() => {
      const loadSettings = async () => {
          try {
              const snap = await getDoc(doc(db, "store_settings", "config"));
              if (snap.exists()) setStoreSettings(snap.data() as StoreSettings);
          } catch (e) { console.error(e); }
      };
      loadSettings();
  }, []);

  // 2. Carregar Pedidos e Extrair Meses
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        // Processa os pedidos
        const allOrders = snap.docs.map(d => {
            const data = d.data();
            const date = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
            // Cria chave de mês (ex: "10/2023") para agrupar
            const monthKey = date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
            return { id: d.id, ...data, monthKey, dateObj: date };
        });
        
        // Filtra apenas pendentes de Conta Aberta
        const debtOrders = allOrders.filter((o: any) => 
            o.paymentMethod === 'conta_aberta' && 
            o.isPaid !== true && 
            o.status !== 'cancelado'
        );

        setOrders(debtOrders);

        // Extrai meses únicos disponíveis
        const months = Array.from(new Set(debtOrders.map((o: any) => o.monthKey)));
        setAvailableMonths(months);
        
        // Seleciona o mês mais antigo por padrão (para evitar "furar" fila de pagamento) ou o primeiro da lista
        if (months.length > 0) setSelectedMonth(months[months.length - 1]); 

      } catch (error) { console.error("Erro invoices:", error); } 
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  // Filtra os pedidos com base no mês selecionado
  const filteredOrders = selectedMonth 
    ? orders.filter(o => o.monthKey === selectedMonth) 
    : orders;

  const displayTotal = filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  // Formata o mês para exibição (ex: "10/2023" -> "Outubro de 2023")
  const formatMonthLabel = (monthKey: string) => {
      if(!monthKey) return "";
      const [month, year] = monthKey.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const handleOpenPix = () => {
      if (displayTotal <= 0) return;
      if (!storeSettings?.pix) return alert("Chave PIX não configurada na loja.");

      const code = generatePixCopyPaste(displayTotal, storeSettings.pix);
      setPixCode(code);
      setCopied(false);
      setShowPixModal(true);
  };

  const handleCopyPix = () => {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-500"/></div>;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      
      <div className="flex items-center gap-4 mb-6">
          <Link href="/profile" className="p-2 bg-white rounded-full border border-stone-200 text-stone-500 hover:text-stone-800 transition"><ArrowLeft size={20}/></Link>
          <h1 className="text-2xl font-bold text-stone-800">Minha Fatura</h1>
      </div>

      {/* FILTRO DE MÊS */}
      {availableMonths.length > 0 && (
          <div className="mb-6 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Filter size={20}/></div>
                  <div>
                      <p className="text-xs font-bold text-stone-500 uppercase">Referência</p>
                      <p className="text-sm font-bold text-stone-800">Selecione o mês para pagamento</p>
                  </div>
              </div>
              <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full sm:w-auto bg-stone-50 border border-stone-300 text-stone-800 text-sm rounded-xl focus:ring-purple-500 focus:border-purple-500 block p-2.5 font-bold outline-none capitalize"
              >
                  {availableMonths.map(m => (
                      <option key={m} value={m}>{formatMonthLabel(m)}</option>
                  ))}
              </select>
          </div>
      )}

      {/* CARD DE TOTAL (Filtrado) */}
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden transition-all duration-300">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <p className="opacity-80 text-sm font-bold uppercase tracking-widest mb-1">
                    {selectedMonth ? `Total de ${formatMonthLabel(selectedMonth)}` : 'Total em Aberto'}
                </p>
                <h2 className="text-5xl font-bold">R$ {displayTotal.toFixed(2)}</h2>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold">
                    <AlertCircle size={14}/> {filteredOrders.length} pedidos neste mês
                </div>
            </div>
            
            {displayTotal > 0 && (
                <button 
                    onClick={handleOpenPix}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 w-full md:w-auto justify-center"
                >
                    <QrCode size={20}/> Pagar Fatura
                </button>
            )}
        </div>
        <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* LISTA DE PEDIDOS */}
      <div className="space-y-4">
        <h3 className="font-bold text-stone-700 ml-2 flex items-center gap-2 capitalize">
            <FileText size={18}/> Detalhes: {selectedMonth ? formatMonthLabel(selectedMonth) : 'Todos'}
        </h3>
        
        {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-stone-200">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500 opacity-80"/>
                <p className="text-stone-500 font-medium">Nenhuma pendência neste período.</p>
            </div>
        ) : (
            filteredOrders.map(order => {
                let itemsText = ""; try { itemsText = JSON.parse(order.items).map((i: any) => `${i.quantity}x ${i.name}`).join(", "); } catch(e) {}
                const isManual = order.isManual;

                return (
                    <div key={order.id} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-purple-200 transition">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs font-bold bg-stone-100 text-stone-600 px-3 py-1 rounded-full flex items-center gap-1">
                                    <Calendar size={12}/> {order.dateObj.toLocaleDateString('pt-BR')}
                                </span>
                                {isManual && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Manual</span>}
                            </div>
                            <p className="text-sm text-stone-600 font-medium line-clamp-1">
                                {isManual ? (order.description || "Lançamento Avulso") : itemsText}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-xl text-stone-800">R$ {order.total.toFixed(2)}</p>
                        </div>
                    </div>
                )
            })
        )}
      </div>

      {/* MODAL PIX */}
      {showPixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-300">
                  <button onClick={() => setShowPixModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-2 rounded-full hover:bg-stone-100"><X size={20}/></button>
                  <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3"><QrCode size={24}/></div>
                      <h3 className="text-xl font-bold text-stone-800">Pagamento PIX</h3>
                      <p className="text-sm text-stone-500 mb-1 capitalize">{formatMonthLabel(selectedMonth)}</p>
                  </div>
                  <div className="flex justify-center mb-6 p-4 bg-white border-2 border-stone-100 rounded-2xl shadow-inner"><QRCodeSVG value={pixCode} size={200} /></div>
                  <div className="text-center mb-6"><p className="text-xs text-stone-400 font-bold uppercase mb-1">Valor a Pagar</p><p className="text-3xl font-bold text-stone-800">R$ {displayTotal.toFixed(2)}</p></div>
                  <button onClick={handleCopyPix} className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${copied ? 'bg-green-600 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>{copied ? <CheckCircle size={18}/> : <Copy size={18}/>} {copied ? "Código Copiado!" : "Copiar Código PIX"}</button>
              </div>
          </div>
      )}
    </div>
  );
}