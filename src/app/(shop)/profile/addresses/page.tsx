// src/app/(shop)/profile/addresses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, MapPin, Plus, Trash2, Loader2, Save, X } from "lucide-react";

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [newAddress, setNewAddress] = useState({
    nickname: "", street: "", number: "", district: "", complement: "", zip: ""
  });

  useEffect(() => {
    if (user) loadAddresses();
  }, [user]);

  const loadAddresses = async () => {
    try {
        const snap = await getDoc(doc(db, "users", user!.uid));
        if (snap.exists() && snap.data().savedAddresses) {
            setAddresses(snap.data().savedAddresses);
        }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleBuscaCep = async () => {
      const cep = newAddress.zip.replace(/\D/g, '');
      if (cep.length !== 8) return;
      try {
          const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const data = await res.json();
          if (!data.erro) {
              setNewAddress(prev => ({ ...prev, street: data.logradouro, district: data.bairro }));
          }
      } catch (e) {}
  };

  const handleSave = async () => {
      if (!newAddress.street || !newAddress.number || !newAddress.district || !newAddress.nickname) {
          return alert("Preencha os campos obrigatórios (Apelido, Rua, Número, Bairro)");
      }
      setSaving(true);
      const addressObj = { ...newAddress, id: crypto.randomUUID() };
      try {
          await updateDoc(doc(db, "users", user!.uid), {
              savedAddresses: arrayUnion(addressObj)
          });
          setAddresses([...addresses, addressObj]);
          setIsAdding(false);
          setNewAddress({ nickname: "", street: "", number: "", district: "", complement: "", zip: "" });
      } catch (e) { alert("Erro ao salvar."); } finally { setSaving(false); }
  };

  const handleDelete = async (addr: any) => {
      if (!confirm("Excluir este endereço?")) return;
      try {
          // No Firestore arrayRemove exige o objeto exato
          await updateDoc(doc(db, "users", user!.uid), {
              savedAddresses: arrayRemove(addr)
          });
          setAddresses(prev => prev.filter(a => a.id !== addr.id));
      } catch (e) { alert("Erro ao excluir."); }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-orange-500"/></div>;

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-8">
          <Link href="/profile" className="p-2 bg-white rounded-full border border-stone-200 text-stone-500 hover:text-stone-800 transition"><ArrowLeft size={20}/></Link>
          <h1 className="text-2xl font-bold text-stone-800">Meus Endereços</h1>
      </div>

      <div className="grid gap-4">
          {/* Botão Novo Endereço */}
          {!isAdding && (
              <button onClick={() => setIsAdding(true)} className="w-full bg-stone-800 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-700 transition shadow-lg shadow-stone-200">
                  <Plus size={20}/> Cadastrar Novo Endereço
              </button>
          )}

          {/* Formulário de Cadastro */}
          {isAdding && (
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-lg animate-in slide-in-from-top-4">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin size={20} className="text-orange-500"/> Novo Local</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs font-bold text-stone-400 uppercase">Salvar como (Ex: Casa, Trabalho)</label>
                          <input className="w-full p-3 border rounded-xl bg-stone-50" placeholder="Apelido do local" value={newAddress.nickname} onChange={e => setNewAddress({...newAddress, nickname: e.target.value})} />
                      </div>
                      <div className="flex gap-3">
                          <div className="w-32">
                              <label className="text-xs font-bold text-stone-400 uppercase">CEP</label>
                              <input className="w-full p-3 border rounded-xl" placeholder="00000-000" value={newAddress.zip} onChange={e => setNewAddress({...newAddress, zip: e.target.value})} onBlur={handleBuscaCep}/>
                          </div>
                          <div className="flex-1">
                              <label className="text-xs font-bold text-stone-400 uppercase">Bairro</label>
                              <input className="w-full p-3 border rounded-xl bg-stone-50" placeholder="Bairro" value={newAddress.district} onChange={e => setNewAddress({...newAddress, district: e.target.value})} />
                          </div>
                      </div>
                      <div className="flex gap-3">
                          <div className="flex-1">
                              <label className="text-xs font-bold text-stone-400 uppercase">Rua</label>
                              <input className="w-full p-3 border rounded-xl bg-stone-50" placeholder="Nome da rua" value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} />
                          </div>
                          <div className="w-24">
                              <label className="text-xs font-bold text-stone-400 uppercase">Número</label>
                              <input className="w-full p-3 border rounded-xl" placeholder="Nº" value={newAddress.number} onChange={e => setNewAddress({...newAddress, number: e.target.value})} />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-stone-400 uppercase">Complemento (Opcional)</label>
                          <input className="w-full p-3 border rounded-xl bg-stone-50" placeholder="Apto, Bloco, Ponto de referência..." value={newAddress.complement} onChange={e => setNewAddress({...newAddress, complement: e.target.value})} />
                      </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                      <button onClick={() => setIsAdding(false)} className="flex-1 py-3 border border-stone-200 rounded-xl font-bold text-stone-500 hover:bg-stone-50">Cancelar</button>
                      <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                          {saving ? <Loader2 className="animate-spin"/> : <><Save size={18}/> Salvar</>}
                      </button>
                  </div>
              </div>
          )}

          {/* Lista de Endereços */}
          {addresses.length === 0 && !isAdding && (
              <div className="text-center py-10 text-stone-400 bg-white rounded-3xl border border-dashed">
                  <MapPin size={40} className="mx-auto mb-2 opacity-30"/>
                  <p>Nenhum endereço salvo.</p>
              </div>
          )}

          {addresses.map((addr) => (
              <div key={addr.id} className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm flex justify-between items-center group hover:border-orange-200 transition">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                          <MapPin size={20}/>
                      </div>
                      <div>
                          <h4 className="font-bold text-stone-800">{addr.nickname}</h4>
                          <p className="text-sm text-stone-500">{addr.street}, {addr.number} - {addr.district}</p>
                      </div>
                  </div>
                  <button onClick={() => handleDelete(addr)} className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full transition">
                      <Trash2 size={18}/>
                  </button>
              </div>
          ))}
      </div>
    </div>
  );
}