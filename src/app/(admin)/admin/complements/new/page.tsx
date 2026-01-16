// src/app/(admin)/admin/complements/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Box, Info } from "lucide-react";
import { Option, Product } from "@/types";
import { createGroup } from "@/services/complementService";
import { getProducts } from "@/services/productService";

export default function NewComplementGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Estado do Grupo
  const [title, setTitle] = useState("");
  const [required, setRequired] = useState(false);
  const [maxSelection, setMaxSelection] = useState(1);
  const [options, setOptions] = useState<Option[]>([]);

  // Lista de produtos para vincular
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

  // Carrega produtos ao abrir (para o dropdown de vínculo)
  useEffect(() => {
    getProducts().then(setAvailableProducts);
  }, []);

  // Adicionar Opção (Simples ou Vinculada)
  const addOption = (type: 'simple' | 'product', linkedId?: string) => {
    let newOption: Option = {
      id: crypto.randomUUID(),
      name: "",
      priceAdd: 0,
      isAvailable: true,
      stock: null // null = Infinito por padrão
    };

    if (type === 'product' && linkedId) {
      const product = availableProducts.find(p => p.id === linkedId);
      if (product) {
        newOption = {
          ...newOption,
          name: product.name,
          priceAdd: product.basePrice,
          linkedProductId: product.id,
          stock: null // Se vinculado, usamos null aqui pois o front vai ler do produto real
        };
      }
    }

    setOptions([...options, newOption]);
  };

  // Atualizar campo de uma opção
  const updateOption = (index: number, field: keyof Option, value: any) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  // Remover opção
  const removeOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  // SALVAR
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert("O grupo precisa de um título!");
    if (options.length === 0) return alert("Adicione pelo menos uma opção ao grupo.");

    setLoading(true);
    try {
      await createGroup({
        title,
        required,
        maxSelection,
        options
      });
      alert("Grupo criado com sucesso!");
      router.push("/admin"); // Volta para o painel (aba complementos)
    } catch (error) {
      console.error(error);
      alert("Erro ao criar grupo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 pt-6 px-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Novo Grupo de Complementos</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* CARD 1: CONFIGURAÇÕES GERAIS */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-800 mb-4 border-b pb-2">Configurações do Grupo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do Grupo</label>
              <input 
                type="text" 
                placeholder="Ex: Escolha a Borda, Bebidas, Tamanho..."
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Obrigatoriedade</label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none"
                value={required ? "true" : "false"}
                onChange={e => setRequired(e.target.value === "true")}
              >
                <option value="false">Opcional</option>
                <option value="true">Obrigatório</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de Escolhas</label>
              <input 
                type="number" 
                min="1"
                required
                className="w-full p-3 border border-gray-300 rounded-lg outline-none"
                value={maxSelection}
                onChange={e => setMaxSelection(parseInt(e.target.value))}
              />
            </div>
          </div>
        </section>

        {/* CARD 2: ITENS E OPÇÕES */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-800 mb-4 border-b pb-2">Opções Disponíveis</h2>

          {options.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg mb-4">
              Nenhuma opção adicionada ainda.
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {options.map((opt, idx) => {
                const isLinked = !!opt.linkedProductId;
                return (
                  <div key={opt.id} className={`flex flex-col md:flex-row gap-3 p-3 rounded-lg border ${isLinked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                    
                    {/* Nome */}
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Nome</label>
                      <input 
                        type="text" 
                        placeholder="Nome da opção"
                        disabled={isLinked} // Bloqueia se for vinculado
                        className="w-full p-2 border rounded text-sm disabled:bg-gray-100 disabled:text-gray-500"
                        value={opt.name}
                        onChange={e => updateOption(idx, 'name', e.target.value)}
                      />
                      {isLinked && <span className="text-[10px] text-blue-600 font-bold">🔗 Produto Vinculado</span>}
                    </div>

                    {/* Preço Adicional */}
                    <div className="w-full md:w-32">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Preço (+)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full p-2 border rounded text-sm"
                        value={opt.priceAdd}
                        onChange={e => updateOption(idx, 'priceAdd', parseFloat(e.target.value))}
                      />
                    </div>

                    {/* Estoque (Lógica Híbrida) */}
                    <div className="w-full md:w-32">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Estoque</label>
                      {isLinked ? (
                        <div className="h-[38px] flex items-center px-2 text-xs text-blue-700 bg-blue-100/50 rounded border border-blue-200" title="Sincronizado com o Produto principal">
                          Automático
                        </div>
                      ) : (
                        <div className="relative">
                          <Box size={12} className="absolute left-2 top-3 text-gray-400" />
                          <input 
                            type="number" 
                            placeholder="∞"
                            className="w-full p-2 pl-6 border rounded text-sm"
                            value={opt.stock ?? ""}
                            onChange={e => updateOption(idx, 'stock', e.target.value === "" ? null : parseInt(e.target.value))}
                          />
                        </div>
                      )}
                    </div>

                    {/* Botão Remover */}
                    <div className="flex items-end pb-1">
                      <button 
                        type="button" 
                        onClick={() => removeOption(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* BOTÕES DE ADICIONAR */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-dashed">
            <button 
              type="button"
              onClick={() => addOption('simple')}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition"
            >
              <Plus size={16} /> Item Simples (ex: Colher)
            </button>

            <div className="relative flex-1">
              <select 
                className="w-full px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 outline-none cursor-pointer font-medium appearance-none"
                onChange={(e) => {
                  if (e.target.value) {
                    addOption('product', e.target.value);
                    e.target.value = ""; // Reseta o select
                  }
                }}
              >
                <option value="">+ Vincular Produto Existente (ex: Coca-Cola)</option>
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none">
                <Plus size={16} className="text-blue-700" />
              </div>
            </div>
          </div>
          
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            <Info size={12} />
            Itens vinculados a produtos compartilham o mesmo estoque e disponibilidade do produto original.
          </p>
        </section>

        {/* SALVAR */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full md:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-70"
          >
            {loading ? "Criando..." : <><Save size={20} /> Criar Grupo</>}
          </button>
        </div>

      </form>
    </div>
  );
}