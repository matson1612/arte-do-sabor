// src/app/(admin)/admin/products/new/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload, Box, Layers, Loader2, Store } from "lucide-react";
import { Product, ComplementGroup, SalesChannel } from "@/types";
import { createProduct } from "@/services/productService";
import { getAllGroups, createGroup } from "@/services/complementService";
import { uploadImage } from "@/services/uploadService"; // Usa o ImgBB

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [allMasterGroups, setAllMasterGroups] = useState<ComplementGroup[]>([]);
  const [manageStock, setManageStock] = useState(false);

  // Estados para Upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: "", description: "", 
    basePrice: 0, pricePostpaid: 0, 
    imageUrl: "", category: "bolos", 
    isAvailable: true, availableStandard: true, availablePostpaid: true,
    stock: null, complementGroupIds: [],
    salesChannel: 'delivery' // Padrão
  });

  useEffect(() => {
    getAllGroups().then(setAllMasterGroups).catch(console.error);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Apenas imagens são permitidas.");
    if (file.size > 10 * 1024 * 1024) return alert("A imagem deve ter menos de 10MB.");

    try {
        setUploading(true);
        const url = await uploadImage(file);
        setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (error) {
        console.error(error);
        alert("Erro ao enviar imagem.");
    } finally {
        setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const payload = {
        name: formData.name!,
        description: formData.description || "",
        basePrice: Number(formData.basePrice) || 0,
        pricePostpaid: Number(formData.pricePostpaid) || 0,
        imageUrl: formData.imageUrl || "",
        category: formData.category || "bolos",
        isAvailable: formData.isAvailable ?? true,
        availableStandard: formData.availableStandard ?? true,
        availablePostpaid: formData.availablePostpaid ?? true,
        stock: manageStock ? (Number(formData.stock) || 0) : null,
        complementGroupIds: formData.complementGroupIds || [],
        salesChannel: formData.salesChannel || 'delivery'
      };

      await createProduct(payload);
      router.push("/admin"); 

    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
      setLoading(false);
    }
  };

  const quickGroup = async () => {
    const name = prompt("Nome do Grupo:");
    if (!name) return;
    try {
        const id = await createGroup({ title: name, required: false, maxSelection: 1, options: [] });
        const newG = { id, title: name, required: false, maxSelection: 1, options: [] };
        setAllMasterGroups([...allMasterGroups, newG]);
        setFormData(p => ({ ...p, complementGroupIds: [...(p.complementGroupIds||[]), id] }));
    } catch(e) { alert("Erro ao criar grupo."); }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 pt-6 px-4">
      <div className="flex items-center gap-4 mb-6"><button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button><h1 className="text-2xl font-bold">Novo Produto</h1></div>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ESQUERDA - DADOS */}
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded border space-y-6">
                <h2 className="font-bold border-b pb-2">Dados</h2>
                <input placeholder="Nome do Produto" required className="w-full p-3 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                
                {/* SELETOR DE CANAL (NOVO) */}
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <label className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2"><Store size={16}/> Onde exibir este produto?</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            {id: 'delivery', label: 'Delivery (Carrinho)'}, 
                            {id: 'encomenda', label: 'Sob Encomenda (Vitrine)'}, 
                            {id: 'evento', label: 'Eventos (Vitrine)'}
                        ].map(opt => (
                            <button type="button" key={opt.id} onClick={() => setFormData({...formData, salesChannel: opt.id as SalesChannel})} className={`py-2 px-1 text-xs font-bold rounded border ${formData.salesChannel === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-blue-600 mt-2">
                        {formData.salesChannel === 'delivery' && "Aparece na tela inicial. Cliente pode comprar na hora."}
                        {formData.salesChannel === 'encomenda' && "Aparece na aba Encomendas. Botão leva para o WhatsApp."}
                        {formData.salesChannel === 'evento' && "Aparece na aba Datas Especiais. Botão leva para o WhatsApp."}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border">
                    <div>
                        <label className="text-xs font-bold text-green-700 uppercase mb-1 block">R$ À Vista</label>
                        <input type="number" step="0.01" placeholder="0.00" required className="w-full p-3 border rounded border-green-200" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})}/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-purple-700 uppercase mb-1 block">R$ Mensalista</label>
                        <input type="number" step="0.01" placeholder="Igual se vazio" className="w-full p-3 border rounded border-purple-200" value={formData.pricePostpaid || ''} onChange={e => setFormData({...formData, pricePostpaid: parseFloat(e.target.value)})}/>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <select className="w-full p-3 border rounded bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="bolos">Bolos</option><option value="doces">Doces</option><option value="salgados">Salgados</option><option value="bebidas">Bebidas</option></select>
                </div>
                <textarea rows={3} placeholder="Descrição" className="w-full p-3 border rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}/>
                
                {/* Se for Delivery, mostra opções de Estoque */}
                {formData.salesChannel === 'delivery' && (
                    <div className="bg-gray-50 p-4 rounded border flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-bold"><Box size={16}/> Controlar Estoque?</label>
                        <div className="flex items-center gap-4">
                            <input type="checkbox" className="w-5 h-5" checked={manageStock} onChange={e => setManageStock(e.target.checked)}/>
                            {manageStock && <input type="number" className="w-20 p-2 border rounded" value={formData.stock ?? 0} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}/>}
                        </div>
                    </div>
                )}
            </section>

            {/* Complementos apenas para Delivery */}
            {formData.salesChannel === 'delivery' && (
                <section className="bg-white p-6 rounded border">
                    <div className="flex justify-between mb-4"><h2 className="font-bold flex gap-2"><Layers/> Complementos</h2><button type="button" onClick={quickGroup} className="text-pink-600 font-bold text-sm">+ Criar Rápido</button></div>
                    {allMasterGroups.length === 0 ? <p className="text-gray-400 text-center">Sem grupos.</p> : 
                        <div className="grid md:grid-cols-2 gap-3">
                            {allMasterGroups.map(g => {
                                const sel = formData.complementGroupIds?.includes(g.id);
                                return <div key={g.id} onClick={() => {
                                    const curr = formData.complementGroupIds || [];
                                    setFormData({...formData, complementGroupIds: sel ? curr.filter(i => i !== g.id) : [...curr, g.id]});
                                }} className={`p-3 border rounded cursor-pointer flex gap-3 items-center ${sel ? 'border-pink-500 bg-pink-50' : ''}`}>
                                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${sel ? 'bg-pink-600 border-pink-600 text-white' : 'bg-white'}`}>{sel && "✓"}</div>
                                    <div className="flex-1"><div className="font-bold text-sm">{g.title}</div></div>
                                </div>
                            })}
                        </div>
                    }
                </section>
            )}
        </div>

        {/* DIREITA - UPLOAD DE IMAGEM */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded border sticky top-6">
                <label className="block text-sm font-medium mb-3">Foto do Produto</label>
                
                <div 
                    className="aspect-square bg-gray-100 rounded border flex items-center justify-center overflow-hidden mb-4 cursor-pointer relative group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {uploading ? (
                        <div className="flex flex-col items-center text-pink-600">
                            <Loader2 className="animate-spin mb-2"/> Enviando...
                        </div>
                    ) : formData.imageUrl ? (
                        <>
                            <img src={formData.imageUrl} className="w-full h-full object-cover" onError={e => (e.target as any).style.display='none'}/>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition">Trocar Foto</div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center text-gray-400 group-hover:text-pink-500">
                            <Upload size={32}/>
                            <span className="text-xs mt-2">Clique para enviar</span>
                        </div>
                    )}
                </div>

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

                <div className="relative mb-4">
                    <span className="text-[10px] bg-white px-1 absolute -top-2 left-2 text-gray-400 uppercase font-bold">Ou URL</span>
                    <input placeholder="https://..." className="w-full p-2 border rounded text-xs" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})}/>
                </div>

                <button type="submit" disabled={loading || uploading} className="w-full bg-slate-900 text-white font-bold py-3 rounded hover:bg-slate-800 disabled:opacity-50">
                    {loading ? "Criando..." : "Salvar Produto"}
                </button>
            </div>
        </div>
      </form>
    </div>
  );
}