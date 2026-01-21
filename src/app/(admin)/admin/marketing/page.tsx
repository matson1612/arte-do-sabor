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
    if (!title.trim() || !body.trim()) return alert("Preencha o título e a mensagem da promoção!");
    
    if(!confirm("Tem certeza que deseja enviar essa notificação para TODOS os clientes cadastrados?")) return;

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
        setStatus({ type: 'success', msg: `Sucesso! Mensagem enviada para ${data.sentCount} dispositivos.` });
        setTitle("");
        setBody("");
      } else {
        setStatus({ type: 'error', msg: data.error || "Erro ao enviar campanha." });
      }
    } catch (error) {
      setStatus({ type: 'error', msg: "Erro de conexão com o servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 animate-in fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-pink-100 p-3 rounded-xl text-pink-600">
            <Megaphone size={32}/>
        </div>
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Marketing & Push</h1>
            <p className="text-slate-500">Envie promoções direto para o celular dos seus clientes.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="font-bold text-lg text-gray-700 mb-6 border-b pb-4">Nova Campanha</h2>
        
        {status && (
          <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
            {status.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
            <span className="font-medium">{status.msg}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Título da Promoção</label>
            <input 
              className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-pink-200 outline-none transition bg-gray-50 focus:bg-white" 
              placeholder="Ex: ⚡ Promoção Relâmpago!"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={50}
            />
            <div className="text-right text-xs text-gray-400 mt-1">{title.length}/50</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mensagem</label>
            <textarea 
              className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-pink-200 outline-none transition h-32 bg-gray-50 focus:bg-white resize-none" 
              placeholder="Ex: Peça agora e ganhe entrega grátis em todo o Plano Diretor. Aproveite!"
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={150}
            />
            <div className="text-right text-xs text-gray-400 mt-1">{body.length}/150</div>
          </div>

          <div className="pt-4 border-t">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin"/> : <><Send size={20}/> Enviar Notificação Agora</>}
            </button>
            <p className="text-xs text-center text-gray-400 mt-4 bg-gray-50 p-2 rounded-lg">
                ⚠️ Isso enviará um alerta sonoro para o celular de todos os clientes que aceitaram receber notificações.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}