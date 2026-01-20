// src/app/(admin)/admin/products/[id]/page.tsx
"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Save, Upload, Box, Layers, Pencil, Eye, X, Trash2, Loader2, Star, Store } from "lucide-react";
import { Product, ComplementGroup, Option, Category, SalesChannel } from "@/types";
import { getProductById, updateProduct, getProducts } from "@/services/productService";
import { getAllGroups, createGroup, updateGroup } from "@/services/complementService";
import { uploadImage } from "@/services/uploadService"; // ImgBB
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

interface EditPageProps { params: Promise<{ id: string }>; }

export default function EditProductPage({ params }: EditPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Estados Upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allMasterGroups, setAllMasterGroups] = useState<ComplementGroup[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [manageStock, setManageStock] = useState(false);
  
  const [formData, setFormData] = useState<Product>({
    id: "", name: "", description: "", 
    basePrice: 0, pricePostpaid: 0, priceReseller: 0, 
    imageUrl: "", category: "", 
    isAvailable: true, availableStandard: true, availablePostpaid: true, availableReseller: true,
    stock: null, complementGroupIds: [],
    salesChannel: 'delivery',
    isFeatured: false
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<ComplementGroup>>({
    title: "", required: false, maxSelection: 1, options: []
  });

  const isShowcase = formData.salesChannel === 'encomenda' || formData.salesChannel === 'evento';

  useEffect(() => {
    const init = async () => {
      try {
        const [groups, prods, catsSnap] = await Promise.all([
            getAllGroups(), 
            getProducts(),
            getDocs(query(collection(db, "categories"), orderBy("order")))
        ]);
        
        setAllMasterGroups(groups);
        setAllProducts(prods);
        setCategories(catsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));

        if (id) {
          const p = await getProductById(id);
          if (p) {
            setFormData({ 
                ...p, 
                name: p.name || "", 
                description: p.description || "", 
                complementGroupIds: p.complementGroupIds || [],
                availableStandard: p.availableStandard !== false, 
                availablePostpaid: p.availablePostpaid !== false,
                availableReseller: p.availableReseller !== false,
                pricePostpaid: p.pricePostpaid || 0,
                priceReseller: p.priceReseller || 0,
                category: p.category || "",
                salesChannel: p.salesChannel || 'delivery',
                isFeatured: p.isFeatured || false
            });
            setManageStock(p.stock !== null);
          }
        }
      } catch (error) { console.error(error); } 
      finally { setFetching(false); }
    };
    init();
  }, [id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        setUploading(true);
        const url = await uploadImage(file);
        setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (error) { alert("Erro no upload."); } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalCategory = formData.category || (categories.length > 0 ? categories[0].id : "geral");
      
      const payload = { 
          ...formData, 
          category: finalCategory,
          priceReseller: Number(formData.priceReseller) || 0,
          stock: (isShowcase || !manageStock) ? null : (formData.stock ?? 0)
      };
      
      await updateProduct(id, payload);
      alert("Produto atualizado!");
      window.location.href = "/admin"; 
    } catch (error) { alert("Erro ao salvar."); } 
    finally { setLoading(false); }
  };

  const handleOpenModal = (groupId?: string) => {
    if (groupId) {
        const g = allMasterGroups.find(x => x.id === groupId);
        if (g) setEditingGroup(JSON.parse(JSON.stringify(g)));
    } else {
        setEditingGroup({ title: "", required: false, maxSelection: 1, options: [] });
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!editingGroup.title) return alert("Título obrigatório");
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
            setAllMasterGroups(prev => prev.map(g => g.id === savedId ? { ...payload, id: savedId! } : g));
        } else {
            savedId = await createGroup(payload);
            const newG = { ...payload, id: savedId };
            setAllMasterGroups(prev => [...prev, newG]);
            setFormData(prev => ({ ...prev, complementGroupIds: [...prev.complementGroupIds, savedId!] }));
        }
        setIsModalOpen(false);
    } catch (e) { alert("Erro ao salvar grupo."); }
  };

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

  if (fetching) return <div className="p-10 text-center"><Loader2 className="animate-spin inline-block mr-2"/> Carregando dados...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 pt-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-bold">Editar Produto</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded border space-y-6">
                <div className="flex justify-between items-start">
                    <h2 className="font-bold border-b pb-2 flex-1">Dados Básicos</h2>
                    <label className="flex items-center gap-2 text-sm font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded cursor-pointer border border-yellow-200 hover:bg-yellow-100 select-none">
                        <input type="checkbox" className="w-4 h-4 text-yellow-600 rounded" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} /> 
                        <Star size={16} fill="currentColor"/> Destaque
                    </label>
                </div>

                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <label className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2"><Store size={16}/> Canal de Venda</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[{id: 'delivery', label: 'Delivery'}, {id: 'encomenda', label: 'Encomenda'}, {id: 'evento', label: 'Evento'}].map(opt => (
                            <button type="button" key={opt.id} onClick={() => setFormData({...formData, salesChannel: opt.id as SalesChannel})} className={`py-2 px-1 text-xs font-bold rounded border ${formData.salesChannel === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>{opt.label}</button>
                        ))}
                    </div>
                </div>

                <input required className="w-full p-3 border rounded" placeholder="Nome" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                
                {!isShowcase && (
                    <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded border">
                        <div>
                            <label className="text-xs font-bold text-green-700 uppercase mb-1 block">R$ Padrão</label>
                            <input type="number" step="0.01" required className="w-full p-3 border rounded border-green-200" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-purple-700 uppercase mb-1 block">R$ Mensalista</label>
                            <input type="number" step="0.01" className="w-full p-3 border rounded border-purple-200" placeholder="Opcional" value={formData.pricePostpaid || ''} onChange={e => setFormData({...formData, pricePostpaid: parseFloat(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-orange-700 uppercase mb-1 block">R$ Revenda</label>
                            <input type="number" step="0.01" className="w-full p-3 border rounded border-orange-200" placeholder="Opcional" value={formData.priceReseller || ''} onChange={e => setFormData({...formData, priceReseller: parseFloat(e.target.value)})} />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Categoria</label>
                        <select className="w-full p-3 border rounded bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                            {categories.length === 0 ? <option value="">Carregando...</option> : categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                </div>
                <textarea rows={3} className="w-full p-3 border rounded" placeholder="Descrição" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                
                <div className="bg-white border p-4 rounded flex flex-col gap-2">
                    <span className="text-sm font-bold flex items-center gap-2 text-gray-700"><Eye size={16}/> Visibilidade por Cliente</span>
                    <div className="flex gap-4 flex-wrap">
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none"><input type="checkbox" className="w-4 h-4 text-green-600 rounded" checked={formData.availableStandard} onChange={e => setFormData({...formData, availableStandard: e.target.checked})} /> Padrão</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none"><input type="checkbox" className="w-4 h-4 text-purple-600 rounded" checked={formData.availablePostpaid} onChange={e => setFormData({...formData, availablePostpaid: e.target.checked})} /> Mensalista</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none"><input type="checkbox" className="w-4 h-4 text-orange-600 rounded" checked={formData.availableReseller} onChange={e => setFormData({...formData, availableReseller: e.target.checked})} /> Revenda</label>
                    </div>
                </div>

                {!isShowcase && (
                    <div className="bg-gray-50 p-4 rounded border flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-bold"><Box size={16}/> Controlar Estoque?</label>
                        <div className="flex items-center gap-4">
                            <input type="checkbox" className="w-5 h-5" checked={manageStock} onChange={e => setManageStock(e.target.checked)}/>
                            {manageStock && <input type="number" className="w-20 p-2 border rounded" value={formData.stock ?? 0} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}/>}
                        </div>
                    </div>
                )}
            </section>

            {!isShowcase && (
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
                                    <div className="flex-1 cursor-pointer">
                                        <h3 className="font-bold text-sm">{group.title}</h3>
                                        <p className="text-xs text-gray-500">{group.options.length} opções</p>
                                    </div>
                                    <button type="button" onClick={() => handleOpenModal(group.id)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar Itens"><Pencil size={14} /></button>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>

        <div className="space-y-6">
            <div className="bg-white p-6 rounded border sticky top-6">
                <label className="block text-sm font-medium mb-3">Foto</label>
                <div className="aspect-square bg-gray-100 rounded border flex items-center justify-center overflow-hidden mb-4 cursor-pointer relative group" onClick={() => fileInputRef.current?.click()}>
                    {uploading ? <div className="flex flex-col items-center text-pink-600"><Loader2 className="animate-spin mb-2"/> Enviando...</div> : 
                     formData.imageUrl ? <><img src={formData.imageUrl} className="w-full h-full object-cover" onError={e => (e.target as any).style.display='none'}/><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition">Trocar Foto</div></> : 
                     <div className="flex flex-col items-center text-gray-400"><Upload size={32}/><span className="text-xs mt-2">Clique para enviar</span></div>
                    }
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                <div className="flex justify-between items-center mb-6 bg-gray-50 p-3 rounded">
                    <span className="text-sm font-medium">Produto Ativo?</span>
                    <button type="button" onClick={() => setFormData({...formData, isAvailable: !formData.isAvailable})} className={`w-12 h-6 rounded-full relative transition ${formData.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${formData.isAvailable ? 'left-7' : 'left-1'}`} /></button>
                </div>
                <button type="submit" disabled={loading || uploading} className="w-full bg-slate-900 text-white font-bold py-3 rounded hover:bg-slate-800">{loading ? "Salvando..." : "Salvar Tudo"}</button>
            </div>
        </div>
      </form>

      {/* MODAL GRUPOS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold">{editingGroup.id ? "Editar Grupo" : "Criar Novo Grupo"}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                        <div className="md:col-span-2"><label className="text-xs font-bold uppercase text-gray-500">Título</label><input autoFocus className="w-full p-2 border rounded font-bold" value={editingGroup.title} onChange={e => setEditingGroup({...editingGroup, title: e.target.value})} /></div>
                        <div><label className="text-xs font-bold uppercase text-gray-500">Obrigatório</label><select className="w-full p-2 border rounded bg-white" value={editingGroup.required ? "true" : "false"} onChange={e => setEditingGroup({...editingGroup, required: e.target.value === "true"})}><option value="false">Opcional</option><option value="true">Sim</option></select></div>
                        <div><label className="text-xs font-bold uppercase text-gray-500">Máx. Seleção</label><input type="number" className="w-full p-2 border rounded" value={editingGroup.maxSelection} onChange={e => setEditingGroup({...editingGroup, maxSelection: parseInt(e.target.value)})} /></div>
                    </div>
                    <div>
                        <h3 className="font-bold mb-2">Opções</h3>
                        <div className="space-y-2">
                            {editingGroup.options?.map((opt, idx) => {
                                const isLinked = !!opt.linkedProductId;
                                return (
                                    <div key={idx} className={`flex gap-2 items-center p-2 rounded border ${isLinked ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                                        <div className="flex-1"><input disabled={isLinked} placeholder="Nome" className="w-full p-1 bg-transparent border-b border-dashed outline-none" value={opt.name} onChange={e => modalUpdateOpt(idx, 'name', e.target.value)} />{isLinked && <span className="text-[10px] text-blue-600 font-bold">🔗 Vinculado</span>}</div>
                                        <div className="w-20"><input type="number" className="w-full p-1 border rounded text-right text-xs" value={opt.priceAdd} onChange={e => modalUpdateOpt(idx, 'priceAdd', parseFloat(e.target.value))} /></div>
                                        <div className="w-20"><input type="number" className="w-full p-1 border rounded text-right text-xs" value={opt.priceAddPostpaid ?? opt.priceAdd} onChange={e => modalUpdateOpt(idx, 'priceAddPostpaid', parseFloat(e.target.value))} /></div>
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