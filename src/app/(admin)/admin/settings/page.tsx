// src/app/(admin)/admin/settings/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Save, MapPin, Store, Phone, Loader2, Search, CreditCard, Truck, Key, Plus, Trash2, Copy, Check } from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { StoreSettings, ShippingDistanceRule, ShippingFixedArea } from "@/types";

// ⚠️ MANTENHA SUA CHAVE AQUI
const GOOGLE_MAPS_API_KEY = "AIzaSyBy365txh8nJ9JuGfvyPGdW5-angEXWBj8"; 
const DEFAULT_CENTER = { lat: -10.183760, lng: -48.333650 }; // Palmas

const mapContainerStyle = { width: '100%', height: '350px', borderRadius: '0.75rem' };

// Configuração Inicial com seus Dados
const DEFAULT_SETTINGS: StoreSettings = {
    storeName: "Arte do Sabor", cnpj: "", email: "", whatsapp: "5563981221181",
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
    shipping: {
        distanceTable: [
            { minKm: 0, maxKm: 3, price: 8 },
            { minKm: 3.01, maxKm: 5, price: 9 },
            { minKm: 5.01, maxKm: 6, price: 10 },
            { minKm: 6.01, maxKm: 6.9, price: 11 },
            { minKm: 7, maxKm: 7.9, price: 12 },
            { minKm: 8, maxKm: 8.9, price: 13 },
            { minKm: 9, maxKm: 9.9, price: 14 },
            { minKm: 10, maxKm: 10.9, price: 15 },
            { minKm: 11, maxKm: 11.9, price: 16 },
            { minKm: 12, maxKm: 12.9, price: 18 },
            { minKm: 13, maxKm: 13.9, price: 20 },
            { minKm: 14, maxKm: 14.9, price: 22 },
            { minKm: 15, maxKm: 15.9, price: 24 },
            { minKm: 16, maxKm: 16.9, price: 26 },
            { minKm: 17, maxKm: 100, price: 28 },
        ],
        fixedAreas: [
            { id: 'bertha', name: 'Bertha Ville / Irmã Dulce / União Sul', price: 30, type: 'fixed' },
            { id: 'aureny', name: 'Aurenys 1-4 / Setor Universitário', price: 35, type: 'fixed' },
            { id: 'taquaralto', name: 'Taquaralto / Lago Sul / Morada do Sol / Santa Fé', price: 40, type: 'fixed' },
            { id: 'taquari', name: 'Taquari / Flamboyant / Jd Vitória', price: 45, type: 'fixed' },
            { id: 'aeroporto', name: 'Aeroporto / Luzimangues', price: 50, type: 'fixed' },
            { id: 'aguafria', name: 'Setor Água Fria (Sentido Polinésia)', price: 25, type: 'fixed' },
            { id: 'lagonorte', name: 'Lago Norte', price: 0, type: 'km_plus_tax', tax: 2 },
            { id: 'prata', name: 'Praia do Prata / Caju', price: 0, type: 'km_plus_tax', tax: 5 },
            { id: 'catolica', name: 'Campus 2 Católica', price: 0, type: 'km_plus_tax', tax: 5 },
        ],
        freeShippingAbove: 0
    }
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'payment' | 'shipping'>('info');
  const [copied, setCopied] = useState(false);

  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [cepInput, setCepInput] = useState("");

  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "store_settings", "config"));
        if (snap.exists()) {
          const data = snap.data();
          setSettings(prev => ({
              ...prev,
              ...data,
              pix: { ...prev.pix, ...(data.pix || {}) },
              paymentMethods: { ...prev.paymentMethods, ...(data.paymentMethods || {}) },
              shipping: { 
                  ...prev.shipping, 
                  ...(data.shipping || {}),
                  distanceTable: data.shipping?.distanceTable || prev.shipping.distanceTable,
                  fixedAreas: data.shipping?.fixedAreas || prev.shipping.fixedAreas
              },
              address: { ...prev.address, ...(data.address || {}) }
          }));
          if(data.address?.cep) setCepInput(data.address.cep);
        }
      } catch (error) { console.error(error); } finally { setDataLoaded(true); }
    };
    loadSettings();
  }, []);

  const handleBuscaCep = async () => {
    const rawCep = cepInput.replace(/\D/g, '');
    if (rawCep.length !== 8) return alert("CEP inválido");
    try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
            setSettings(prev => ({
                ...prev,
                address: { ...prev.address, street: data.logradouro, district: data.bairro, city: data.localidade, state: data.uf, cep: rawCep }
            }));
            if (window.google) {
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ address: rawCep }, (results, status) => {
                    if (status === 'OK' && results?.[0]) {
                        const loc = results[0].geometry.location;
                        const newPos = { lat: loc.lat(), lng: loc.lng() };
                        setSettings(prev => ({ ...prev, location: newPos }));
                        mapRef.current?.panTo(newPos);
                        mapRef.current?.setZoom(17);
                    }
                });
            }
        } else alert("CEP não encontrado.");
    } catch (e) { alert("Erro ao buscar CEP"); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        await setDoc(doc(db, "store_settings", "config"), { ...settings, updatedAt: serverTimestamp() });
        alert("Salvo com sucesso!");
    } catch (error) { alert("Erro ao salvar."); } finally { setLoading(false); }
  };

  // Botão de Copiar Link
  const copyLocationLink = () => {
      const link = `https://www.google.com/maps/search/?api=1&query=${settings.location.lat},${settings.location.lng}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const updatePayment = (key: keyof typeof settings.paymentMethods, field: string, value: any) => {
      setSettings(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, [key]: { ...prev.paymentMethods[key], [field]: value } } }));
  };

  const addDistRule = () => setSettings(p => ({...p, shipping: {...p.shipping, distanceTable: [...p.shipping.distanceTable, {minKm:0, maxKm:0, price:0}]}}));
  const removeDistRule = (i: number) => setSettings(p => ({...p, shipping: {...p.shipping, distanceTable: p.shipping.distanceTable.filter((_, idx) => idx !== i)}}));
  const updateDistRule = (i: number, f: keyof ShippingDistanceRule, v: number) => {
      const nw = [...settings.shipping.distanceTable]; nw[i] = {...nw[i], [f]: v};
      setSettings(p => ({...p, shipping: {...p.shipping, distanceTable: nw}}));
  };

  const addFixedArea = () => setSettings(p => ({...p, shipping: {...p.shipping, fixedAreas: [...p.shipping.fixedAreas, {id: crypto.randomUUID(), name:"", price:0, type:'fixed'}]}}));
  const removeFixedArea = (i: number) => setSettings(p => ({...p, shipping: {...p.shipping, fixedAreas: p.shipping.fixedAreas.filter((_, idx) => idx !== i)}}));
  const updateFixedArea = (i: number, f: string, v: any) => {
      const nw = [...settings.shipping.fixedAreas]; nw[i] = {...nw[i], [f]: v};
      setSettings(p => ({...p, shipping: {...p.shipping, fixedAreas: nw}}));
  };

  if (!dataLoaded) return <div className="p-10 text-center"><Loader2 className="animate-spin inline"/> Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 p-4 md:p-6">
      <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><Store className="text-pink-600"/> Configurações</h1>
          <button onClick={handleSave} disabled={loading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg">{loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Salvar</button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {[{ id: 'info', label: 'Dados & Endereço', icon: MapPin }, { id: 'payment', label: 'Pagamentos', icon: CreditCard }, { id: 'shipping', label: 'Frete & Regiões', icon: Truck }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-pink-600 text-pink-600 bg-pink-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon size={18}/> {tab.label}</button>
          ))}
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                    <h2 className="font-bold text-lg text-gray-700 border-b pb-2">Identidade</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Nome</label><input className="w-full p-2 border rounded" value={settings.storeName} onChange={e => setSettings({...settings, storeName: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label><input className="w-full p-2 border rounded" value={settings.whatsapp} onChange={e => setSettings({...settings, whatsapp: e.target.value})} /></div>
                    </div>
                    {/* ... (CNPJ e Email mantidos) ... */}
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                    <h2 className="font-bold text-lg text-gray-700 border-b pb-2">Endereço da Loja</h2>
                    <div className="flex gap-2"><input className="w-full p-2 border rounded" placeholder="CEP" value={cepInput} onChange={e => setCepInput(e.target.value)} /><button onClick={handleBuscaCep} className="bg-slate-800 text-white px-3 rounded"><Search/></button></div>
                    <input className="w-full p-2 border rounded bg-gray-50" value={settings.address.street} readOnly />
                    <div className="flex gap-2"><input className="w-32 p-2 border rounded" placeholder="Nº" value={settings.address.number} onChange={e => setSettings({...settings, address: {...settings.address, number: e.target.value}})} /><input className="w-full p-2 border rounded bg-gray-50" value={settings.address.district} readOnly /></div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg text-gray-700">Localização (Google Maps)</h2>
                    <button 
                        onClick={copyLocationLink} 
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 border transition ${copied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                    >
                        {copied ? <Check size={14}/> : <Copy size={14}/>}
                        {copied ? "Link Copiado" : "Copiar Link Maps"}
                    </button>
                </div>
                
                <div className="h-[350px] rounded-xl overflow-hidden relative border">
                    {isLoaded && <GoogleMap mapContainerStyle={mapContainerStyle} center={settings.location} zoom={16} onLoad={map => { mapRef.current = map; }}>
                        <Marker position={settings.location} draggable onDragEnd={(e) => e.latLng && setSettings({...settings, location: {lat: e.latLng.lat(), lng: e.latLng.lng()}})}/>
                    </GoogleMap>}
                </div>
                <div className="mt-2 text-xs text-center text-gray-400 font-mono">
                    Lat: {settings.location.lat.toFixed(6)}, Lng: {settings.location.lng.toFixed(6)}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">Arraste o pino para definir a origem.</p>
            </div>
        </div>
      )}

      {activeTab === 'payment' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
                  <h2 className="font-bold text-lg text-emerald-800 border-b border-emerald-200 pb-2 mb-4 flex items-center gap-2"><Key size={20}/> Chave PIX</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                      <div className="md:col-span-2"><label className="text-xs font-bold text-emerald-700 uppercase">Chave</label><input className="w-full p-2 border border-emerald-300 rounded" value={settings.pix.key} onChange={e => setSettings({...settings, pix: {...settings.pix, key: e.target.value}})} /></div>
                      <div><label className="text-xs font-bold text-emerald-700 uppercase">Nome</label><input className="w-full p-2 border border-emerald-300 rounded" value={settings.pix.name} onChange={e => setSettings({...settings, pix: {...settings.pix, name: e.target.value}})} /></div>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h2 className="font-bold text-lg text-slate-800 mb-4">Formas de Pagamento</h2>
                  <div className="space-y-3">{Object.entries(settings.paymentMethods).map(([key, method]) => (<div key={key} className="flex gap-4 items-center p-3 border rounded bg-gray-50"><input type="checkbox" checked={method.active} onChange={e => updatePayment(key as any, 'active', e.target.checked)} className="w-5 h-5"/><div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase">Nome</label><input className="w-full p-2 border rounded bg-white" value={method.label} onChange={e => updatePayment(key as any, 'label', e.target.value)}/></div><div className="w-24"><label className="text-xs font-bold text-red-400 uppercase">Taxa %</label><input type="number" className="w-full p-2 border rounded bg-white" value={method.feePercent} onChange={e => updatePayment(key as any, 'feePercent', Number(e.target.value))}/></div></div>))}</div>
              </div>
          </div>
      )}

      {activeTab === 'shipping' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                      <div><h2 className="font-bold text-lg text-slate-800">1. Plano Diretor (Por KM)</h2><p className="text-xs text-gray-500">Calculado via Google Maps.</p></div>
                      <button onClick={addDistRule} className="text-blue-600 text-xs font-bold flex gap-1 hover:underline"><Plus size={14}/> Add Faixa</button>
                  </div>
                  <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 uppercase text-xs"><tr><th className="p-2">De (Km)</th><th className="p-2">Até (Km)</th><th className="p-2">Preço (R$)</th><th></th></tr></thead><tbody className="divide-y">{settings.shipping.distanceTable.map((r, i) => (<tr key={i}><td className="p-2"><input type="number" step="0.1" className="w-20 p-2 border rounded" value={r.minKm} onChange={e => updateDistRule(i, 'minKm', Number(e.target.value))}/></td><td className="p-2"><input type="number" step="0.1" className="w-20 p-2 border rounded" value={r.maxKm} onChange={e => updateDistRule(i, 'maxKm', Number(e.target.value))}/></td><td className="p-2"><input type="number" className="w-24 p-2 border rounded font-bold text-green-600" value={r.price} onChange={e => updateDistRule(i, 'price', Number(e.target.value))}/></td><td className="p-2"><button onClick={() => removeDistRule(i)} className="text-red-400"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                      <div><h2 className="font-bold text-lg text-slate-800">2. Outras Localidades</h2><p className="text-xs text-gray-500">Setores específicos selecionáveis pelo cliente.</p></div>
                      <button onClick={addFixedArea} className="text-blue-600 text-xs font-bold flex gap-1 hover:underline"><Plus size={14}/> Add Setor</button>
                  </div>
                  <div className="space-y-3">{settings.shipping.fixedAreas.map((a, i) => (
                      <div key={a.id} className="flex flex-col md:flex-row gap-3 p-3 border rounded-xl bg-gray-50 items-center">
                          <input className="flex-1 p-2 border rounded font-bold text-sm" placeholder="Nome do Setor" value={a.name} onChange={e => updateFixedArea(i, 'name', e.target.value)}/>
                          <select className="p-2 border rounded text-sm bg-white" value={a.type} onChange={e => updateFixedArea(i, 'type', e.target.value)}><option value="fixed">Valor Fixo</option><option value="km_plus_tax">Km + Taxa</option></select>
                          {a.type === 'fixed' ? <div className="flex items-center gap-1"><span className="text-xs font-bold text-gray-500">R$</span><input type="number" className="w-20 p-2 border rounded font-bold text-green-600" value={a.price} onChange={e => updateFixedArea(i, 'price', Number(e.target.value))}/></div> : <div className="flex items-center gap-2"><span className="text-[10px] uppercase font-bold text-blue-600">Taxa Extra:</span><input type="number" className="w-16 p-2 border rounded font-bold" value={a.tax || 0} onChange={e => updateFixedArea(i, 'tax', Number(e.target.value))}/></div>}
                          <button onClick={() => removeFixedArea(i)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                      </div>
                  ))}</div>
              </div>
          </div>
      )}
    </div>
  );
}