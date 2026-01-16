// src/app/(admin)/admin/settings/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Save, MapPin, Store, Phone, Loader2, Search } from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

// ⚠️ MANTENHA SUA CHAVE AQUI
const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 
const DEFAULT_CENTER = { lat: -10.183760, lng: -48.333650 }; // Palmas

const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '0.75rem' };

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  
  const [address, setAddress] = useState({ street: "", number: "", district: "", city: "Palmas", state: "TO" });
  const [location, setLocation] = useState(DEFAULT_CENTER);
  const [cepInput, setCepInput] = useState("");

  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, "settings", "info");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || "");
          setWhatsapp(data.whatsapp || "");
          if (data.address) setAddress(data.address);
          if (data.location) setLocation(data.location);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setDataLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // --- CORREÇÃO AQUI ---
  const handleBuscaCep = async () => {
    // Formata para apenas números
    const rawCep = cepInput.replace(/\D/g, '');
    if (rawCep.length !== 8) return alert("CEP inválido");

    try {
        // 1. ViaCEP (Texto)
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        
        if (!data.erro) {
            setAddress(prev => ({
                ...prev,
                street: data.logradouro,
                district: data.bairro,
                city: data.localidade,
                state: data.uf
            }));
            
            // 2. Google Maps (Busca SUPER ESPECÍFICA por CEP)
            if (window.google && window.google.maps) {
                const geocoder = new window.google.maps.Geocoder();
                
                // Formata o CEP para o padrão visual (ex: 77000-000) para ajudar o Google
                const formattedCep = rawCep.replace(/^(\d{5})(\d{3})/, '$1-$2');

                geocoder.geocode({ 
                    address: formattedCep, // Tenta pelo endereço formatado
                    componentRestrictions: { country: 'BR', postalCode: rawCep } // E restringe ao Brasil e CEP
                }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        const loc = results[0].geometry.location;
                        const newPos = { lat: loc.lat(), lng: loc.lng() };
                        
                        // Atualiza estado e move o mapa
                        setLocation(newPos);
                        mapRef.current?.panTo(newPos);
                        mapRef.current?.setZoom(17);
                    } else {
                        console.warn("Google não achou o CEP exato, tentando busca ampla...");
                        // Fallback: Tenta buscar só pelo CEP string se a restrição falhar
                        geocoder.geocode({ address: rawCep }, (res2, stat2) => {
                             if (stat2 === 'OK' && res2 && res2[0]) {
                                const loc = res2[0].geometry.location;
                                const newPos = { lat: loc.lat(), lng: loc.lng() };
                                setLocation(newPos);
                                mapRef.current?.panTo(newPos);
                                mapRef.current?.setZoom(17);
                             }
                        });
                    }
                });
            }
        } else {
            alert("CEP não encontrado no ViaCEP.");
        }
    } catch (e) { alert("Erro ao buscar CEP"); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        await setDoc(doc(db, "settings", "info"), {
            name,
            whatsapp: whatsapp.replace(/\D/g, ''),
            address,
            location,
            updatedAt: new Date()
        });
        alert("Salvo com sucesso!");
    } catch (error) {
        alert("Erro ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  if (!dataLoaded) return <div className="p-10 text-center"><Loader2 className="animate-spin inline"/> Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-3">
        <Store className="text-pink-600"/> Configuração da Loja
      </h1>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                <h2 className="font-bold text-lg text-gray-700 border-b pb-2">Identidade</h2>
                <div>
                    <label className="block text-sm font-bold text-gray-500 mb-1">Nome da Loja</label>
                    <input className="w-full p-3 border rounded-lg" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-500 mb-1">WhatsApp</label>
                    <input className="w-full p-3 border rounded-lg" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="55639..." />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                <h2 className="font-bold text-lg text-gray-700 border-b pb-2">Endereço Base</h2>
                <div className="flex gap-2">
                    <input className="w-full p-2 border rounded" placeholder="CEP" value={cepInput} onChange={e => setCepInput(e.target.value)} />
                    <button type="button" onClick={handleBuscaCep} className="bg-slate-800 text-white px-3 rounded"><Search/></button>
                </div>
                <input className="w-full p-3 border rounded-lg bg-gray-50" value={address.street} readOnly />
                 <div className="flex gap-2">
                    <input className="w-32 p-3 border rounded-lg" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} placeholder="Nº" />
                    <input className="w-full p-3 border rounded-lg bg-gray-50" value={address.district} readOnly />
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
            <h2 className="font-bold text-lg text-gray-700 mb-4">Localização</h2>
            <div className="border rounded-xl overflow-hidden shadow-inner bg-gray-100 relative">
                {isLoaded ? (
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={location} zoom={16} onLoad={map => { mapRef.current = map; }}>
                        <Marker position={location} draggable={true} onDragEnd={(e) => { if(e.latLng) setLocation({lat: e.latLng.lat(), lng: e.latLng.lng()}); }} />
                    </GoogleMap>
                ) : <div className="h-[350px] flex items-center justify-center">Carregando Mapa...</div>}
                 <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none"><span className="bg-white/90 px-3 py-1 rounded text-xs font-bold shadow text-slate-800">Arraste o pino para ajustar</span></div>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-6 bg-pink-600 text-white font-bold py-4 rounded-xl hover:bg-pink-700 transition flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Salvar
            </button>
        </div>
      </form>
    </div>
  );
}