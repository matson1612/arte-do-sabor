// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;         
  profile: UserProfile | null;
  loading: boolean;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitora se o usuário conectou ou desconectou
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Usuário logado! Busca dados extras no banco
        try {
            const docRef = doc(db, "users", firebaseUser.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              // Primeiro acesso deste usuário: Cria perfil básico
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || "Sem Nome",
                email: firebaseUser.email || "",
                photoURL: firebaseUser.photoURL || "",
                customerType: "padrao",
                createdAt: serverTimestamp()
              };
              await setDoc(docRef, newProfile);
              setProfile(newProfile);
            }
        } catch (error) {
            console.error("Erro ao carregar perfil do banco:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try {
      setLoading(true);
      // Usamos POPUP pois funciona melhor que Redirect em ambientes de desenvolvimento
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Erro detalhado no login:", error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        alert("O login foi cancelado. Se a janela fechou sozinha, tente abrir o site em uma NOVA ABA do navegador (fora do editor).");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert(`Erro de Domínio Não Autorizado.\n\nCopie o domínio atual do seu navegador e adicione no Firebase Console -> Authentication -> Settings -> Authorized Domains.`);
      } else {
        alert(`Erro ao logar: ${error.message}`);
      }
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);