// src/app/(shop)/profile/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { User, MapPin, Save, LogOut, Loader2, Search, LocateFixed, Phone } from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

// --- CONFIG DO MAPA ---
const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.75rem'
};

// Centro padrão (Palmas - TO)
const defaultCenter = { lat: -10.183760, lng: -48.333650 };

// ⚠️ COLOQUE SUA CHAVE AQUI
const GOOGLE_MAPS_API_KEY = "SUA_CHAVE_DO_GOOGLE_AQUI"; 

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Estados do Endereço
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cepInput, setCepInput] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  
  const [address, setAddress] = useState({
    street: "",
    number: "",
    district: "",
    city: "Palmas",
    state: "TO",
    complement: ""
  });

  const [location, setLocation] = useState(defaultCenter);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Carrega API do Google Maps
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  // Carrega dados do usuário ao abrir
  useEffect(() => {
    if (!user) return;
    
    const loadProfile = async () => {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                setName(data.name || user.displayName || "");
                setPhone(data.phone || "");
                if (data.address) setAddress(data.address);
                if (data.location) setLocation(data.location);
                // Tenta preencher o CEP se tiver algo salvo no endereço (opcional)
                // mas geralmente não salvamos o CEP separado, o usuário digita de novo se quiser buscar
            } else {
                setName(user.displayName || "");
            }
        } catch (error) {
            console.error("Erro ao carregar perfil:", error);
        } finally {
            setDataLoading(false);
        }
    };
    loadProfile();
  }, [user]);

  // --- BUSCA POR CEP (IGUAL AO CARRINHO) ---
  const handleBuscaCep = async () => {
    const cep = cepInput.replace(/\D/g, '');
    if (cep.length !== 8) return alert("CEP inválido.");
    setCepLoading(true);

    try {
        // 1. Busca Texto (ViaCEP)
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        
        if (data.erro) { 
            alert("CEP não encontrado."); 
            setCepLoading(false); 
            return; 
        }

        setAddress(prev => ({
            ...prev,
            street: data.logradouro,
            district: data.bairro,
            city: data.localidade,
            state: data.uf,
            number: "" // Limpa número
        }));

        // 2. Google Maps (Busca SÓ pelo CEP para evitar confusão)
        if (window.google && window.google.maps) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: cep }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const loc = results[0].geometry.location;
                    const newPos = { lat: loc.lat(), lng: loc.lng() };
                    
                    setLocation(newPos);
                    mapRef.current?.panTo(newPos);
                    mapRef.current?.setZoom(17);
                }
            });
        }
        document.getElementById("input-number")?.focus();
    } catch (e) {
        alert("Erro na busca.");
    } finally {
        setCepLoading(false);
    }
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(newPos);
        mapRef.current?.panTo(newPos);
        mapRef.current?.setZoom(17);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
        const userData = {
            name,
            phone,
            address,
            location,
            updatedAt: new Date()
        };
        
        await setDoc(doc(db, "users", user.uid), userData, { merge: true });
        alert("Perfil atualizado com sucesso!");
    } catch (error) {
        alert("Erro ao salvar.");
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  if (dataLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-pink-600"/></div>;

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Meu Perfil</h1>
        <button onClick={logout} className="text-red-500 text-sm font-bold flex items-center gap-1 bg-white px-3 py-1 rounded border shadow-sm">
            <LogOut size={16}/> Sair
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* DADOS PESSOAIS */}
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-pink-600"><User size={20}/> Dados Pessoais</h2>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                <input className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp / Telefone</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-400" size={18}/>
                    <input className="w-full pl-10 p-3 border rounded-lg bg-gray-50 focus:bg-white transition" placeholder="63 99999-9999" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
            </div>
        </div>

        {/* ENDEREÇO */}
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-blue-600"><MapPin size={20}/> Endereço de Entrega</h2>
            
            {/* BUSCA CEP */}
            <div className="flex gap-2">
                <input 
                    className="flex-1 p-3 border rounded-lg font-mono" 
                    placeholder="Digite seu CEP" 
                    value={cepInput} 
                    onChange={e => setCepInput(e.target.value)} 
                    maxLength={9}
                />
                <button type="button" onClick={handleBuscaCep} disabled={cepLoading} className="bg-slate-800 text-white px-4 rounded-lg hover:bg-slate-700 disabled:opacity-50">
                    {cepLoading ? <Loader2 className="animate-spin"/> : <Search/>}
                </button>
                <button type="button" onClick={getMyLocation} className="bg-blue-100 text-blue-700 px-3 rounded-lg"><LocateFixed/></button>
            </div>

            {/* MAPA */}
            <div className="border rounded-xl overflow-hidden shadow-inner bg-gray-100 h-[300px] relative">
                {isLoaded ? (
                    <GoogleMap 
                        mapContainerStyle={mapContainerStyle} 
                        center={location} 
                        zoom={15} 
                        onLoad={map => { mapRef.current = map; }}
                        options={{streetViewControl:false, mapTypeControl:false}}
                    >
                        <Marker 
                            position={location} 
                            draggable={true} 
                            onDragEnd={(e) => { 
                                if(e.latLng) setLocation({lat: e.latLng.lat(), lng: e.latLng.lng()}); 
                            }}
                        />
                    </GoogleMap>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 gap-2"><Loader2 className="animate-spin"/> Carregando Mapa...</div>
                )}
                <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                    <span className="bg-white/90 px-3 py-1 rounded text-[10px] font-bold shadow text-gray-600">Arraste o pino para o local exato</span>
                </div>
            </div>

            {/* CAMPOS TEXTO */}
            <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Rua</label>
                    <input className="w-full p-3 border rounded-lg bg-gray-50" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase text-blue-600">Número</label>
                    <input id="input-number" className="w-full p-3 border-2 border-blue-100 focus:border-blue-500 rounded-lg font-bold" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} placeholder="Nº"/>
                </div>
            </div>
            
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                <input className="w-full p-3 border rounded-lg bg-gray-50" value={address.district} onChange={e => setAddress({...address, district: e.target.value})} />
            </div>

            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Complemento / Ponto de Ref.</label>
                <input className="w-full p-3 border rounded-lg" placeholder="Ex: Ao lado da farmácia..." value={address.complement} onChange={e => setAddress({...address, complement: e.target.value})} />
            </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg">
            {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>}
            {loading ? "Salvando..." : "Salvar Alterações"}
        </button>

      </form>
    </div>
  );
}