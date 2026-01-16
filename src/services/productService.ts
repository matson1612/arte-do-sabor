// src/services/productService.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { Product } from "@/types";

const COLLECTION = "products";

export const createProduct = async (data: any) => {
  try {
    // Adiciona timestamp automático
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro no createProduct:", error);
    throw error;
  }
};

export const getProducts = async (): Promise<Product[]> => {
  const s = await getDocs(collection(db, COLLECTION));
  return s.docs.map(d => ({ id: d.id, ...d.data() } as Product));
};

export const getProductById = async (id: string): Promise<Product | null> => {
  const d = await getDoc(doc(db, COLLECTION, id));
  return d.exists() ? { id: d.id, ...d.data() } as Product : null;
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
  const { id: _, ...rest } = data as any; // Remove ID para não duplicar
  await updateDoc(doc(db, COLLECTION, id), rest);
};

export const updateProductField = async (id: string, field: object) => {
  await updateDoc(doc(db, COLLECTION, id), field);
};

export const deleteProduct = async (id: string) => {
  await deleteDoc(doc(db, COLLECTION, id));
};