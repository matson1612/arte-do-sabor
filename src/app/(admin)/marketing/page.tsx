// src/app/(admin)/admin/marketing/page.tsx
"use client";

import { useState } from "react";
import { Send, Megaphone, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export default function MarketingPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return alert("Preencha tudo!");
    
    if(!confirm("Tem certeza que deseja enviar essa notificação para TODOS os clientes?")) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', msg: `Enviado com sucesso para ${data.sentCount} clientes!` });
        setTitle("");
        setBody("");
      } else {
        setStatus({ type: 'error', msg: data.error || "Erro ao enviar." });
      }
    } catch (error) {
      setStatus({ type: 'error', msg: "Erro de conexão." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 mb-8">
        <Megaphone className="text-pink-600"/> Campanhas & Promoções
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="font-bold text-lg text-gray-700 mb-4">Nova Notificação Push</h2>
        
        {status && (
          <div className={`p-4 mb-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {status.type === 'success' ? <CheckCircle/> : <AlertTriangle/>}
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título da Promoção</label>
            <input 
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-pink-200 outline-none transition" 
              placeholder="Ex: Promoção Relâmpago! ⚡"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensagem</label>
            <textarea 
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-pink-200 outline-none transition h-32" 
              placeholder="Ex: Todo o cardápio com 10% OFF hoje. Aproveite!"
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin"/> : <><Send size={18}/> Enviar Notificação</>}
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">Isso enviará um alerta para o celular de todos os clientes que permitiram notificações.</p>
          </div>
        </form>
      </div>
    </div>
  );
}