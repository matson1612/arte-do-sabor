// src/app/(admin)/admin/settings/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Save, MapPin, Building2, Phone, Lock, LocateFixed, Loader2 } from "lucide-react";
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

// Centro padrão (Palmas - TO) caso não tenha nada salvo
const defaultCenter = {
  lat: -10.183760,
  lng: -48.333650
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<StoreSettings>({
    storeName: "",
    cnpj: "",
    phone: "",
    authorizedEmail: "",
    address: { street: "", number: "", district: "", city: "Palmas", state: "TO" },
    location: { lat: -10.183760, lng: -48.333650 } // Valor inicial padrão
  });

  // Carrega a API do Google Maps
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "SAIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8" // <--- COLOQUE SUA CHAVE AQUI ⚠️
  });

  // Busca dados salvos
  useEffect(() => {
    getStoreSettings().then(data => {
      if (data) {
        // Garante que location tenha valores numéricos válidos
        const loadedLocation = {
           lat: Number(data.location?.lat) || defaultCenter.lat,
           lng: Number(data.location?.lng) || defaultCenter.lng
        };
        setFormData({ ...data, location: loadedLocation });
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveStoreSettings(formData);
      alert("Configurações salvas! A localização da loja foi atualizada.");
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  // Botão para usar o GPS do navegador e centralizar o mapa
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

  // Quando arrastar o pino no mapa
  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      setFormData(prev => ({
        ...prev,
        location: { lat: newLat, lng: newLng }
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
                    <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp (Ex: 5563999999999)</label>
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
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">E-mail do Dono (Google)</label>
                <input required className="w-full p-2 border rounded font-bold" placeholder="seu.email@gmail.com" value={formData.authorizedEmail} onChange={e => setFormData({...formData, authorizedEmail: e.target.value})} />
            </div>
        </div>

        {/* LOCALIZAÇÃO COM GOOGLE MAPS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2 text-blue-600"><MapPin size={20}/> Localização e Endereço</h2>
                <button type="button" onClick={getMyLocation} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-2 hover:bg-blue-700">
                    <LocateFixed size={16}/> Usar Meu GPS Atual
                </button>
            </div>
            
            <p className="text-sm text-gray-500">Arraste o pino vermelho no mapa para marcar a <b>localização exata da loja</b>. Isso será usado para calcular o frete.</p>

            {/* MAPA */}
            <div className="border rounded-xl overflow-hidden shadow-inner bg-gray-100 relative">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={formData.location} // Centraliza onde está salvo
                        zoom={15}
                        options={{ streetViewControl: false, mapTypeControl: false }}
                    >
                        {/* Marcador Arrastável */}
                        <Marker
                            position={formData.location}
                            draggable={true}
                            onDragEnd={onMarkerDragEnd}
                            title="Local da Loja"
                        />
                    </GoogleMap>
                ) : (
                    <div className="h-[400px] flex items-center justify-center text-gray-400 gap-2">
                        <Loader2 className="animate-spin"/> Carregando Mapa...
                    </div>
                )}
                
                {/* Mostrador de Coordenadas */}
                <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-1 rounded text-xs font-mono shadow text-gray-600">
                    Lat: {formData.location.lat.toFixed(6)} | Lng: {formData.location.lng.toFixed(6)}
                </div>
            </div>

            {/* Campos de Endereço Escrito */}
            <div className="grid grid-cols-3 gap-4 mt-4">
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