// src/app/(admin)/admin/customers/[id]/history/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { Loader2, ArrowLeft, Clock, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", id));
        if (userSnap.exists()) setClientName(userSnap.data().name);

        const q = query(collection(db, "orders"), where("userId", "==", id), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline"/></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-full shadow hover:bg-gray-100"><ArrowLeft/></button>
        <h1 className="text-2xl font-bold">Histórico: {clientName}</h1>
      </div>

      <div className="space-y-4">
        {orders.map(order => {
            const date = order.createdAt ? new Date(order.createdAt.seconds * 1000) : new Date();
            let itemsText = "";
            try { itemsText = JSON.parse(order.items).map((i: any) => `${i.quantity}x ${i.name}`).join(", "); } catch(e){}
            
            return (
                <div key={order.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs bg-gray-100 px-2 rounded">#{order.shortId || order.id.slice(0,4)}</span>
                            <span className="text-xs text-gray-500">{date.toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-medium">{itemsText}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg">R$ {order.total.toFixed(2)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${order.status === 'finalizado' ? 'bg-green-100 text-green-700' : order.status === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {order.status.toUpperCase()}
                        </span>
                        {order.isPaid && <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">PAGO</span>}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
}