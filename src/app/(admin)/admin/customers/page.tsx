// src/app/(admin)/admin/customers/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { User, ShoppingCart, Phone, MapPin, Loader2, FileText, PlusCircle, Trash2, Upload, FileCheck } from "lucide-react";
import { UserProfile, Product } from "@/types";
import { generateShortId } from "@/utils/generateId";
import { uploadImage } from "@/services/uploadService";

interface CustomerWithStats extends UserProfile {
  id: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
}

// Tipo para item manual
interface ManualItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Lançamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit'); // Débito (Cobrança) ou Crédito (Abatimento)
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [contractUrl, setContractUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [manualObservation, setManualObservation] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersSnap, ordersSnap, productsSnap] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "orders")),
            getDocs(collection(db, "products"))
        ]);

        // Carrega produtos para o select
        setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

        const orders = ordersSnap.docs.map(d => d.data());
        
        const processedUsers = usersSnap.docs.map(doc => {
            const userData = doc.data() as UserProfile;
            const userId = doc.id;
            const userOrders = orders.filter((o: any) => o.userId === userId);
            const totalSpent = userOrders.reduce((acc, curr: any) => acc + (curr.total || 0), 0);
            const lastOrder = userOrders.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
            const lastOrderDate = lastOrder?.createdAt ? new Date(lastOrder.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : "Nunca";

            return { id: userId, ...userData, clientType: userData.clientType || 'standard', totalSpent, orderCount: userOrders.length, lastOrderDate };
        });

        setCustomers(processedUsers.sort((a, b) => b.totalSpent - a.totalSpent));
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    loadData();
  }, []);

  const changeClientType = async (userId: string, newType: string) => {
    setCustomers(prev => prev.map(c => c.id === userId ? { ...c, clientType: newType as any } : c));
    try { await updateDoc(doc(db, "users", userId), { clientType: newType }); } catch (error) { alert("Erro ao salvar."); }
  };

  // --- FUNÇÕES DO MODAL ---
  const openEntryModal = (customer: CustomerWithStats) => {
      setSelectedCustomer(customer);
      setManualItems([]);
      setContractUrl("");
      setManualObservation("");
      setEntryType('debit');
      setIsModalOpen(true);
  };

  const addItem = (productId: string) => {
      const p = products.find(x => x.id === productId);
      if (p) {
          const newItem: ManualItem = {
              id: crypto.randomUUID(),
              name: p.name,
              price: selectedCustomer?.clientType === 'monthly' && p.pricePostpaid ? p.pricePostpaid : p.basePrice,
              quantity: 1
          };
          setManualItems([...manualItems, newItem]);
      }
  };

  const addCustomItem = () => {
      const name = prompt("Descrição do item (Ex: Abacaxi):");
      const priceStr = prompt("Valor Unitário (R$):");
      if (name && priceStr) {
          const price = parseFloat(priceStr.replace(',', '.'));
          if (!isNaN(price)) {
              setManualItems([...manualItems, { id: crypto.randomUUID(), name, price, quantity: 1 }]);
          }
      }
  };

  const updateItemQty = (index: number, delta: number) => {
      const newItems = [...manualItems];
      newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
      setManualItems(newItems);
  };

  const removeItem = (index: number) => {
      setManualItems(manualItems.filter((_, i) => i !== index));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
          const url = await uploadImage(file);
          setContractUrl(url);
      } catch (e) { alert("Erro no upload."); } 
      finally { setUploading(false); }
  };

  const handleSubmitEntry = async () => {
      if (manualItems.length === 0) return alert("Adicione pelo menos um item.");
      if (!selectedCustomer) return;

      const subtotal = manualItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      // Se for crédito, o valor total é negativo para abater na conta
      const finalTotal = entryType === 'credit' ? -subtotal : subtotal;

      try {
          await addDoc(collection(db, "orders"), {
              shortId: generateShortId(),
              userId: selectedCustomer.id,
              userName: selectedCustomer.name,
              userPhone: selectedCustomer.phone || "",
              items: JSON.stringify(manualItems), // Salva estrutura simples
              total: finalTotal,
              status: 'finalizado', // Já entra finalizado pois é um lançamento manual
              paymentMethod: 'conta_aberta', // Vai para a boleta
              deliveryMethod: 'manual',
              shippingPrice: 0,
              address: null,
              createdAt: serverTimestamp(),
              isPaid: false, // Entra na boleta como pendente (se for débito) ou crédito a abater
              isManual: true,
              contractUrl: contractUrl || null,
              description: manualObservation || (entryType === 'credit' ? 'Crédito/Abatimento' : 'Lançamento Manual')
          });
          alert("Lançamento realizado com sucesso!");
          setIsModalOpen(false);
          // Recarregar dados seria ideal, mas vamos apenas fechar por enquanto
      } catch (error) {
          console.error(error);
          alert("Erro ao lançar.");
      }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-pink-600"/></div>;

  return (
    <div className="pb-20">
        <h1 className="text-2xl font-bold mb-6">Meus Clientes ({customers.length})</h1>
        <div className="grid gap-4">
            {customers.map((customer) => (
                <div key={customer.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex flex-col md:flex-row justify-between md:items-center gap-4 ${customer.clientType === 'monthly' ? 'border-l-purple-600' : 'border-l-gray-300'}`}>
                    
                    {/* Info Cliente */}
                    <div className="flex items-center gap-4 min-w-[250px]">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl text-white ${customer.clientType === 'monthly' ? 'bg-purple-600' : 'bg-gray-400'}`}>
                            {customer.name ? customer.name.charAt(0).toUpperCase() : <User/>}
                        </div>
                        <div>
                            <div className="flex items-center gap-2"><p className="font-bold text-gray-800">{customer.name}</p>{customer.clientType === 'monthly' && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">MENSALISTA</span>}</div>
                            <div className="flex flex-col text-sm text-gray-500 mt-1">{customer.phone && <span className="flex items-center gap-1"><Phone size={12}/> {customer.phone}</span>}</div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-end">
                        <div className="w-full md:w-auto"><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Categoria</label><select className={`w-full md:w-40 p-2 rounded border text-sm font-bold outline-none ${customer.clientType === 'monthly' ? 'text-purple-700 bg-purple-50 border-purple-200' : 'text-gray-700'}`} value={customer.clientType} onChange={(e) => changeClientType(customer.id, e.target.value)}><option value="standard">🛒 Padrão</option><option value="monthly">🤝 Mensalista</option></select></div>
                        <div className="flex gap-6 w-full md:w-auto justify-around md:justify-start"><div className="text-center"><p className="text-[10px] font-bold text-gray-400 uppercase">Gasto Total</p><p className="font-bold text-green-600">{customer.totalSpent.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p></div></div>

                        <div className="flex gap-2">
                            {/* BOTÃO LANÇAR (NOVO) */}
                            {customer.clientType === 'monthly' && (
                                <button onClick={() => openEntryModal(customer)} className="p-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg border border-purple-200" title="Novo Lançamento / Encomenda">
                                    <PlusCircle size={20}/>
                                </button>
                            )}
                            
                            <Link href={`/admin/customers/${customer.id}/history`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200" title="Histórico"><FileText size={20}/></Link>
                            {customer.clientType === 'monthly' && (
                                <Link href={`/admin/customers/${customer.id}/invoice`} className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-200" title="Ver Boleta"><FileText size={20}/></Link>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* --- MODAL DE LANÇAMENTO MANUAL --- */}
        {isModalOpen && selectedCustomer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Lançamento Manual</h2>
                            <p className="text-sm text-gray-500">Cliente: {selectedCustomer.name}</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><PlusCircle className="rotate-45" size={24}/></button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {/* Tipo de Lançamento */}
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => setEntryType('debit')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${entryType === 'debit' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Débito / Encomenda (+)</button>
                            <button onClick={() => setEntryType('credit')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${entryType === 'credit' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Crédito / Abatimento (-)</button>
                        </div>

                        {/* Lista de Itens */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-700">Itens</h3>
                                <div className="flex gap-2">
                                    <button onClick={addCustomItem} className="text-xs bg-gray-200 px-3 py-1 rounded font-bold hover:bg-gray-300">+ Manual</button>
                                    <select className="text-xs bg-gray-200 px-3 py-1 rounded font-bold outline-none cursor-pointer hover:bg-gray-300 max-w-[150px]" onChange={(e) => { if(e.target.value){ addItem(e.target.value); e.target.value = ""; } }}>
                                        <option value="">+ Produto...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            {manualItems.length === 0 ? <p className="text-center text-gray-400 py-4 border-2 border-dashed rounded-lg text-sm">Nenhum item adicionado.</p> : (
                                manualItems.map((item, idx) => (
                                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                                        <div className="flex-1"><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-500">R$ {item.price.toFixed(2)}</p></div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => updateItemQty(idx, -1)} className="w-6 h-6 bg-white border rounded font-bold text-gray-600 hover:bg-gray-100">-</button>
                                            <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                                            <button onClick={() => updateItemQty(idx, 1)} className="w-6 h-6 bg-white border rounded font-bold text-gray-600 hover:bg-gray-100">+</button>
                                            <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 ml-2"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Upload Contrato */}
                        <div className="border-t pt-4">
                            <label className="font-bold text-sm mb-2 block flex items-center gap-2"><FileText size={16}/> Contrato / Comprovante (Opcional)</label>
                            <div className="flex items-center gap-3">
                                <button onClick={() => fileInputRef.current?.click()} className={`flex-1 border-2 border-dashed p-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition ${contractUrl ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                                    {uploading ? <Loader2 className="animate-spin"/> : contractUrl ? <><FileCheck size={18}/> Arquivo Anexado</> : <><Upload size={18}/> Enviar Foto</>}
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload}/>
                            </div>
                        </div>

                        {/* Observação */}
                        <div>
                            <label className="font-bold text-sm mb-1 block">Observação Interna</label>
                            <textarea className="w-full p-2 border rounded-lg text-sm bg-gray-50" rows={2} placeholder="Detalhes da troca ou festa..." value={manualObservation} onChange={e => setManualObservation(e.target.value)}/>
                        </div>
                    </div>

                    {/* Footer Totais */}
                    <div className="p-4 border-t bg-gray-50 flex justify-between items-center rounded-b-2xl">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Valor Final</p>
                            <p className={`text-xl font-bold ${entryType === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                {entryType === 'credit' ? '-' : ''} R$ {manualItems.reduce((a,b) => a + (b.price*b.quantity), 0).toFixed(2)}
                            </p>
                        </div>
                        <button onClick={handleSubmitEntry} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition">
                            Confirmar Lançamento
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}