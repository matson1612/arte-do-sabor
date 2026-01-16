"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, provider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";

// Adicionamos isAdmin aqui
interface AuthContextType {
  user: User | null;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean; // <--- O ERRO ESTAVA AQUI (Faltava essa linha)
  profile: any;     // Dados extras do perfil (endereço, telefone)
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // Lógica simples de Admin: Verifica se o e-mail está em uma lista (ou pode vir do banco depois)
      // Por enquanto, vamos deixar false ou verificar seu email específico
      if (currentUser?.email === "SEU_EMAIL_AQUI@gmail.com") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login falhou", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loginGoogle, logout, loading, isAdmin, profile: null }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);