// src/app/(shop)/profile/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User, MapPin, Save, LogOut, Loader2, Search, LocateFixed, Phone, Plus, Trash2, Home } from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const mapContainerStyle = { width: '100%', height: '300px', borderRadius: '0.75rem' };
const defaultCenter = { lat: -10.183760, lng: -48.333650 };
const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 

// Tipo para endereço
type SavedAddress = {
  id: string;
  nickname: string; // Ex: Casa, Trabalho
  street: string;
  number: string;
  district: string;
  complement: string;
  location: { lat: number; lng: number };
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Dados Pessoais
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Lista de Endereços Salvos
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  
  // Controle de "Novo Endereço"
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newNickname, setNewNickname] = useState("Minha Casa");
  const [cepInput, setCepInput] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [newAddress, setNewAddress] = useState({ street: "", number: "", district: "", complement: "" });
  const [newLocation, setNewLocation] = useState(defaultCenter);

  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  // Carregar Dados
  useEffect(() => {
    if (!user) { setDataLoading(false); return; }
    const loadProfile = async () => {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setName(data.name || user.displayName || "");
                setPhone(data.phone || "");
                if (data.savedAddresses) setSavedAddresses(data.savedAddresses);
            } else { setName(user.displayName || ""); }
        } catch (error) { console.error(error); } finally { setDataLoading(false); }
    };
    loadProfile();
  }, [user]);

  // Busca CEP (Com Mapa)
  const handleBuscaCep = async () => {
    const rawCep = cepInput.replace(/\D/g, '');
    if (rawCep.length !== 8) return alert("CEP inválido.");
    setCepLoading(true);

    try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
            setNewAddress(prev => ({ ...prev, street: data.logradouro, district: data.bairro, number: "" }));
            
            if (window.google && window.google.maps) {
                const geocoder = new window.google.maps.Geocoder();
                const formattedCep = rawCep.replace(/^(\d{5})(\d{3})/, '$1-$2');
                geocoder.geocode({ address: formattedCep, componentRestrictions: { country: 'BR', postalCode: rawCep } }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        const loc = results[0].geometry.location;
                        const pos = { lat: loc.lat(), lng: loc.lng() };
                        setNewLocation(pos);
                        mapRef.current?.panTo(pos);
                        mapRef.current?.setZoom(17);
                    }
                });
            }
        } else { alert("CEP não encontrado."); }
    } catch (e) { alert("Erro na busca."); } finally { setCepLoading(false); }
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
        const posObj = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setNewLocation(posObj);
        mapRef.current?.panTo(posObj);
        mapRef.current?.setZoom(17);
    });
  };

  // Salvar Novo Endereço na Lista
  const saveNewAddress = () => {
    if(!newAddress.street || !newAddress.number) return alert("Preencha rua e número.");
    
    const addressToAdd: SavedAddress = {
        id: Math.random().toString(36).substr(2, 9),
        nickname: newNickname,
        street: newAddress.street,
        number: newAddress.number,
        district: newAddress.district,
        complement: newAddress.complement,
        location: newLocation
    };

    setSavedAddresses([...savedAddresses, addressToAdd]);
    setIsAddingAddress(false); // Fecha formulário
    // Reseta form
    setNewAddress({ street: "", number: "", district: "", complement: "" });
    setCepInput("");
  };

  // Remover Endereço
  const removeAddress = (id: string) => {
    if(confirm("Remover este endereço?")) {
        setSavedAddresses(savedAddresses.filter(a => a.id !== id));
    }
  };

  // Salvar TUDO no Firebase
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
        await setDoc(doc(db, "users", user.uid), { 
            name, 
            phone, 
            savedAddresses, // Salva o array de endereços
            updatedAt: new Date() 
        }, { merge: true });
        alert("Perfil atualizado!");
    } catch (error) { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  if (dataLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-pink-600"/></div>;
  if (!user) return <div className="p-10 text-center">Faça login para gerenciar endereços.</div>;

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Meu Perfil</h1>
        <button onClick={logout} className="text-red-500 text-sm font-bold flex items-center gap-1 bg-white px-3 py-1 rounded border shadow-sm"><LogOut size={16}/> Sair</button>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* DADOS PESSOAIS */}
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-pink-600"><User size={20}/> Dados Pessoais</h2>
            <input className="w-full p-3 border rounded-lg" value={name} onChange={e => setName(e.target.value)} placeholder="Seu Nome" />
            <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={18}/>
                <input className="w-full pl-10 p-3 border rounded-lg" placeholder="Telefone" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
        </div>

        {/* MEUS ENDEREÇOS (LISTA) */}
        <div className="space-y-4">
            <div className="flex justify-between items-end">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><MapPin size={20}/> Meus Endereços</h2>
                {!isAddingAddress && (
                    <button type="button" onClick={() => setIsAddingAddress(true)} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-bold flex items-center gap-1">
                        <Plus size={16}/> Novo
                    </button>
                )}
            </div>

            {/* Lista dos Salvos */}
            {!isAddingAddress && savedAddresses.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Nenhum endereço salvo.</p>}
            
            {!isAddingAddress && savedAddresses.map(addr => (
                <div key={addr.id} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
                    <div>
                        <p className="font-bold text-gray-800 flex items-center gap-2"><Home size={14} className="text-pink-500"/> {addr.nickname}</p>
                        <p className="text-sm text-gray-500">{addr.street}, {addr.number} - {addr.district}</p>
                    </div>
                    <button type="button" onClick={() => removeAddress(addr.id)} className="text-red-400 p-2 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                </div>
            ))}

            {/* FORMULÁRIO DE NOVO ENDEREÇO (Aparece ao clicar em Novo) */}
            {isAddingAddress && (
                <div className="bg-white p-4 rounded-xl border-2 border-blue-100 shadow-md animate-in fade-in space-y-3">
                    <p className="font-bold text-blue-600 text-sm mb-2">Cadastrar Novo Endereço</p>
                    
                    <input className="w-full p-2 border rounded" placeholder="Apelido (Ex: Casa, Trabalho)" value={newNickname} onChange={e => setNewNickname(e.target.value)} />
                    
                    <div className="flex gap-2">
                        <input className="flex-1 p-2 border rounded font-mono" placeholder="CEP" value={cepInput} onChange={e => setCepInput(e.target.value)} maxLength={9}/>
                        <button type="button" onClick={handleBuscaCep} className="bg-slate-800 text-white px-3 rounded">{cepLoading ? <Loader2 className="animate-spin"/> : <Search size={16}/>}</button>
                        <button type="button" onClick={getMyLocation} className="bg-blue-100 text-blue-700 px-3 rounded"><LocateFixed/></button>
                    </div>

                    {/* Mapa Pequeno */}
                    <div className="h-[200px] rounded-lg overflow-hidden relative border bg-gray-100">
                         {isLoaded ? (
                            <GoogleMap mapContainerStyle={{width:'100%', height:'100%'}} center={newLocation} zoom={16} onLoad={map => { mapRef.current = map; }} options={{disableDefaultUI:true, gestureHandling: "greedy"}}>
                                <Marker position={newLocation} draggable={true} onDragEnd={(e) => { if(e.latLng) setNewLocation({lat: e.latLng.lat(), lng: e.latLng.lng()}); }}/>
                            </GoogleMap>
                        ) : <div className="h-full flex items-center justify-center text-xs">Carregando...</div>}
                    </div>

                    <input className="w-full p-2 border rounded bg-gray-50" value={newAddress.street} readOnly placeholder="Rua" />
                    <div className="flex gap-2">
                         <input className="w-24 p-2 border rounded font-bold" value={newAddress.number} onChange={e => setNewAddress({...newAddress, number: e.target.value})} placeholder="Nº"/>
                         <input className="flex-1 p-2 border rounded bg-gray-50" value={newAddress.district} readOnly placeholder="Bairro"/>
                    </div>
                    <input className="w-full p-2 border rounded" value={newAddress.complement} onChange={e => setNewAddress({...newAddress, complement: e.target.value})} placeholder="Complemento"/>

                    <div className="flex gap-2 mt-2">
                        <button type="button" onClick={() => setIsAddingAddress(false)} className="flex-1 py-2 text-gray-500 border rounded hover:bg-gray-50">Cancelar</button>
                        <button type="button" onClick={saveNewAddress} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Confirmar</button>
                    </div>
                </div>
            )}
        </div>

        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg">
            {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Salvar Alterações
        </button>
      </form>
    </div>
  );
}