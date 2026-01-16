// src/app/(admin)/admin/products/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload, Box, Layers, ExternalLink } from "lucide-react";
import { Product, ComplementGroup } from "@/types";
import { createProduct } from "@/services/productService";
import { getAllGroups, createGroup } from "@/services/complementService";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [allMasterGroups, setAllMasterGroups] = useState<ComplementGroup[]>([]);
  const [manageStock, setManageStock] = useState(false);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: "", description: "", basePrice: 0, imageUrl: "", category: "bolos", isAvailable: true, stock: null, complementGroupIds: []
  });

  useEffect(() => {
    getAllGroups().then(setAllMasterGroups).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const payload = {
        name: formData.name!,
        description: formData.description || "",
        basePrice: Number(formData.basePrice) || 0,
        imageUrl: formData.imageUrl || "",
        category: formData.category || "bolos",
        isAvailable: formData.isAvailable ?? true,
        stock: manageStock ? (Number(formData.stock) || 0) : null,
        complementGroupIds: formData.complementGroupIds || []
      };

      console.log("Enviando...", payload);
      
      // --- TRUQUE ANTI-TRAVAMENTO ---
      // Cria uma corrida: O que acontecer primeiro ganha (o salvamento ou um timer de 3s)
      // Se a rede estiver ruim, o timer ganha e libera a tela.
      await Promise.race([
        createProduct(payload),
        new Promise((resolve) => setTimeout(resolve, 3000))
      ]);
      
      console.log("Processo finalizado. Redirecionando...");
      window.location.href = "/admin"; 

    } catch (error) {
      console.error(error);
      alert("Erro ao salvar (verifique se os campos estão preenchidos).");
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
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded border space-y-6">
                <h2 className="font-bold border-b pb-2">Dados</h2>
                <input placeholder="Nome do Produto" required className="w-full p-3 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="0.01" placeholder="Preço" required className="w-full p-3 border rounded" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})}/>
                    <select className="w-full p-3 border rounded bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="bolos">Bolos</option><option value="doces">Doces</option><option value="salgados">Salgados</option><option value="bebidas">Bebidas</option></select>
                </div>
                <textarea rows={3} placeholder="Descrição" className="w-full p-3 border rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}/>
                <div className="bg-gray-50 p-4 rounded border flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold"><Box size={16}/> Controlar Estoque?</label>
                    <div className="flex items-center gap-4">
                        <input type="checkbox" className="w-5 h-5" checked={manageStock} onChange={e => setManageStock(e.target.checked)}/>
                        {manageStock && <input type="number" className="w-20 p-2 border rounded" value={formData.stock ?? 0} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}/>}
                    </div>
                </div>
            </section>
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
        </div>
        <div className="space-y-6">
            <div className="bg-white p-6 rounded border sticky top-6">
                <div className="aspect-square bg-gray-100 rounded border flex items-center justify-center overflow-hidden mb-4">
                    {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" onError={e => (e.target as any).style.display='none'}/> : <Upload className="text-gray-400"/>}
                </div>
                <input placeholder="URL da Imagem" className="w-full p-2 border rounded mb-4 text-sm" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})}/>
                <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-3 rounded hover:bg-slate-800 disabled:opacity-50">{loading ? "Criando..." : "Salvar Produto"}</button>
            </div>
        </div>
      </form>
    </div>
  );
}