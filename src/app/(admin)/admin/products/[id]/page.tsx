// src/app/(admin)/admin/products/[id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Save, Upload, Box, Layers, ExternalLink, X, Trash2, Pencil } from "lucide-react";
import { Product, ComplementGroup, Option } from "@/types";
import { getProductById, updateProduct, getProducts } from "@/services/productService";
import { getAllGroups, createGroup, updateGroup } from "@/services/complementService";

interface EditPageProps { params: Promise<{ id: string }>; }

export default function EditProductPage({ params }: EditPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Listas Gerais
  const [allMasterGroups, setAllMasterGroups] = useState<ComplementGroup[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  
  const [manageStock, setManageStock] = useState(false);
  const [formData, setFormData] = useState<Product>({
    id: "", name: "", description: "", basePrice: 0, imageUrl: "", category: "bolos", isAvailable: true, stock: null, complementGroupIds: []
  });

  // --- ESTADOS DO MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<ComplementGroup>>({
    title: "", required: false, maxSelection: 1, options: []
  });

  // 1. CARREGAR TUDO
  useEffect(() => {
    const init = async () => {
      try {
        const [groups, prods] = await Promise.all([getAllGroups(), getProducts()]);
        setAllMasterGroups(groups);
        setAllProducts(prods);

        if (id) {
          const p = await getProductById(id);
          if (p) {
            setFormData({ ...p, name: p.name || "", description: p.description || "", complementGroupIds: p.complementGroupIds || [] });
            setManageStock(p.stock !== null);
          }
        }
      } catch (error) { console.error(error); } 
      finally { setFetching(false); }
    };
    init();
  }, [id]);

  // 2. SALVAR PRODUTO
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, stock: manageStock ? (formData.stock ?? 0) : null };
      await updateProduct(id, payload);
      alert("Produto atualizado!");
      window.location.href = "/admin"; // Navegação segura
    } catch (error) { alert("Erro ao salvar."); } 
    finally { setLoading(false); }
  };

  // --- FUNÇÕES DO MODAL ---
  const handleOpenModal = (groupId?: string) => {
    if (groupId) {
        // Editar Existente
        const g = allMasterGroups.find(x => x.id === groupId);
        if (g) setEditingGroup(JSON.parse(JSON.stringify(g)));
    } else {
        // Criar Novo
        setEditingGroup({ title: "", required: false, maxSelection: 1, options: [] });
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!editingGroup.title) return alert("Título obrigatório");
    
    // Converte para o tipo correto
    const payload = {
        title: editingGroup.title,
        required: editingGroup.required || false,
        maxSelection: Number(editingGroup.maxSelection) || 1,
        options: editingGroup.options || []
    };

    try {
        let savedId = editingGroup.id;
        if (savedId) {
            await updateGroup(savedId, payload);
            // Atualiza lista local
            setAllMasterGroups(prev => prev.map(g => g.id === savedId ? { ...payload, id: savedId! } : g));
        } else {
            savedId = await createGroup(payload);
            const newG = { ...payload, id: savedId };
            setAllMasterGroups(prev => [...prev, newG]);
            // Já seleciona o novo grupo no produto
            setFormData(prev => ({ ...prev, complementGroupIds: [...prev.complementGroupIds, savedId!] }));
        }
        setIsModalOpen(false);
    } catch (e) { alert("Erro ao salvar grupo."); }
  };

  // Helpers do Modal
  const modalAddOption = (type: 'simple' | 'product', linkedId?: string) => {
    let newOpt: Option = { id: crypto.randomUUID(), name: "", priceAdd: 0, isAvailable: true, stock: null };
    if (type === 'product' && linkedId) {
        const p = allProducts.find(x => x.id === linkedId);
        if(p) newOpt = { ...newOpt, name: p.name, priceAdd: p.basePrice, linkedProductId: p.id, stock: null };
    }
    setEditingGroup(prev => ({ ...prev, options: [...(prev.options||[]), newOpt] }));
  };
  
  const modalUpdateOpt = (idx: number, field: keyof Option, val: any) => {
    const opts = [...(editingGroup.options || [])];
    opts[idx] = { ...opts[idx], [field]: val };
    setEditingGroup(prev => ({ ...prev, options: opts }));
  };

  const modalRemoveOpt = (idx: number) => {
     const opts = [...(editingGroup.options || [])];
     opts.splice(idx, 1);
     setEditingGroup(prev => ({ ...prev, options: opts }));
  };


  if (fetching) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 pt-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-bold">Editar Produto</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ESQUERDA */}
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded border space-y-6">
                <h2 className="font-bold border-b pb-2">Informações</h2>
                <input required className="w-full p-3 border rounded" placeholder="Nome" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="0.01" required className="w-full p-3 border rounded" placeholder="Preço" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})} />
                    <select className="w-full p-3 border rounded bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="bolos">Bolos</option><option value="doces">Doces</option><option value="salgados">Salgados</option><option value="bebidas">Bebidas</option></select>
                </div>
                <textarea rows={3} className="w-full p-3 border rounded" placeholder="Descrição" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                
                <div className="bg-gray-50 p-4 rounded border flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold"><Box size={16}/> Controlar Estoque?</label>
                    <div className="flex items-center gap-4">
                        <input type="checkbox" className="w-5 h-5" checked={manageStock} onChange={e => setManageStock(e.target.checked)}/>
                        {manageStock && <input type="number" className="w-20 p-2 border rounded" value={formData.stock ?? 0} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}/>}
                    </div>
                </div>
            </section>

            {/* SELEÇÃO DE GRUPOS */}
            <section className="bg-white p-6 rounded border">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="font-bold flex items-center gap-2"><Layers size={18} /> Complementos</h2>
                    <button type="button" onClick={() => handleOpenModal()} className="text-sm text-pink-600 font-bold hover:underline">+ Criar Novo Grupo</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allMasterGroups.map((group) => {
                        const isSelected = formData.complementGroupIds?.includes(group.id);
                        return (
                            <div key={group.id} className={`p-3 rounded border flex items-center gap-3 transition-all ${isSelected ? "border-pink-500 bg-pink-50" : "hover:border-gray-300"}`}>
                                <div onClick={() => {
                                    const curr = formData.complementGroupIds || [];
                                    const newIds = isSelected ? curr.filter(id => id !== group.id) : [...curr, group.id];
                                    setFormData({...formData, complementGroupIds: newIds});
                                }} className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${isSelected ? "bg-pink-600 border-pink-600 text-white" : "bg-white"}`}>
                                    {isSelected && <span className="text-xs">✓</span>}
                                </div>
                                <div className="flex-1 cursor-pointer" onClick={() => {
                                    const curr = formData.complementGroupIds || [];
                                    const newIds = isSelected ? curr.filter(id => id !== group.id) : [...curr, group.id];
                                    setFormData({...formData, complementGroupIds: newIds});
                                }}>
                                    <h3 className="font-bold text-sm">{group.title}</h3>
                                    <p className="text-xs text-gray-500">{group.options.length} opções</p>
                                </div>
                                
                                {/* AQUI ESTÁ A MUDANÇA: Abre o Modal em vez de Link */}
                                <button type="button" onClick={() => handleOpenModal(group.id)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar Itens">
                                    <Pencil size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>

        {/* DIREITA */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded border sticky top-6">
                <label className="block text-sm font-medium mb-3">Foto</label>
                <div className="aspect-square bg-gray-100 rounded border flex items-center justify-center overflow-hidden mb-4">
                    {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" onError={e => (e.target as any).style.display='none'}/> : <Upload className="text-gray-400"/>}
                </div>
                <input type="url" className="w-full p-2 text-sm border rounded mb-4" placeholder="URL da Imagem" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                
                <div className="flex justify-between items-center mb-6 bg-gray-50 p-3 rounded">
                    <span className="text-sm font-medium">Disponível?</span>
                    <button type="button" onClick={() => setFormData({...formData, isAvailable: !formData.isAvailable})} className={`w-12 h-6 rounded-full relative transition ${formData.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${formData.isAvailable ? 'left-7' : 'left-1'}`} /></button>
                </div>
                
                <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-3 rounded hover:bg-slate-800">{loading ? "Salvando..." : "Salvar Tudo"}</button>
            </div>
        </div>
      </form>

      {/* === MODAL DE EDIÇÃO DE GRUPO (EMBUTIDO NA PÁGINA) === */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold">{editingGroup.id ? "Editar Grupo" : "Criar Novo Grupo"}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold uppercase text-gray-500">Título</label>
                            <input autoFocus className="w-full p-2 border rounded font-bold" value={editingGroup.title} onChange={e => setEditingGroup({...editingGroup, title: e.target.value})} />
                        </div>
                        <div>
                             <label className="text-xs font-bold uppercase text-gray-500">Obrigatório</label>
                             <select className="w-full p-2 border rounded bg-white" value={editingGroup.required ? "true" : "false"} onChange={e => setEditingGroup({...editingGroup, required: e.target.value === "true"})}>
                                <option value="false">Opcional</option><option value="true">Sim</option>
                             </select>
                        </div>
                        <div>
                             <label className="text-xs font-bold uppercase text-gray-500">Máx. Seleção</label>
                             <input type="number" className="w-full p-2 border rounded" value={editingGroup.maxSelection} onChange={e => setEditingGroup({...editingGroup, maxSelection: parseInt(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold mb-2">Opções</h3>
                        <div className="space-y-2">
                            {editingGroup.options?.map((opt, idx) => {
                                const isLinked = !!opt.linkedProductId;
                                return (
                                    <div key={idx} className={`flex gap-2 items-center p-2 rounded border ${isLinked ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                                        <div className="flex-1">
                                            <input disabled={isLinked} placeholder="Nome" className="w-full p-1 bg-transparent border-b border-dashed outline-none" value={opt.name} onChange={e => modalUpdateOpt(idx, 'name', e.target.value)} />
                                            {isLinked && <span className="text-[10px] text-blue-600 font-bold">🔗 Vinculado</span>}
                                        </div>
                                        <input type="number" className="w-20 p-1 border rounded text-right" value={opt.priceAdd} onChange={e => modalUpdateOpt(idx, 'priceAdd', parseFloat(e.target.value))} />
                                        {!isLinked && <input type="number" placeholder="∞" className="w-16 p-1 border rounded text-center" value={opt.stock ?? ''} onChange={e => modalUpdateOpt(idx, 'stock', e.target.value ? parseInt(e.target.value) : null)} />}
                                        <button onClick={() => modalRemoveOpt(idx)} className="text-red-500 p-1"><Trash2 size={16}/></button>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                            <button onClick={() => modalAddOption('simple')} className="px-3 py-1 border rounded hover:bg-gray-100 text-sm">+ Item Simples</button>
                            <select className="px-3 py-1 border rounded bg-white text-blue-600 text-sm outline-none" onChange={e => { if(e.target.value) { modalAddOption('product', e.target.value); e.target.value=""; }}}>
                                <option value="">+ Vincular Produto...</option>
                                {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button onClick={handleSaveModal} className="px-6 py-2 bg-slate-900 text-white rounded font-bold hover:bg-slate-800">Salvar Grupo</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}