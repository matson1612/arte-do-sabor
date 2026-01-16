// src/app/(admin)/admin/settings/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Save, MapPin, Building2, Phone, Lock, LocateFixed, Loader2, Search } from "lucide-react";
import { getStoreSettings, saveStoreSettings } from "@/services/settingsService";
import { StoreSettings } from "@/types";
import { useRouter } from "next/navigation";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

// Configurações do Mapa
const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.75rem'
};

// Centro padrão (Palmas - TO)
const defaultCenter = {
  lat: -10.183760,
  lng: -48.333650
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false); // Loading específico do CEP
  const [cepInput, setCepInput] = useState(""); // Estado local para o input do CEP

  const [formData, setFormData] = useState<StoreSettings>({
    storeName: "",
    cnpj: "",
    phone: "",
    authorizedEmail: "",
    address: { street: "", number: "", district: "", city: "Palmas", state: "TO" },
    location: { lat: -10.183760, lng: -48.333650 }
  });

  // Carrega API do Google Maps
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyCW0ToQDvynrwUwLJeYM8HpF82_Qm4G-R0" // <--- ⚠️ NÃO ESQUEÇA DA CHAVE
  });

  // Busca dados salvos
  useEffect(() => {
    getStoreSettings().then(data => {
      if (data) {
        const loadedLocation = {
           lat: Number(data.location?.lat) || defaultCenter.lat,
           lng: Number(data.location?.lng) || defaultCenter.lng
        };
        setFormData({ ...data, location: loadedLocation });
      }
    });
  }, []);

  // --- FUNÇÃO DE BUSCA DE CEP (ViaCEP) ---
  const handleBuscaCep = async () => {
    // Remove tudo que não for número
    const cep = cepInput.replace(/\D/g, '');

    if (cep.length !== 8) {
        alert("CEP inválido. Digite 8 números.");
        return;
    }

    setCepLoading(true);

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (data.erro) {
            alert("CEP não encontrado.");
            setCepLoading(false);
            return;
        }

        // Atualiza o formulário com os dados do CEP
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                street: data.logradouro,
                district: data.bairro,
                city: data.localidade,
                state: data.uf,
                number: "" // Limpa o número para o usuário digitar
            }
        }));

        // Tenta focar no campo número (UX)
        document.getElementById("input-number")?.focus();

    } catch (error) {
        alert("Erro ao buscar CEP. Verifique sua conexão.");
        console.error(error);
    } finally {
        setCepLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveStoreSettings(formData);
      alert("Configurações salvas com sucesso!");
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) return alert("Navegador sem suporte a GPS.");
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setFormData(prev => ({ ...prev, location: newPos }));
      },
      (err) => alert("Erro ao pegar GPS. Permita o acesso.")
    );
  };

  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
        setFormData(prev => ({
            ...prev,
            location: { lat: e.latLng!.lat(), lng: e.latLng!.lng() }
        }));
    }
  }, []);

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
                    <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                        <input className="w-full pl-10 p-2 border rounded" placeholder="55..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">E-mail do Admin</label>
                    <input required className="w-full p-2 border rounded font-bold" value={formData.authorizedEmail} onChange={e => setFormData({...formData, authorizedEmail: e.target.value})} />
                </div>
            </div>
        </div>

        {/* LOCALIZAÇÃO E ENDEREÇO */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2 text-blue-600"><MapPin size={20}/> Localização</h2>
                <button type="button" onClick={getMyLocation} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-2 hover:bg-blue-700">
                    <LocateFixed size={16}/> Usar Meu GPS
                </button>
            </div>
            
            {/* MAPA */}
            <div className="border rounded-xl overflow-hidden shadow-inner bg-gray-100 relative h-[400px]">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={formData.location}
                        zoom={15}
                        options={{ streetViewControl: false, mapTypeControl: false }}
                    >
                        <Marker
                            position={formData.location}
                            draggable={true}
                            onDragEnd={onMarkerDragEnd}
                            title="Local da Loja"
                        />
                    </GoogleMap>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 gap-2">
                        <Loader2 className="animate-spin"/> Carregando Mapa...
                    </div>
                )}
                <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-1 rounded text-xs font-mono shadow text-gray-600">
                    Lat: {formData.location.lat.toFixed(6)} | Lng: {formData.location.lng.toFixed(6)}
                </div>
            </div>

            {/* BUSCA DE CEP */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mt-2">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Buscar Endereço por CEP</label>
                <div className="flex gap-2">
                    <input 
                        className="w-40 p-2 border rounded font-mono" 
                        placeholder="00000-000"
                        value={cepInput}
                        onChange={(e) => setCepInput(e.target.value)}
                        maxLength={9}
                    />
                    <button 
                        type="button" 
                        onClick={handleBuscaCep} 
                        disabled={cepLoading}
                        className="bg-slate-800 text-white px-4 rounded hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {cepLoading ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
                        Buscar
                    </button>
                </div>
            </div>

            {/* CAMPOS DE ENDEREÇO */}
            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Rua / Logradouro</label>
                    <input className="w-full p-2 border rounded bg-gray-50" readOnly={false} value={formData.address.street} onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase text-blue-600">Número</label>
                    <input 
                        id="input-number"
                        className="w-full p-2 border-2 border-blue-100 focus:border-blue-500 rounded font-bold" 
                        placeholder="Ex: 100" 
                        value={formData.address.number} 
                        onChange={e => setFormData({...formData, address: {...formData.address, number: e.target.value}})} 
                    />
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                    <input className="w-full p-2 border rounded bg-gray-50" value={formData.address.district} onChange={e => setFormData({...formData, address: {...formData.address, district: e.target.value}})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                    <input className="w-full p-2 border rounded bg-gray-50" value={formData.address.city} onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Estado</label>
                    <input className="w-full p-2 border rounded bg-gray-50" value={formData.address.state} onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value}})} />
                </div>
            </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2">
            <Save size={20}/> {loading ? "Salvando..." : "Salvar Dados e Localização"}
        </button>

      </form>
    </div>
  );
}