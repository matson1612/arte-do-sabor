// src/app/login/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { user, loginGoogle } = useAuth();
  const router = useRouter();
  const [loggingIn, setLoggingIn] = useState(false);

  // Se o usuário já estiver logado, manda para a home automaticamente
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      await loginGoogle();
      // O useEffect acima vai redirecionar assim que o 'user' for atualizado
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao conectar com o Google.");
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF7] flex flex-col items-center justify-center p-4 relative">
      
      {/* Botão Voltar (Canto superior esquerdo) */}
      <Link href="/" className="absolute top-6 left-6 p-3 bg-white rounded-full text-stone-600 hover:bg-stone-100 shadow-sm transition">
        <ArrowLeft size={24}/>
      </Link>

      {/* Card de Login */}
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-stone-100 text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        {/* Logo / Imagem */}
        <div className="w-24 h-24 mx-auto bg-stone-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-stone-100">
            {/* Se tiver a imagem da logo, pode usar <img src="/logo.jpg" ... /> aqui */}
            <img src="/logo.jpg" alt="Logo" className="w-full h-full rounded-full object-cover p-1" />
        </div>

        <h1 className="text-3xl font-bold text-stone-800 mb-2 font-serif">Bem-vindo(a)</h1>
        <p className="text-stone-500 mb-8">Faça login para acessar seus pedidos e perfil.</p>

        {/* Botão Google */}
        <button 
          onClick={handleLogin} 
          disabled={loggingIn}
          className="w-full bg-white border-2 border-stone-100 text-stone-700 font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm active:scale-95 group"
        >
          {loggingIn ? (
            <Loader2 size={24} className="animate-spin text-pink-600"/>
          ) : (
            <>
              {/* Ícone do Google SVG */}
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continuar com Google</span>
            </>
          )}
        </button>

        <p className="text-xs text-stone-400 mt-6">
          Ao entrar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}