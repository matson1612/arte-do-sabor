// src/app/(admin)/admin/complements/edit/[id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Plus, Box, Info } from "lucide-react";
import { getGroupById, updateGroup } from "@/services/complementService";
import { getProducts } from "@/services/productService";
import { ComplementGroup, Option, Product } from "@/types";

export default function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [group, setGroup] = useState<ComplementGroup | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
        const [g, p] = await Promise.all([getGroupById(id), getProducts()]);
        setGroup(g);
        setProducts(p);
    };
    load();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    setLoading(true);
    try {
        await updateGroup(id, group);
        // REDIRECIONAMENTO CORRIGIDO:
        // Tenta voltar para a página anterior, se não der, vai pro Admin
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push("/admin");
        }
    } catch (error) {
        alert("Erro ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  // Funções de manipulação (iguais ao modal)
  const addOption = (type: 'simple' | 'product', linkedId?: string) => {
    if(!group) return;
    let newOpt: Option = { id: crypto.randomUUID(), name: "", priceAdd: 0, isAvailable: true, stock: null };
    if (type === 'product' && linkedId) {
        const p = products.find(x => x.id === linkedId);
        if(p) newOpt = { ...newOpt, name: p.name, priceAdd: p.basePrice, linkedProductId: p.id, stock: null };
    }
    setGroup({ ...group, options: [...group.options, newOpt] });
  };

  const removeOption = (idx: number) => {
     if(!group) return;
     const opts = [...group.options];
     opts.splice(idx, 1);
     setGroup({...group, options: opts});
  };

  const updateOpt = (idx: number, field: keyof Option, val: any) => {
    if(!group) return;
    const opts = [...group.options];
    opts[idx] = { ...opts[idx], [field]: val };
    setGroup({...group, options: opts});
  };

  if (!group) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 pb-20">
        {/* BOTÃO VOLTAR ADICIONADO */}
        <div className="flex items-center gap-4 mb-6">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition">
                <ArrowLeft size={24}/>
            </button>
            <h1 className="text-2xl font-bold">Editando: {group.title}</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
            {/* Configs */}
            <div className="bg-white p-4 rounded-xl border shadow-sm grid md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Título</label>
                    <input className="w-full p-2 border rounded font-bold" value={group.title} onChange={e => setGroup({...group, title: e.target.value})} />
                </div>
                <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Obrigatório</label>
                     <select className="w-full p-2 border rounded bg-white" value={group.required ? "true" : "false"} onChange={e => setGroup({...group, required: e.target.value === "true"})}>
                        <option value="false">Opcional</option>
                        <option value="true">Sim</option>
                     </select>
                </div>
                <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Máx. Seleção</label>
                     <input type="number" className="w-full p-2 border rounded" value={group.maxSelection} onChange={e => setGroup({...group, maxSelection: parseInt(e.target.value)})} />
                </div>
            </div>

            {/* Opções */}
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                <h3 className="font-bold border-b pb-2">Opções do Grupo</h3>
                {group.options.map((opt, idx) => {
                    const isLinked = !!opt.linkedProductId;
                    return (
                        <div key={idx} className={`flex gap-2 items-center p-2 rounded border ${isLinked ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                            <div className="flex-1">
                                <input disabled={isLinked} placeholder="Nome" className="w-full p-1 bg-transparent border-b border-dashed outline-none" value={opt.name} onChange={e => updateOpt(idx, 'name', e.target.value)} />
                                {isLinked && <span className="text-[10px] text-blue-600 font-bold">🔗 Vinculado</span>}
                            </div>
                            <div className="w-24">
                                <input type="number" className="w-full p-1 border rounded text-right" value={opt.priceAdd} onChange={e => updateOpt(idx, 'priceAdd', parseFloat(e.target.value))} />
                            </div>
                            {!isLinked && <div className="w-16"><input type="number" placeholder="∞" className="w-full p-1 border rounded text-center" value={opt.stock ?? ''} onChange={e => updateOpt(idx, 'stock', e.target.value ? parseInt(e.target.value) : null)} /></div>}
                            <button type="button" onClick={() => removeOption(idx)} className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    );
                })}
                
                <div className="flex gap-2 pt-2 border-t border-dashed">
                     <button type="button" onClick={() => addOption('simple')} className="px-3 py-1 border rounded hover:bg-gray-50 text-sm">+ Simples</button>
                     <select className="px-3 py-1 border rounded bg-white text-sm text-blue-600 outline-none" onChange={e => { if(e.target.value) { addOption('product', e.target.value); e.target.value=""; }}}>
                        <option value="">+ Vincular Produto...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition">
                {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
        </form>
    </div>
  );
}