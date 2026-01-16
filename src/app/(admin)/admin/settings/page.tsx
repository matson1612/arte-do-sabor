// src/app/(admin)/admin/settings/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Save, MapPin, Building2, Phone, Lock, LocateFixed, Loader2, Search } from "lucide-react";
import { getStoreSettings, saveStoreSettings } from "@/services/settingsService";
import { StoreSettings } from "@/types";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

// --- CONFIGURAÇÃO DO MAPA ---
const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.75rem'
};

const defaultCenter = {
  lat: -10.183760, // Palmas - TO
  lng: -48.333650
};

// ⚠️ SUA CHAVE AQUI
const GOOGLE_MAPS_API_KEY = "AIzaSyCW0ToQDvynrwUwLJeYM8HpF82_Qm4G-R0"; 

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepInput, setCepInput] = useState("");
  
  // Referência para o Mapa (para mover a câmera via código)
  const mapRef = useRef<google.maps.Map | null>(null);

  const [formData, setFormData] = useState<StoreSettings>({
    storeName: "",
    cnpj: "",
    phone: "",
    authorizedEmail: "",
    address: { street: "", number: "", district: "", city: "Palmas", state: "TO" },
    location: defaultCenter
  });

  // Carrega o Script do Google Maps
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    getStoreSettings().then(data => {
      if (data) {
        // Garante numéricos para o mapa não quebrar
        const loc = {
            lat: Number(data.location?.lat) || defaultCenter.lat,
            lng: Number(data.location?.lng) || defaultCenter.lng
        };
        setFormData({ ...data, location: loc });
      }
    });
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // --- FUNÇÃO 1: BUSCAR CEP E MOVER MAPA ---
  const handleBuscaCep = async () => {
    const cep = cepInput.replace(/\D/g, '');
    if (cep.length !== 8) return alert("CEP inválido (digite 8 números).");

    setCepLoading(true);

    try {
        // 1. Busca Texto no ViaCEP
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();

        if (data.erro) {
            alert("CEP não encontrado.");
            setCepLoading(false);
            return;
        }

        // 2. Atualiza os campos de texto
        const newAddress = {
            ...formData.address,
            street: data.logradouro,
            district: data.bairro,
            city: data.localidade,
            state: data.uf,
            number: "" // Limpa número para obrigar digitar
        };

        setFormData(prev => ({ ...prev, address: newAddress }));

        // 3. Usa Google Geocoder para achar a LAT/LNG desse endereço
        if (window.google && window.google.maps) {
            const geocoder = new window.google.maps.Geocoder();
            const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`;
            
            geocoder.geocode({ address: fullAddress }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const newLocation = {
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    };
                    
                    // Atualiza coordenadas e move o mapa
                    setFormData(prev => ({ ...prev, location: newLocation }));
                    mapRef.current?.panTo(newLocation);
                    mapRef.current?.setZoom(17);
                } else {
                    console.warn("Geocoding falhou:", status);
                }
            });
        }
        
        // Foca no número
        document.getElementById("input-number")?.focus();

    } catch (error) {
        console.error(error);
        alert("Erro ao buscar CEP.");
    } finally {
        setCepLoading(false);
    }
  };

  // --- FUNÇÃO 2: ARRASTAR O PINO ---
  const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setFormData(prev => ({ ...prev, location: newPos }));
    }
  };

  // --- FUNÇÃO 3: USAR GPS DO NAVEGADOR ---
  const getMyLocation = () => {
    if (!navigator.geolocation) return alert("GPS não suportado.");
    navigator.geolocation.getCurrentPosition((pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setFormData(prev => ({ ...prev, location: newPos }));
        mapRef.current?.panTo(newPos);
        mapRef.current?.setZoom(17);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveStoreSettings(formData);
      alert("Configurações Salvas!");
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Dados da Empresa</h1>
      
      <form onSubmit={handleSave} className="grid gap-6">

        {/* --- BLOCO 1: IDENTIFICAÇÃO --- */}
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
                    <input className="w-full p-2 border rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase text-red-500">E-mail do Admin</label>
                    <input required className="w-full p-2 border rounded font-bold" value={formData.authorizedEmail} onChange={e => setFormData({...formData, authorizedEmail: e.target.value})} />
                </div>
            </div>
        </div>

        {/* --- BLOCO 2: ENDEREÇO E MAPA --- */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="font-bold flex items-center gap-2 text-blue-600"><MapPin size={20}/> Localização</h2>
                
                {/* BUSCA DE CEP */}
                <div className="flex gap-2 w-full md:w-auto">
                    <input 
                        className="p-2 border rounded font-mono w-full md:w-40" 
                        placeholder="CEP (Só nº)"
                        value={cepInput}
                        onChange={(e) => setCepInput(e.target.value)}
                        maxLength={9}
                    />
                    <button type="button" onClick={handleBuscaCep} disabled={cepLoading} className="bg-slate-800 text-white px-4 rounded hover:bg-slate-700 flex items-center gap-2">
                        {cepLoading ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
                    </button>
                    <button type="button" onClick={getMyLocation} title="Usar meu GPS" className="bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200">
                        <LocateFixed size={20}/>
                    </button>
                </div>
            </div>

            {/* MAPA VISUAL */}
            <div className="border rounded-xl overflow-hidden shadow-inner bg-gray-100 relative h-[400px]">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={formData.location}
                        zoom={15}
                        onLoad={onLoad}
                        onUnmount={onUnmount}
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
                        <Loader2 className="animate-spin"/> Carregando Google Maps... (Verifique sua Chave API)
                    </div>
                )}
                
                {/* Mostrador de Coordenadas */}
                <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-1 rounded text-xs font-mono shadow text-gray-600 z-10">
                    {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                </div>
            </div>

            {/* FORMULÁRIO DE TEXTO (PREENCHIDO AUTOMATICAMENTE) */}
            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Rua</label>
                    <input className="w-full p-2 border rounded bg-gray-50" value={formData.address.street} onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase text-blue-600">Número</label>
                    <input id="input-number" className="w-full p-2 border-2 border-blue-100 focus:border-blue-500 rounded font-bold" placeholder="Nº" value={formData.address.number} onChange={e => setFormData({...formData, address: {...formData.address, number: e.target.value}})} />
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

        <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg shadow-green-200">
            <Save size={20}/> {loading ? "Salvando..." : "Salvar Configurações"}
        </button>

      </form>
    </div>
  );
}