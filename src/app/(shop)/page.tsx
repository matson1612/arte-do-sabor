// src/app/(shop)/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useCart } from "@/context/CartContext";
import { Plus, Minus, Loader2, ShoppingBag, ImageOff, X, CheckSquare, MessageSquare } from "lucide-react";

// --- TIPOS ---
interface Complement {
  name: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  complements?: Complement[];
}

export default function ShopHome() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado do Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedComplements, setSelectedComplements] = useState<Complement[]>([]);

  // --- FUNÇÃO "DETECTIVE" DE PREÇO ---
  const parsePrice = (data: any) => {
    // 1. Tenta achar o preço em vários campos possíveis
    let rawValue = data.price ?? data.preco ?? data.valor ?? data.value ?? 0;
    
    // 2. Se já for número, retorna direto
    if (typeof rawValue === 'number') return rawValue;

    // 3. Se for texto (ex: "R$ 10,90"), limpa tudo
    if (typeof rawValue === 'string') {
        // Remove "R$", espaços e pontos de milhar, troca vírgula por ponto
        const clean = rawValue.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    }

    return 0;
  };

  // --- BUSCA PRODUTOS ---
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log("--- INICIANDO BUSCA DE PRODUTOS ---");
        const productsRef = collection(db, "products");
        const q = query(productsRef, orderBy("name"));
        const snapshot = await getDocs(q);

        const items = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          // --- LOG DE DIAGNÓSTICO (Olhe no F12 do navegador) ---
          console.log(`Produto: ${data.name}`, data); 

          // Tratamento robusto do preço
          const finalPrice = parsePrice(data);

          // Tratamento dos complementos
          // Se não existir 'complements' no banco, cria array vazio
          const rawComplements = data.complements || data.complementos || []; 
          const safeComplements = Array.isArray(rawComplements) 
            ? rawComplements.map((c: any) => ({
                name: c.name || c.nome || "Item",
                price: parsePrice(c) // Tenta ler o preço do complemento
              }))
            : [];

          return { 
              id: doc.id, 
              ...data, 
              price: finalPrice,
              complements: safeComplements
          };
        }) as Product[];

        setProducts(items);
      } catch (error) {
        console.error("Erro fatal ao buscar produtos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // --- CONTROLES ---
  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setObservation("");
    setSelectedComplements([]);
  };

  const toggleComplement = (comp: Complement) => {
    if (selectedComplements.find(c => c.name === comp.name)) {
        setSelectedComplements(prev => prev.filter(c => c.name !== comp.name));
    } else {
        setSelectedComplements(prev => [...prev, comp]);
    }
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    const compsTotal = selectedComplements.reduce((acc, curr) => acc + curr.price, 0);
    return (selectedProduct.price + compsTotal) * quantity;
  };

  const handleAddToCart = () => {
    if (selectedProduct) {
      // Nome formatado para o carrinho: "X-Burger + Bacon [Obs: Sem cebola]"
      let customName = selectedProduct.name;
      
      if (selectedComplements.length > 0) {
          customName += ` + ${selectedComplements.map(c => c.name).join(', ')}`;
      }
      
      if (observation.trim()) {
          customName += ` [Obs: ${observation}]`;
      }

      // Preço unitário final (Base + Complementos)
      const finalUnitPrice = selectedProduct.price + selectedComplements.reduce((acc, c) => acc + c.price, 0);

      const cartItem = {
          ...selectedProduct,
          name: customName,
          price: finalUnitPrice,
      };

      addToCart(cartItem, quantity);
      setSelectedProduct(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-600" size={40}/></div>;

  return (
    <div className="space-y-8 pb-24">
      {/* Banner */}
      <div className="bg-gradient-to-r from-pink-600 to-rose-500 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-1">Cardápio 🍔</h2>
        <p className="opacity-90 text-sm">Escolha suas delícias abaixo.</p>
      </div>

      {products.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          <ShoppingBag size={48} className="mx-auto mb-2 opacity-20"/>
          <p>Nenhum produto cadastrado.</p>
        </div>
      ) : (
        Object.entries(groupedProducts).map(([category, items]) => (
          <section key={category}>
            <h3 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-pink-600 pl-3 capitalize">
              {category}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((product) => (
                <div 
                    key={product.id} 
                    onClick={() => openModal(product)} 
                    className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3 cursor-pointer hover:border-pink-300 transition-colors group"
                >
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <ImageOff className="m-auto mt-8 text-gray-300" size={20} />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{product.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      {/* Mostra preço formatado ou "Sob Consulta" se for 0 */}
                      <span className="font-bold text-green-600 text-sm">
                        {product.price > 0 
                            ? product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                            : 'R$ 0,00'}
                      </span>
                      <button className="bg-pink-50 text-pink-600 p-1.5 rounded-full hover:bg-pink-600 hover:text-white transition-colors">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {/* --- MODAL --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setSelectedProduct(null)}></div>
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-10 z-10 max-h-[90vh] overflow-y-auto">
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 bg-black/20 text-white p-1 rounded-full hover:bg-black/40"><X size={20}/></button>
                
                <div className="h-48 bg-gray-100 relative">
                    {selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageOff size={40}/></div>}
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <h2 className="text-xl font-bold text-gray-800">{selectedProduct.name}</h2>
                            <div className="text-xl font-bold text-green-600">
                                {selectedProduct.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">{selectedProduct.description}</p>
                    </div>

                    {/* SEÇÃO DE COMPLEMENTOS (Só aparece se tiver dados no banco) */}
                    {selectedProduct.complements && selectedProduct.complements.length > 0 ? (
                        <div>
                            <h3 className="font-bold text-gray-700 text-sm mb-3">Adicionais</h3>
                            <div className="space-y-2">
                                {selectedProduct.complements.map((comp, idx) => {
                                    const isSelected = selectedComplements.some(c => c.name === comp.name);
                                    return (
                                        <div key={idx} onClick={() => toggleComplement(comp)} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-300'}`}>{isSelected && <CheckSquare size={14}/>}</div>
                                                <span className="text-sm font-medium text-gray-700">{comp.name}</span>
                                            </div>
                                            <span className="text-sm font-bold text-green-600">+ {comp.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        // MENSAGEM DE DEBUG (Só pra você saber pq não apareceu)
                        <p className="text-xs text-gray-300 italic text-center">Sem adicionais cadastrados para este item.</p>
                    )}

                    <div>
                        <label className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2"><MessageSquare size={16}/> Observação</label>
                        <textarea className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white text-sm" rows={2} placeholder="Ex: Sem cebola..." value={observation} onChange={e => setObservation(e.target.value)}/>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center border rounded-xl overflow-hidden bg-gray-50 h-12">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 h-full hover:bg-gray-200 text-gray-600"><Minus size={18}/></button>
                            <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="px-4 h-full hover:bg-gray-200 text-pink-600"><Plus size={18}/></button>
                        </div>
                        <button onClick={handleAddToCart} className="flex-1 bg-pink-600 text-white font-bold h-12 rounded-xl hover:bg-pink-700 flex justify-center items-center gap-2 shadow-lg">
                            <span>Adicionar</span>
                            <span className="bg-pink-700/50 px-2 py-0.5 rounded text-xs">
                                {calculateTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}