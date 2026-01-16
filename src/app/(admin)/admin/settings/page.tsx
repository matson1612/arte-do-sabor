// src/app/(admin)/admin/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Save, MapPin, Building2, Phone, Lock, LocateFixed } from "lucide-react";
import { getStoreSettings, saveStoreSettings } from "@/services/settingsService";
import { StoreSettings } from "@/types";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<StoreSettings>({
    storeName: "",
    cnpj: "",
    phone: "",
    authorizedEmail: "", // IMPORTANTE: Coloque seu email aqui
    address: { street: "", number: "", district: "", city: "Palmas", state: "TO" },
    location: { lat: 0, lng: 0 }
  });

  useEffect(() => {
    getStoreSettings().then(data => {
      if (data) setFormData(data);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveStoreSettings(formData);
      alert("Configurações salvas! O sistema já está atualizado.");
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const getMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev, 
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        }));
        alert(`Localização capturada: ${pos.coords.latitude}, ${pos.coords.longitude}`);
      },
      (err) => alert("Erro ao pegar GPS. Permita o acesso.")
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Dados da Empresa</h1>
      
      <form onSubmit={handleSave} className="grid gap-6">
        
        {/* IDENTIFICAÇÃO */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-pink-600"><Building2 size={20}/> Identificação</h2>
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Nome da Loja</label>
                    <input className="w-full p-2 border rounded" value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">CNPJ</label>
                    <input className="w-full p-2 border rounded" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp de Pedidos (Ex: 5511999999999)</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                        <input className="w-full pl-10 p-2 border rounded" placeholder="55..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                </div>
            </div>
        </div>

        {/* SEGURANÇA */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4 border-l-4 border-l-red-500">
            <h2 className="font-bold flex items-center gap-2 text-red-600"><Lock size={20}/> Segurança do Admin</h2>
            <p className="text-sm text-gray-500">Apenas este e-mail poderá acessar o painel administrativo.</p>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">E-mail do Dono (Google)</label>
                <input required className="w-full p-2 border rounded font-bold" placeholder="seu.email@gmail.com" value={formData.authorizedEmail} onChange={e => setFormData({...formData, authorizedEmail: e.target.value})} />
            </div>
        </div>

        {/* ENDEREÇO & LOCALIZAÇÃO */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-blue-600"><MapPin size={20}/> Localização (Para Frete)</h2>
            
            <div className="bg-blue-50 p-4 rounded border border-blue-100 mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="font-bold text-blue-800 block">Ponto GPS da Loja</span>
                        <span className="text-xs text-blue-600">Usado para calcular a distância do cliente</span>
                    </div>
                    <button type="button" onClick={getMyLocation} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-2 hover:bg-blue-700">
                        <LocateFixed size={16}/> Pegar Minha Posição Atual
                    </button>
                </div>
                <div className="mt-2 flex gap-4 text-sm font-mono text-gray-600">
                    <span>Lat: {formData.location.lat}</span>
                    <span>Lng: {formData.location.lng}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Rua</label>
                    <input className="w-full p-2 border rounded" value={formData.address.street} onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Número</label>
                    <input className="w-full p-2 border rounded" value={formData.address.number} onChange={e => setFormData({...formData, address: {...formData.address, number: e.target.value}})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                    <input className="w-full p-2 border rounded" value={formData.address.district} onChange={e => setFormData({...formData, address: {...formData.address, district: e.target.value}})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                    <input className="w-full p-2 border rounded" value={formData.address.city} onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Estado</label>
                    <input className="w-full p-2 border rounded" value={formData.address.state} onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value}})} />
                </div>
            </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2">
            <Save size={20}/> {loading ? "Salvando..." : "Salvar Configurações da Empresa"}
        </button>

      </form>
    </div>
  );
}