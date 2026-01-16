// src/app/(shop)/profile/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { User, MapPin, Save, LogOut, Loader2, Search, LocateFixed, Phone } from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const mapContainerStyle = { width: '100%', height: '300px', borderRadius: '0.75rem' };
const defaultCenter = { lat: -10.183760, lng: -48.333650 };
const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cepInput, setCepInput] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  
  const [address, setAddress] = useState({ street: "", number: "", district: "", city: "Palmas", state: "TO", complement: "" });
  const [location, setLocation] = useState(defaultCenter);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY });

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
                if (data.address) setAddress(data.address);
                if (data.location) setLocation(data.location);
            } else { setName(user.displayName || ""); }
        } catch (error) { console.error(error); } finally { setDataLoading(false); }
    };
    loadProfile();
  }, [user]);

  // --- BUSCA CEP AJUSTADA ---
  const handleBuscaCep = async () => {
    const rawCep = cepInput.replace(/\D/g, '');
    if (rawCep.length !== 8) return alert("CEP inválido.");
    setCepLoading(true);

    try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        
        if (!data.erro) {
            setAddress(prev => ({ ...prev, street: data.logradouro, district: data.bairro, city: data.localidade, state: data.uf, number: "" }));

            if (window.google && window.google.maps) {
                const geocoder = new window.google.maps.Geocoder();
                const formattedCep = rawCep.replace(/^(\d{5})(\d{3})/, '$1-$2');

                geocoder.geocode({ 
                    address: formattedCep,
                    componentRestrictions: { country: 'BR', postalCode: rawCep }
                }, (results, status) => {
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
        } else { alert("CEP não encontrado."); }
    } catch (e) { alert("Erro na busca."); } finally { setCepLoading(false); }
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
        await setDoc(doc(db, "users", user.uid), { name, phone, address, location, updatedAt: new Date() }, { merge: true });
        alert("Perfil salvo!");
    } catch (error) { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  if (dataLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-pink-600"/></div>;
  if (!user) return <div className="p-10 text-center">Faça login.</div>;

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Meu Perfil</h1>
        <button onClick={logout} className="text-red-500 text-sm font-bold flex items-center gap-1 bg-white px-3 py-1 rounded border shadow-sm"><LogOut size={16}/> Sair</button>
      </div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-pink-600"><User size={20}/> Dados Pessoais</h2>
            <input className="w-full p-3 border rounded-lg" value={name} onChange={e => setName(e.target.value)} placeholder="Nome" />
            <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={18}/>
                <input className="w-full pl-10 p-3 border rounded-lg" placeholder="Telefone" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-blue-600"><MapPin size={20}/> Endereço</h2>
            <div className="flex gap-2">
                <input className="flex-1 p-3 border rounded-lg font-mono" placeholder="CEP" value={cepInput} onChange={e => setCepInput(e.target.value)} maxLength={9}/>
                <button type="button" onClick={handleBuscaCep} disabled={cepLoading} className="bg-slate-800 text-white px-4 rounded-lg">{cepLoading ? <Loader2 className="animate-spin"/> : <Search/>}</button>
                <button type="button" onClick={getMyLocation} className="bg-blue-100 text-blue-700 px-3 rounded-lg"><LocateFixed/></button>
            </div>
            <div className="border rounded-xl overflow-hidden shadow-inner bg-gray-100 h-[300px] relative">
                {isLoaded ? (
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={location} zoom={15} onLoad={map => { mapRef.current = map; }} options={{streetViewControl:false, mapTypeControl:false, gestureHandling: "greedy"}}>
                        <Marker position={location} draggable={true} onDragEnd={(e) => { if(e.latLng) setLocation({lat: e.latLng.lat(), lng: e.latLng.lng()}); }}/>
                    </GoogleMap>
                ) : <div className="h-full flex items-center justify-center text-gray-400 gap-2"><Loader2 className="animate-spin"/> Mapa...</div>}
                <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none"><span className="bg-white/90 px-3 py-1 rounded text-[10px] font-bold shadow text-gray-600">Arraste o pino</span></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3"><label className="text-xs font-bold text-gray-500">Rua</label><input className="w-full p-3 border rounded-lg bg-gray-50" value={address.street} readOnly /></div>
                <div><label className="text-xs font-bold text-gray-500 text-blue-600">Nº</label><input id="input-number" className="w-full p-3 border-2 border-blue-100 font-bold rounded-lg" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} /></div>
            </div>
            <div><label className="text-xs font-bold text-gray-500">Bairro</label><input className="w-full p-3 border rounded-lg bg-gray-50" value={address.district} readOnly /></div>
            <input className="w-full p-3 border rounded-lg" placeholder="Complemento" value={address.complement} onChange={e => setAddress({...address, complement: e.target.value})} />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg">{loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Salvar</button>
      </form>
    </div>
  );
}