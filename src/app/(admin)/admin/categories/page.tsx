// src/app/(admin)/admin/categories/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc, setDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { Loader2, Save, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Category } from "@/types";

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", order: 1 });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
        const q = query(collection(db, "categories"), orderBy("order", "asc"));
        const snap = await getDocs(q);
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleSave = async () => {
      if (!formData.name) return alert("Nome obrigatório");
      try {
          const payload = {
              name: formData.name,
              order: Number(formData.order)
          };

          if (isEditing) {
              await updateDoc(doc(db, "categories", isEditing.id), payload);
          } else {
              // Cria ID "slugificado" (ex: "bolos_de_pote")
              const newId = formData.name.toLowerCase().trim().replace(/\s+/g, '_');
              await setDoc(doc(db, "categories", newId), payload);
          }
          
          setFormData({ name: "", order: categories.length + 1 });
          setIsEditing(null);
          loadCategories();
      } catch (e) { alert("Erro ao salvar"); }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Tem certeza? Produtos nesta categoria ficarão 'Sem Categoria'.")) return;
      await deleteDoc(doc(db, "categories", id));
      loadCategories();
  };

  const startEdit = (cat: Category) => {
      setIsEditing(cat);
      setFormData({ name: cat.name, order: cat.order });
  };

  const cancelEdit = () => {
      setIsEditing(null);
      setFormData({ name: "", order: categories.length + 1 });
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 p-6">
      <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
          <h1 className="text-2xl font-bold text-slate-800">Gerenciar Categorias</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
          {/* Formulário */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
              <h2 className="font-bold text-lg mb-4">{isEditing ? "Editar Categoria" : "Nova Categoria"}</h2>
              <div className="space-y-4">
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Nome da Categoria</label>
                      <input className="w-full p-3 border rounded-lg" placeholder="Ex: Bolos de Pote" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={!!isEditing} />
                      {isEditing && <p className="text-[10px] text-gray-400 mt-1">O ID não pode ser alterado, apenas o nome de exibição e ordem.</p>}
                  </div>
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Ordem de Exibição (1, 2, 3...)</label>
                      <input type="number" className="w-full p-3 border rounded-lg" placeholder="1" value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value)})} />
                  </div>
                  <div className="flex gap-2 pt-2">
                      {isEditing && <button onClick={cancelEdit} className="px-4 py-2 border rounded-lg text-gray-600 font-bold hover:bg-gray-50">Cancelar</button>}
                      <button onClick={handleSave} className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 flex justify-center items-center gap-2">
                          <Save size={18}/> {isEditing ? "Atualizar" : "Criar"}
                      </button>
                  </div>
              </div>
          </div>

          {/* Lista */}
          <div className="space-y-2">
              {loading ? <Loader2 className="animate-spin mx-auto text-pink-600"/> : categories.map(cat => (
                  <div key={cat.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                          <span className="bg-gray-100 text-gray-600 font-bold w-8 h-8 flex items-center justify-center rounded-full text-xs">{cat.order}</span>
                          <span className="font-bold text-slate-800">{cat.name}</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => startEdit(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={16}/></button>
                          <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                      </div>
                  </div>
              ))}
              {categories.length === 0 && !loading && <div className="text-center text-gray-400 py-10">Nenhuma categoria cadastrada.</div>}
          </div>
      </div>
    </div>
  );
}