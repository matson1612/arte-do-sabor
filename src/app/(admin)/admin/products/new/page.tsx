// src/app/(admin)/admin/products/new/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Box, Layers, Loader2, Store, Video, Image as ImageIcon, X, Star } from "lucide-react";
import { Product, ComplementGroup, SalesChannel } from "@/types";
import { createProduct } from "@/services/productService";
import { getAllGroups, createGroup } from "@/services/complementService";
import { uploadImage } from "@/services/uploadService";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [allMasterGroups, setAllMasterGroups] = useState<ComplementGroup[]>([]);
  const [manageStock, setManageStock] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: "", description: "", 
    basePrice: 0, pricePostpaid: 0, 
    imageUrl: "", category: "bolos", 
    isAvailable: true, availableStandard: true, availablePostpaid: true,
    stock: null, complementGroupIds: [],
    salesChannel: 'delivery',
    gallery: [], videoUrl: "", isFeatured: false
  });

  // Helper para saber se é produto de vitrine (sem preço/estoque)
  const isShowcase = formData.salesChannel === 'encomenda' || formData.salesChannel === 'evento';

  useEffect(() => { getAllGroups().then(setAllMasterGroups).catch(console.error); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { setUploading(true); const url = await uploadImage(file); setFormData(p => ({ ...p, imageUrl: url })); } 
    catch (e) { alert("Erro ao enviar imagem."); } finally { setUploading(false); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files; if (!files?.length) return;
      setGalleryUploading(true);
      try {
          const newUrls = [];
          for (let i = 0; i < files.length; i++) newUrls.push(await uploadImage(files[i]));
          setFormData(p => ({ ...p, gallery: [...(p.gallery||[]), ...newUrls] }));
      } catch (e) { alert("Erro galeria"); } finally { setGalleryUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const payload = {
        name: formData.name!,
        description: formData.description || "",
        // Se for vitrine, zera os preços
        basePrice: isShowcase ? 0 : (Number(formData.basePrice) || 0),
        pricePostpaid: isShowcase ? 0 : (Number(formData.pricePostpaid) || 0),
        imageUrl: formData.imageUrl || "",
        category: formData.category || "bolos",
        isAvailable: formData.isAvailable ?? true,
        availableStandard: true,
        availablePostpaid: true,
        // Se for vitrine, sem estoque e sem complementos
        stock: (isShowcase || !manageStock) ? null : (Number(formData.stock) || 0),
        complementGroupIds: isShowcase ? [] : (formData.complementGroupIds || []),
        salesChannel: formData.salesChannel || 'delivery',
        gallery: formData.gallery || [],
        videoUrl: formData.videoUrl || "",
        isFeatured: formData.isFeatured || false
      };
      await createProduct(payload);
      router.push("/admin"); 
    } catch (e) { alert("Erro ao salvar."); setLoading(false); }
  };

  const quickGroup = async () => { 
    const name = prompt("Nome:"); if(name) { try { const id = await createGroup({title:name, required:false, maxSelection:1, options:[]}); setAllMasterGroups([...allMasterGroups, {id, title:name, required:false, maxSelection:1, options:[]}]); setFormData(p=>({...p, complementGroupIds:[...(p.complementGroupIds||[]), id]})); } catch(e){ alert("Erro"); }} 
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 pt-6 px-4">
      <div className="flex items-center gap-4 mb-6"><button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button><h1 className="text-2xl font-bold">Novo Produto</h1></div>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded border space-y-6">
                
                {/* Header + Destaque */}
                <div className="flex justify-between items-start">
                    <h2 className="font-bold border-b pb-2 flex-1">Dados Básicos</h2>
                    <label className="flex items-center gap-2 text-sm font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded cursor-pointer border border-yellow-200 hover:bg-yellow-100 select-none">
                        <input type="checkbox" className="w-4 h-4 text-yellow-600 rounded" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} /> 
                        <Star size={16} fill="currentColor"/> Destaque
                    </label>
                </div>

                {/* CANAL DE VENDA (Define o que aparece embaixo) */}
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <label className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2"><Store size={16}/> Tipo de Produto / Canal</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[{id: 'delivery', label: 'Delivery (Venda)'}, {id: 'encomenda', label: 'Encomenda (Vitrine)'}, {id: 'evento', label: 'Evento (Vitrine)'}].map(opt => (
                            <button type="button" key={opt.id} onClick={() => setFormData({...formData, salesChannel: opt.id as SalesChannel})} className={`py-2 px-1 text-xs font-bold rounded border ${formData.salesChannel === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>{opt.label}</button>
                        ))}
                    </div>
                    <p className="text-[10px] text-blue-600 mt-2">
                        {isShowcase ? "Modo Vitrine: Preço e Estoque ocultos. Botão leva ao WhatsApp." : "Modo Venda: Exibe preço, carrinho e complementos."}
                    </p>
                </div>

                <input placeholder="Nome do Produto" required className="w-full p-3 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                
                {/* PREÇOS (Só aparece se for DELIVERY) */}
                {!isShowcase && (
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border animate-in fade-in">
                        <div><label className="text-xs font-bold text-green-700 uppercase mb-1 block">R$ À Vista</label><input type="number" step="0.01" required className="w-full p-3 border rounded border-green-200" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})}/></div>
                        <div><label className="text-xs font-bold text-purple-700 uppercase mb-1 block">R$ Mensalista</label><input type="number" step="0.01" className="w-full p-3 border rounded border-purple-200" value={formData.pricePostpaid || ''} onChange={e => setFormData({...formData, pricePostpaid: parseFloat(e.target.value)})}/></div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4"><select className="w-full p-3 border rounded bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="bolos">Bolos</option><option value="doces">Doces</option><option value="salgados">Salgados</option><option value="bebidas">Bebidas</option></select></div>
                <textarea rows={3} placeholder="Descrição completa..." className="w-full p-3 border rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}/>
                
                {/* GALERIA (Sempre visível, mas crucial para vitrine) */}
                <div className="bg-gray-50 p-4 rounded border space-y-4">
                    <h3 className="font-bold text-sm flex items-center gap-2"><ImageIcon size={16}/> Galeria de Fotos & Vídeo</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {formData.gallery?.map((url, idx) => (
                            <div key={idx} className="relative aspect-square rounded overflow-hidden border bg-white group"><img src={url} className="w-full h-full object-cover"/><button type="button" onClick={() => setFormData(p => ({...p, gallery: p.gallery?.filter((_, i) => i !== idx)}))} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition"><X size={12}/></button></div>
                        ))}
                        <button type="button" onClick={() => galleryInputRef.current?.click()} className="aspect-square border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 hover:border-pink-500 hover:text-pink-500 transition">{galleryUploading ? <Loader2 className="animate-spin"/> : <><Upload size={20}/><span className="text-[10px] mt-1">Add +</span></>}</button>
                    </div>
                    <input type="file" multiple ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleGalleryUpload} />
                    <div className="pt-2 border-t"><label className="font-bold text-sm flex items-center gap-2 mb-1"><Video size={16}/> Vídeo (Link)</label><input placeholder="https://..." className="w-full p-2 border rounded text-xs" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})}/></div>
                </div>

                {/* ESTOQUE (Só Delivery) */}
                {!isShowcase && (
                    <div className="bg-gray-50 p-4 rounded border flex items-center justify-between animate-in fade-in">
                        <label className="flex items-center gap-2 text-sm font-bold"><Box size={16}/> Estoque?</label>
                        <div className="flex items-center gap-4"><input type="checkbox" className="w-5 h-5" checked={manageStock} onChange={e => setManageStock(e.target.checked)}/>{manageStock && <input type="number" className="w-20 p-2 border rounded" value={formData.stock ?? 0} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}/>}</div>
                    </div>
                )}
            </section>

            {/* COMPLEMENTOS (Só Delivery) */}
            {!isShowcase && (
                <section className="bg-white p-6 rounded border animate-in fade-in">
                    <div className="flex justify-between mb-4"><h2 className="font-bold flex gap-2"><Layers/> Complementos</h2><button type="button" onClick={quickGroup} className="text-pink-600 font-bold text-sm">+ Criar Rápido</button></div>
                    <div className="grid md:grid-cols-2 gap-3">{allMasterGroups.map(g => { const sel = formData.complementGroupIds?.includes(g.id); return <div key={g.id} onClick={() => { const curr = formData.complementGroupIds || []; setFormData({...formData, complementGroupIds: sel ? curr.filter(i => i !== g.id) : [...curr, g.id]}); }} className={`p-3 border rounded cursor-pointer flex gap-3 items-center ${sel ? 'border-pink-500 bg-pink-50' : ''}`}><div className={`w-4 h-4 border rounded flex items-center justify-center ${sel ? 'bg-pink-600 border-pink-600 text-white' : 'bg-white'}`}>{sel && "✓"}</div><div className="flex-1"><div className="font-bold text-sm">{g.title}</div></div></div> })}</div>
                </section>
            )}
        </div>

        {/* DIREITA - CAPA */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded border sticky top-6">
                <label className="block text-sm font-medium mb-3">Foto Principal (Capa)</label>
                <div className="aspect-square bg-gray-100 rounded border flex items-center justify-center overflow-hidden mb-4 cursor-pointer relative group" onClick={() => fileInputRef.current?.click()}>{uploading ? <Loader2 className="animate-spin text-pink-600"/> : formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover"/> : <div className="flex flex-col items-center text-gray-400"><Upload size={32}/><span className="text-xs mt-2">Enviar Foto</span></div>}</div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                <button type="submit" disabled={loading || uploading} className="w-full bg-slate-900 text-white font-bold py-3 rounded hover:bg-slate-800 disabled:opacity-50">{loading ? "Criando..." : "Salvar Produto"}</button>
            </div>
        </div>
      </form>
    </div>
  );
}