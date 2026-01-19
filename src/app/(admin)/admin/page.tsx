// src/app/(admin)/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { 
  Plus, Pencil, Trash2, Loader2, ImageOff, Box, Layers, X, Save, Search, 
  ShoppingBag, Gift, Calendar, Star, List 
} from "lucide-react";
import { Product, ComplementGroup, Option, SalesChannel, Category } from "@/types";
import { getProducts, deleteProduct, updateProductField } from "@/services/productService";
import { getAllGroups, deleteGroup, createGroup, updateGroup } from "@/services/complementService";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'products' | 'complements'>('products');
  const [productTab, setProductTab] = useState<SalesChannel>('delivery');
  const [loading, setLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ComplementGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // Lista de categorias

  // Estados Modal Complementos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<ComplementGroup>>({
    title: "", required: false, maxSelection: 1, options: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [p, g, c] = await Promise.all([
          getProducts(), 
          getAllGroups(),
          getDocs(query(collection(db, "categories"), orderBy("order")))
      ]);
      setProducts(p);
      setGroups(g);
      setCategories(c.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const toggleStatus = async (p: Product) => { const ns = !p.isAvailable; setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isAvailable: ns } : x)); await updateProductField(p.id, { isAvailable: ns }); };
  const toggleFeatured = async (p: Product) => { const ns = !p.isFeatured; setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isFeatured: ns } : x)); await updateProductField(p.id, { isFeatured: ns }); };
  const updateStock = async (id: string, val: string) => { const n = parseInt(val); if(!isNaN(n)) await updateProductField(id, { stock: n }); };
  const delProd = async (id: string) => { if (confirm("Excluir produto?")) { setProducts(prev => prev.filter(p => p.id !== id)); await deleteProduct(id); } };

  // --- AGRUPAMENTO POR CATEGORIA ---
  const filteredProducts = products.filter(p => (p.salesChannel || 'delivery') === productTab);
  
  const groupedProducts: Record<string, Product[]> = {};
  categories.forEach(cat => groupedProducts[cat.id] = []);
  groupedProducts['uncategorized'] = [];

  filteredProducts.forEach(p => {
      const catId = p.category || 'uncategorized';
      if (groupedProducts[catId]) {
          groupedProducts[catId].push(p);
      } else {
          groupedProducts['uncategorized'].push(p);
      }
  });

  // Funções de Complementos (Mantidas com correção de Link)
  const openNewGroupModal = () => { setEditingGroup({ title: "", required: false, maxSelection: 1, options: [] }); setIsModalOpen(true); };
  const openEditGroupModal = (group: ComplementGroup) => { setEditingGroup(JSON.parse(JSON.stringify(group))); setIsModalOpen(true); };
  const handleSaveGroup = async (e: React.FormEvent) => { e.preventDefault(); if (!editingGroup.title) return alert("Título?"); try { const payload = { title: editingGroup.title, required: editingGroup.required || false, maxSelection: Number(editingGroup.maxSelection) || 1, options: editingGroup.options || [] }; if (editingGroup.id) { await updateGroup(editingGroup.id, payload); setGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...payload, id: editingGroup.id! } : g)); } else { const newId = await createGroup(payload); setGroups(prev => [...prev, { ...payload, id: newId }]); } setIsModalOpen(false); } catch (error) { alert("Erro"); } };
  const delGroup = async (id: string) => { if (confirm("Excluir?")) { setGroups(prev => prev.filter(g => g.id !== id)); await deleteGroup(id); } };
  const addOptionToGroup = (type: 'simple' | 'product', linkedId?: string) => { const currentOptions = editingGroup.options || []; let newOpt: Option = { id: crypto.randomUUID(), name: "", priceAdd: 0, isAvailable: true, stock: null }; if (type === 'product' && linkedId) { const p = products.find(x => x.id === linkedId); if (p) newOpt = { ...newOpt, name: p.name, priceAdd: p.basePrice, linkedProductId: p.id, stock: null }; } setEditingGroup({ ...editingGroup, options: [...currentOptions, newOpt] }); };
  const removeOptionFromGroup = (idx: number) => { const opts = [...(editingGroup.options || [])]; opts.splice(idx, 1); setEditingGroup({ ...editingGroup, options: opts }); };
  const updateOption = (idx: number, field: keyof Option, val: any) => { const opts = [...(editingGroup.options || [])]; opts[idx] = { ...opts[idx], [field]: val }; setEditingGroup({ ...editingGroup, options: opts }); };

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Painel Admin</h1>
        <div className="flex gap-2">
            <Link href="/admin/categories" className="bg-white border text-slate-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition shadow-sm">
                <List size={20}/> Categorias
            </Link>
            <div className="bg-white p-1 rounded-lg border flex shadow-sm">
                <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'products' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>Produtos</button>
                <button onClick={() => setActiveTab('complements')} className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'complements' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>Complementos</button>
            </div>
        </div>
      </div>

      {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-pink-600"/></div> : (
        <>
            {activeTab === 'products' && (
                <div>
                    <div className="flex gap-2 mb-6 border-b border-gray-200 pb-1 overflow-x-auto">
                        {[{id:'delivery', icon:ShoppingBag, label:'Delivery'},{id:'encomenda', icon:Gift, label:'Encomendas'},{id:'evento', icon:Calendar, label:'Eventos'}].map((t:any) => (
                            <button key={t.id} onClick={() => setProductTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 font-bold text-sm transition-colors whitespace-nowrap ${productTab === t.id ? 'border-pink-600 text-pink-600 bg-pink-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><t.icon size={16}/> {t.label}</button>
                        ))}
                    </div>

                    <div className="flex justify-end mb-4"><Link href="/admin/products/new" className="bg-pink-600 text-white px-4 py-2 rounded-lg font-bold flex gap-2 hover:bg-pink-700 transition shadow-sm"><Plus/> Novo Produto</Link></div>
                    
                    <div className="space-y-8">
                        {[...categories, { id: 'uncategorized', name: 'Sem Categoria', order: 999 }].map(cat => {
                            const items = groupedProducts[cat.id];
                            if (!items || items.length === 0) return null;

                            return (
                                <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <div className="bg-gray-50 p-3 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider">{cat.name}</h3>
                                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border text-gray-400">{items.length} itens</span>
                                    </div>
                                    <table className="w-full text-left">
                                        <tbody className="divide-y divide-gray-100">
                                            {items.map(p => (
                                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 w-12"><button onClick={() => toggleFeatured(p)} className={`p-2 rounded-full transition-all ${p.isFeatured ? 'text-yellow-500' : 'text-gray-200 hover:text-yellow-400'}`}><Star size={18} fill="currentColor"/></button></td>
                                                    <td className="p-4 flex gap-3 items-center">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border">{p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover"/> : <ImageOff size={14} className="m-auto text-gray-400"/>}</div>
                                                        <div><div className="font-bold text-slate-800 text-sm">{p.name}</div><div className="text-xs text-gray-500">R$ {p.basePrice?.toFixed(2)}</div></div>
                                                    </td>
                                                    <td className="p-4 text-center w-24"><button onClick={() => toggleStatus(p)} className={`w-8 h-4 rounded-full relative transition-colors ${p.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${p.isAvailable ? 'left-4.5' : 'left-0.5'}`} /></button></td>
                                                    <td className="p-4 w-24">{p.stock === null ? <span className="text-green-600 font-bold text-[10px] bg-green-50 px-2 py-1 rounded">Livre</span> : (<div className="flex items-center border rounded px-1 bg-white"><Box size={10} className="text-gray-400 mr-1"/><input type="number" defaultValue={p.stock} onBlur={e => updateStock(p.id, e.target.value)} className="w-full text-xs outline-none bg-transparent font-medium"/></div>)}</td>
                                                    <td className="p-4 text-right w-24 space-x-1 flex justify-end"><Link href={`/admin/products/${p.id}`} className="text-blue-600 p-1.5 hover:bg-blue-50 rounded"><Pencil size={16}/></Link><button onClick={() => delProd(p.id)} className="text-red-500 p-1.5 hover:bg-red-50 rounded"><Trash2 size={16}/></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                        {filteredProducts.length === 0 && <div className="text-center py-10 text-gray-400">Nenhum produto encontrado nesta aba.</div>}
                    </div>
                </div>
            )}

            {activeTab === 'complements' && (
                <div><div className="flex justify-end mb-4"><button onClick={openNewGroupModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex gap-2 hover:bg-blue-700 transition shadow-sm"><Plus/> Novo Grupo</button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{groups.map(g => (<div key={g.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm group hover:border-blue-300 transition"><div className="flex justify-between mb-2"><h3 className="font-bold text-gray-800">{g.title}</h3><div className="flex gap-1 opacity-60 group-hover:opacity-100 transition"><button onClick={() => openEditGroupModal(g)} className="text-blue-600 p-1 hover:bg-blue-50 rounded"><Pencil size={16}/></button><button onClick={() => delGroup(g.id)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button></div></div><div className="text-xs text-gray-500 flex justify-between border-b pb-2 mb-2"><span>{g.options.length} opções</span><span className={g.required ? "text-red-500 font-bold" : "text-green-600 font-bold"}>{g.required ? 'Obrigatório' : 'Opcional'}</span></div><div className="flex flex-wrap gap-1">{g.options.slice(0, 3).map(o => (<span key={o.id} className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-600">{o.name}</span>))}{g.options.length > 3 && <span className="text-[10px] text-gray-400 px-1 py-1">+{g.options.length - 3}</span>}</div></div>))}</div></div>
            )}
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in"><div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col"><div className="flex justify-between items-center p-4 border-b"><h2 className="text-lg font-bold">{editingGroup.id ? "Editar Grupo" : "Novo Grupo"}</h2><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button></div><div className="flex-1 overflow-y-auto p-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg"><div className="md:col-span-2"><label className="text-xs font-bold uppercase text-gray-500">Título</label><input autoFocus type="text" className="w-full p-2 border rounded font-bold" placeholder="Ex: Escolha a Borda" value={editingGroup.title} onChange={e => setEditingGroup({...editingGroup, title: e.target.value})} /></div><div><label className="text-xs font-bold uppercase text-gray-500">Obrigatório?</label><select className="w-full p-2 border rounded bg-white" value={editingGroup.required ? "true" : "false"} onChange={e => setEditingGroup({...editingGroup, required: e.target.value === "true"})}><option value="false">Opcional</option><option value="true">Sim</option></select></div><div><label className="text-xs font-bold uppercase text-gray-500">Máx. Seleção</label><input type="number" min="1" className="w-full p-2 border rounded" value={editingGroup.maxSelection} onChange={e => setEditingGroup({...editingGroup, maxSelection: parseInt(e.target.value)})} /></div></div><div><h3 className="font-bold mb-2 flex items-center gap-2"><Layers size={16}/> Opções ({editingGroup.options?.length})</h3><div className="space-y-2">{editingGroup.options?.map((opt, idx) => { const isLinked = !!opt.linkedProductId; return (<div key={idx} className={`flex gap-2 items-center p-2 rounded border ${isLinked ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}><div className="flex-1"><input disabled={isLinked} placeholder="Nome" className="w-full p-1 bg-transparent border-b border-dashed text-sm font-medium focus:outline-none" value={opt.name} onChange={e => updateOption(idx, 'name', e.target.value)} />{isLinked && <span className="text-[10px] text-blue-600 font-bold">🔗 Vinculado</span>}</div><div className="w-20"><input type="number" placeholder="R$" className="w-full p-1 border rounded text-sm text-right" value={opt.priceAdd} onChange={e => updateOption(idx, 'priceAdd', parseFloat(e.target.value))} /></div>{!isLinked && (<div className="w-16"><input type="number" placeholder="∞" className="w-full p-1 border rounded text-sm text-center" value={opt.stock ?? ''} onChange={e => updateOption(idx, 'stock', e.target.value ? parseInt(e.target.value) : null)} /></div>)}<button onClick={() => removeOptionFromGroup(idx)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button></div>); })}</div></div></div><div className="p-4 border-t bg-gray-50 flex flex-col md:flex-row gap-3 justify-between items-center"><div className="flex gap-2 w-full md:w-auto"><button onClick={() => addOptionToGroup('simple')} className="flex-1 md:flex-none px-3 py-2 border bg-white rounded text-sm font-medium hover:bg-gray-100">+ Simples</button><select className="flex-1 md:flex-none px-3 py-2 border bg-white rounded text-sm font-medium hover:bg-blue-50 text-blue-600 outline-none cursor-pointer" onChange={(e) => { if(e.target.value) { addOptionToGroup('product', e.target.value); e.target.value = ""; } }}><option value="">+ Vincular...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><button onClick={handleSaveGroup} className="w-full md:w-auto px-6 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 flex items-center justify-center gap-2"><Save size={18}/> Salvar</button></div></div></div>
      )}
    </div>
  );
}