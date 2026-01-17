// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, provider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // COLOQUE SEU EMAIL AQUI
  const ADMIN_EMAILS = ["seuemail@gmail.com"]; 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        setIsAdmin(ADMIN_EMAILS.includes(currentUser.email || ""));

        // BUSCA O PERFIL DO BANCO
        const userRef = doc(db, "users", currentUser.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);
            } else {
                const newProfile: UserProfile = {
                    uid: currentUser.uid,
                    name: currentUser.displayName || "Cliente",
                    email: currentUser.email || "",
                    photoURL: currentUser.photoURL || "",
                    clientType: "standard", // PADRÃO
                    createdAt: new Date(),
                };
                setDoc(userRef, newProfile, { merge: true });
                setProfile(newProfile);
            }
            setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try { await signInWithPopup(auth, provider); } catch (error) { console.error(error); }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loginGoogle, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);