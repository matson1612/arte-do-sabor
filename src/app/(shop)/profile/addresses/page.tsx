// src/app/(shop)/profile/addresses/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, Plus, MapPin, Trash2, Search, Loader2, Save, X, Pencil } from "lucide-react";
import Link from "next/link";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { UserAddress, StoreSettings } from "@/types";

const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 
const DEFAULT_CENTER = { lat: -10.183760, lng: -48.333650 };
const LIBRARIES: ("geometry")[] = ["geometry"];

export default function AddressesPage() {
  const { user } = useAuth();
  const { isLoaded } = useJsApiLoader({ 
    id: 'google-map-script', 
    googleMapsApiKey: GOOGLE_MAPS_API_KEY, 
    libraries: LIBRARIES 
  });

  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // Estado do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // ID sendo editado
  
  const [newAddr, setNewAddr] = useState<Partial<UserAddress>>({
      regionType: 'plano_diretor',
      street: "", number: "", district: "", complement: "", nickname: "Minha Casa", cep: ""
  });
  const [addrMapLoc, setAddrMapLoc] = useState(DEFAULT_CENTER);
  const [saving, setSaving] = useState(false);

  // Carregar Dados
  useEffect(() => {
    const init = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "store_settings", "config"));
        if (settingsSnap.exists()) setStoreSettings(settingsSnap.data() as StoreSettings);

        if (user) {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists() && userSnap.data().savedAddresses) {
                setAddresses(userSnap.data().savedAddresses);
            }
        }
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    init();
  }, [user]);

  // Abrir Modal para Criar
  const openNew = () => {
      setEditingId(null);
      setNewAddr({ regionType: 'plano_diretor', street: "", number: "", district: "", complement: "", nickname: "Casa", cep: "" });
      setAddrMapLoc(DEFAULT_CENTER);
      setIsModalOpen(true);
  };

  // Abrir Modal para Editar
  const openEdit = (addr: UserAddress) => {
      setEditingId(addr.id);
      setNewAddr({ ...addr });
      if (addr.location) setAddrMapLoc(addr.location);
      setIsModalOpen(true);
  };

  const handleBuscaCep = async () => {
      if(!newAddr.cep || newAddr.cep.length < 8) return alert("CEP Inválido");
      try {
          const res = await fetch(`https://viacep.com.br/ws/${newAddr.cep.replace(/\D/g,'')}/json/`);
          const data = await res.json();
          if(!data.erro) {
              setNewAddr(prev => ({...prev, street: data.logradouro, district: data.bairro}));
              if(window.google) {
                  const geocoder = new window.google.maps.Geocoder();
                  geocoder.geocode({ address: newAddr.cep }, (results, status) => {
                      if(status === 'OK' && results?.[0]) {
                          const loc = results[0].geometry.location;
                          setAddrMapLoc({ lat: loc.lat(), lng: loc.lng() });
                      }
                  });
              }
          } else { alert("CEP não encontrado"); }
      } catch(e) { alert("Erro ao buscar CEP"); }
  };

  const handleSave = async () => {
      if(!newAddr.street || !newAddr.number) return alert("Preencha o endereço completo");
      if(!newAddr.nickname) return alert("Dê um nome para o local (Ex: Casa)");
      
      setSaving(true);
      try {
          let updatedList = [...addresses];

          if (editingId) {
              // Atualizar Existente
              updatedList = updatedList.map(a => a.id === editingId ? { ...a, ...newAddr as UserAddress, location: addrMapLoc } : a);
          } else {
              // Criar Novo
              const addressData: UserAddress = {
                  id: crypto.randomUUID(),
                  ...newAddr as UserAddress,
                  location: addrMapLoc
              };
              updatedList.push(addressData);
          }
          
          if(user) {
              await updateDoc(doc(db, "users", user.uid), { savedAddresses: updatedList });
              setAddresses(updatedList);
              setIsModalOpen(false);
          }
      } catch (e) { alert("Erro ao salvar"); }
      finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Excluir este endereço?")) return;
      try {
          const updatedList = addresses.filter(a => a.id !== id);
          if(user) {
              await updateDoc(doc(db, "users", user.uid), { savedAddresses: updatedList });
              setAddresses(updatedList);
          }
      } catch(e) { alert("Erro ao excluir"); }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-pink-600"/></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
        <div className="flex items-center gap-4 mb-6">
            <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></Link>
            <h1 className="text-xl font-bold text-slate-800">Meus Endereços</h1>
        </div>

        <div className="space-y-4">
            {addresses.map(addr => (
                <div key={addr.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start">
                    <div className="flex gap-3">
                        <div className="mt-1 text-pink-600"><MapPin size={20}/></div>
                        <div>
                            <h3 className="font-bold text-slate-800 uppercase text-sm">{addr.nickname}</h3>
                            <p className="text-sm text-slate-600 mt-1">{addr.street}, {addr.number}</p>
                            <p className="text-xs text-slate-500">{addr.district} • {addr.regionType === 'plano_diretor' ? 'Plano Diretor' : addr.sectorName}</p>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => openEdit(addr)} className="text-gray-400 hover:text-blue-600 p-2"><Pencil size={18}/></button>
                        <button onClick={() => handleDelete(addr.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                    </div>
                </div>
            ))}

            <button onClick={openNew} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-bold hover:bg-gray-50 hover:border-pink-300 hover:text-pink-600 transition">
                <Plus size={20}/> Cadastrar Novo Endereço
            </button>
        </div>

        {/* MODAL PADRONIZADO */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-2xl p-6 h-[85vh] sm:h-auto overflow-y-auto animate-in slide-in-from-bottom shadow-2xl relative">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X/></button>
                    <h2 className="font-bold text-lg mb-6 text-slate-800">{editingId ? 'Editar Endereço' : 'Novo Endereço'}</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Salvar como</label>
                            <input className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-pink-100" placeholder="Ex: Casa, Trabalho" value={newAddr.nickname} onChange={e => setNewAddr({...newAddr, nickname: e.target.value})} />
                        </div>

                        {/* SELETOR DE REGIÃO */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setNewAddr({...newAddr, regionType: 'plano_diretor', sectorName: undefined})} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newAddr.regionType === 'plano_diretor' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>Plano Diretor</button>
                            <button onClick={() => setNewAddr({...newAddr, regionType: 'outras_localidades'})} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${newAddr.regionType === 'outras_localidades' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>Outras Regiões</button>
                        </div>

                        {newAddr.regionType === 'plano_diretor' ? (
                            <div className="flex gap-2">
                                <input className="w-full p-3 border rounded-lg outline-none" placeholder="CEP (Busca Automática)" value={newAddr.cep} onChange={e => setNewAddr({...newAddr, cep: e.target.value})} maxLength={9}/>
                                <button onClick={handleBuscaCep} className="bg-slate-800 text-white px-4 rounded-lg"><Search size={20}/></button>
                            </div>
                        ) : (
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Selecione o Setor</label>
                                <select className="w-full p-3 border rounded-lg bg-white outline-none" value={newAddr.sectorName || ''} onChange={e => setNewAddr({...newAddr, sectorName: e.target.value})}>
                                    <option value="">-- Selecione na lista --</option>
                                    {storeSettings?.shipping.fixedAreas.map(area => (
                                        <option key={area.id} value={area.name}>{area.name} (+R$ {area.price})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div><input className="w-full p-3 border rounded-lg bg-gray-50 outline-none" placeholder="Rua / Avenida" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})} /></div>
                        <div className="flex gap-2">
                            <input className="w-28 p-3 border rounded-lg outline-none" placeholder="Número" value={newAddr.number} onChange={e => setNewAddr({...newAddr, number: e.target.value})} />
                            <input className="flex-1 p-3 border rounded-lg outline-none" placeholder="Complemento (Opcional)" value={newAddr.complement} onChange={e => setNewAddr({...newAddr, complement: e.target.value})} />
                        </div>

                        <div className="h-48 rounded-xl overflow-hidden border relative bg-gray-100">
                            {isLoaded && <GoogleMap mapContainerStyle={{width:'100%',height:'100%'}} center={addrMapLoc} zoom={16} onClick={(e) => e.latLng && setAddrMapLoc({lat: e.latLng.lat(), lng: e.latLng.lng()})}><Marker position={addrMapLoc} draggable onDragEnd={(e) => e.latLng && setAddrMapLoc({lat: e.latLng.lat(), lng: e.latLng.lng()})}/></GoogleMap>}
                            <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none"><span className="bg-white/90 text-[10px] font-bold px-3 py-1 rounded shadow text-slate-800">Arraste o pino para a posição exata</span></div>
                        </div>

                        <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition flex justify-center items-center gap-2">
                            {saving ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Salvar Endereço</>}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}