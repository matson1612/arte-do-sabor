// src/app/(admin)/admin/settings/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Save, MapPin, Store, Phone, Loader2, Search, CreditCard, Truck, Key, Mail, FileText } from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { StoreSettings } from "@/types";

// ⚠️ MANTENHA SUA CHAVE AQUI
const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 
const DEFAULT_CENTER = { lat: -10.183760, lng: -48.333650 }; // Palmas

const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '0.75rem' };

// Configuração Padrão Inicial
const DEFAULT_SETTINGS: StoreSettings = {
    storeName: "Arte do Sabor", cnpj: "", email: "", whatsapp: "5563999999999",
    address: { street: "", number: "", district: "", city: "Palmas", state: "TO", cep: "" },
    location: DEFAULT_CENTER,
    pix: { key: "", name: "Arte do Sabor", city: "Palmas" },
    paymentMethods: {
        pix: { active: true, label: "PIX", feePercent: 0, discountPercent: 0 },
        money: { active: true, label: "Dinheiro", feePercent: 0, discountPercent: 0 },
        link_debit: { active: true, label: "Link Débito", feePercent: 0, discountPercent: 0 },
        link_credit: { active: true, label: "Link Crédito", feePercent: 0, discountPercent: 0 },
        monthly: { active: true, label: "Conta Mensal", feePercent: 0, discountPercent: 0 },
    },
    shipping: { type: 'fixed', fixedPrice: 5.00, pricePerKm: 2.00, freeShippingAbove: 0 }
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'payment' | 'shipping'>('info');

  // Estado unificado com tipos
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [cepInput, setCepInput] = useState("");

  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  // Carregar Dados
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, "settings", "info");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          // Mescla dados do banco com o default para garantir que novos campos existam
          const data = snap.data();
          setSettings(prev => ({
              ...prev,
              ...data,
              // Garante que objetos aninhados existam mesmo se o banco for antigo
              pix: { ...prev.pix, ...(data.pix || {}) },
              paymentMethods: { ...prev.paymentMethods, ...(data.paymentMethods || {}) },
              shipping: { ...prev.shipping, ...(data.shipping || {}) },
              address: { ...prev.address, ...(data.address || {}) }
          }));
          
          if(data.address?.cep) setCepInput(data.address.cep);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setDataLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const handleBuscaCep = async () => {
    const rawCep = cepInput.replace(/\D/g, '');
    if (rawCep.length !== 8) return alert("CEP inválido");

    try {
        // 1. ViaCEP
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        
        if (!data.erro) {
            setSettings(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    street: data.logradouro,
                    district: data.bairro,
                    city: data.localidade,
                    state: data.uf,
                    cep: rawCep
                }
            }));
            
            // 2. Google Maps
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
                        setSettings(prev => ({ ...prev, location: newPos }));
                        mapRef.current?.panTo(newPos);
                        mapRef.current?.setZoom(17);
                    }
                });
            }
        } else {
            alert("CEP não encontrado.");
        }
    } catch (e) { alert("Erro ao buscar CEP"); }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    setLoading(true);
    try {
        await setDoc(doc(db, "settings", "info"), {
            ...settings,
            updatedAt: serverTimestamp()
        });
        alert("Configurações salvas com sucesso!");
    } catch (error) {
        alert("Erro ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  const updatePayment = (key: keyof typeof settings.paymentMethods, field: string, value: any) => {
      setSettings(prev => ({
          ...prev,
          paymentMethods: {
              ...prev.paymentMethods,
              [key]: { ...prev.paymentMethods[key], [field]: value }
          }
      }));
  };

  if (!dataLoaded) return <div className="p-10 text-center"><Loader2 className="animate-spin inline"/> Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 p-4 md:p-6">
      <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Store className="text-pink-600"/> Configuração da Loja
          </h1>
          <button onClick={() => handleSave()} disabled={loading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-lg disabled:opacity-70">
              {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Salvar
          </button>
      </div>

      {/* Navegação de Abas */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {[
              { id: 'info', label: 'Dados & Endereço', icon: MapPin },
              { id: 'payment', label: 'Pagamentos & PIX', icon: CreditCard },
              { id: 'shipping', label: 'Frete & Entrega', icon: Truck },
          ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-pink-600 text-pink-600 bg-pink-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                  <tab.icon size={18}/> {tab.label}
              </button>
          ))}
      </div>

      {/* --- ABA 1: INFO E MAPA --- */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                    <h2 className="font-bold text-lg text-gray-700 border-b pb-2 flex items-center gap-2"><Store size={18}/> Identidade</h2>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Loja</label>
                        <input className="w-full p-3 border rounded-lg" value={settings.storeName} onChange={e => setSettings({...settings, storeName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                            <input className="w-full p-3 border rounded-lg" value={settings.cnpj} onChange={e => setSettings({...settings, cnpj: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp Pedidos</label>
                            <input className="w-full p-3 border rounded-lg bg-green-50 border-green-200" value={settings.whatsapp} onChange={e => setSettings({...settings, whatsapp: e.target.value.replace(/\D/g, '')})} placeholder="55639..." />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Responsável</label>
                        <input className="w-full p-3 border rounded-lg" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                    <h2 className="font-bold text-lg text-gray-700 border-b pb-2 flex items-center gap-2"><MapPin size={18}/> Endereço Base</h2>
                    <div className="flex gap-2">
                        <input className="w-full p-2 border rounded" placeholder="CEP" value={cepInput} onChange={e => setCepInput(e.target.value)} />
                        <button type="button" onClick={handleBuscaCep} className="bg-slate-800 text-white px-3 rounded"><Search/></button>
                    </div>
                    <input className="w-full p-3 border rounded-lg bg-gray-50" value={settings.address.street} readOnly />
                    <div className="flex gap-2">
                        <input className="w-32 p-3 border rounded-lg" value={settings.address.number} onChange={e => setSettings({...settings, address: {...settings.address, number: e.target.value}})} placeholder="Nº" />
                        <input className="w-full p-3 border rounded-lg bg-gray-50" value={settings.address.district} readOnly />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input className="p-3 border rounded-lg bg-gray-50" value={settings.address.city} readOnly />
                        <input className="p-3 border rounded-lg bg-gray-50" value={settings.address.state} readOnly />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
                <h2 className="font-bold text-lg text-gray-700 mb-4">Localização (Google Maps)</h2>
                <div className="border rounded-xl overflow-hidden shadow-inner bg-gray-100 relative">
                    {isLoaded ? (
                        <GoogleMap mapContainerStyle={mapContainerStyle} center={settings.location} zoom={16} onLoad={map => { mapRef.current = map; }}>
                            <Marker 
                                position={settings.location} 
                                draggable={true} 
                                onDragEnd={(e) => { 
                                    if(e.latLng) setSettings(prev => ({...prev, location: {lat: e.latLng!.lat(), lng: e.latLng!.lng()}})); 
                                }} 
                            />
                        </GoogleMap>
                    ) : <div className="h-[350px] flex items-center justify-center">Carregando Mapa...</div>}
                    <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none"><span className="bg-white/90 px-3 py-1 rounded text-xs font-bold shadow text-slate-800">Arraste o pino para ajustar</span></div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">Esta localização será usada para calcular o frete por distância.</p>
            </div>
        </div>
      )}

      {/* --- ABA 2: PAGAMENTOS --- */}
      {activeTab === 'payment' && (
          <div className="space-y-6 animate-in fade-in">
              {/* PIX */}
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
                  <h2 className="font-bold text-lg text-emerald-800 border-b border-emerald-200 pb-2 mb-4 flex items-center gap-2"><Key size={20}/> Chave PIX (Recebimento)</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                          <label className="text-xs font-bold text-emerald-700 uppercase block mb-1">Chave PIX</label>
                          <input className="w-full p-3 border border-emerald-300 rounded-lg" placeholder="CPF, Email ou Aleatória" value={settings.pix.key} onChange={e => setSettings({...settings, pix: {...settings.pix, key: e.target.value}})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-emerald-700 uppercase block mb-1">Nome Titular</label>
                          <input className="w-full p-3 border border-emerald-300 rounded-lg" value={settings.pix.name} onChange={e => setSettings({...settings, pix: {...settings.pix, name: e.target.value}})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-emerald-700 uppercase block mb-1">Cidade Titular</label>
                          <input className="w-full p-3 border border-emerald-300 rounded-lg" value={settings.pix.city} onChange={e => setSettings({...settings, pix: {...settings.pix, city: e.target.value}})} />
                      </div>
                  </div>
              </div>

              {/* Métodos */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h2 className="font-bold text-lg text-slate-800 mb-6">Formas de Pagamento</h2>
                  <div className="space-y-4">
                      {Object.entries(settings.paymentMethods).map(([key, method]) => (
                          <div key={key} className="flex flex-col md:flex-row items-center gap-4 p-4 border rounded-xl bg-gray-50 hover:border-blue-200 transition">
                              <div className="flex items-center gap-3 w-full md:w-48">
                                  <input 
                                    type="checkbox" 
                                    className="w-5 h-5 accent-blue-600" 
                                    checked={method.active} 
                                    onChange={e => updatePayment(key as any, 'active', e.target.checked)} 
                                  />
                                  <span className="font-bold text-slate-700 capitalize">{key.replace('_', ' ')}</span>
                              </div>
                              <div className="flex gap-4 flex-1 w-full">
                                  <div className="flex-1">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase">Rótulo no App</label>
                                      <input className="w-full p-2 border rounded bg-white text-sm" value={method.label} onChange={e => updatePayment(key as any, 'label', e.target.value)} />
                                  </div>
                                  <div className="w-24">
                                      <label className="text-[10px] font-bold text-red-400 uppercase">Taxa (%)</label>
                                      <input type="number" className="w-full p-2 border rounded bg-white text-sm" placeholder="0" value={method.feePercent} onChange={e => updatePayment(key as any, 'feePercent', Number(e.target.value))} />
                                  </div>
                                  <div className="w-24">
                                      <label className="text-[10px] font-bold text-green-500 uppercase">Desc. (%)</label>
                                      <input type="number" className="w-full p-2 border rounded bg-white text-sm" placeholder="0" value={method.discountPercent} onChange={e => updatePayment(key as any, 'discountPercent', Number(e.target.value))} />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- ABA 3: FRETE --- */}
      {activeTab === 'shipping' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h2 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">Cálculo de Entrega</h2>
                  
                  <div className="flex gap-4 mb-6">
                      <button 
                        onClick={() => setSettings({...settings, shipping: {...settings.shipping, type: 'fixed'}})}
                        className={`flex-1 p-4 border rounded-xl font-bold transition ${settings.shipping.type === 'fixed' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                      >
                          Valor Fixo
                      </button>
                      <button 
                        onClick={() => setSettings({...settings, shipping: {...settings.shipping, type: 'distance'}})}
                        className={`flex-1 p-4 border rounded-xl font-bold transition ${settings.shipping.type === 'distance' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                      >
                          Por Distância (KM)
                      </button>
                  </div>

                  {settings.shipping.type === 'fixed' ? (
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Preço Fixo da Entrega (R$)</label>
                          <input type="number" className="w-full p-3 border rounded-lg text-lg font-bold" value={settings.shipping.fixedPrice} onChange={e => setSettings({...settings, shipping: {...settings.shipping, fixedPrice: Number(e.target.value)}})} />
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Preço por KM (R$)</label>
                              <input type="number" className="w-full p-3 border rounded-lg" value={settings.shipping.pricePerKm} onChange={e => setSettings({...settings, shipping: {...settings.shipping, pricePerKm: Number(e.target.value)}})} />
                          </div>
                          <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200">
                              O cálculo usará a localização definida na aba "Dados & Endereço" como ponto de partida.
                          </div>
                      </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-gray-100">
                      <label className="text-xs font-bold text-green-600 uppercase block mb-1">Frete Grátis Acima de (R$)</label>
                      <input type="number" className="w-full p-3 border rounded-lg border-green-200" placeholder="0 para desativar" value={settings.shipping.freeShippingAbove || 0} onChange={e => setSettings({...settings, shipping: {...settings.shipping, freeShippingAbove: Number(e.target.value)}})} />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}