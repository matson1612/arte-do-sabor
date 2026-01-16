// src/services/complementService.ts
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { ComplementGroup } from "@/types";

const COLLECTION = "complement_groups";

export const getAllGroups = async (): Promise<ComplementGroup[]> => {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ComplementGroup));
};

export const getGroupById = async (id: string): Promise<ComplementGroup | null> => {
  const d = await getDoc(doc(db, COLLECTION, id));
  return d.exists() ? { id: d.id, ...d.data() } as ComplementGroup : null;
};

// Busca vários grupos de uma vez (para montar o produto)
export const getGroupsByIds = async (ids: string[]): Promise<ComplementGroup[]> => {
  if (!ids || ids.length === 0) return [];
  // O Firebase não tem "getAll where ID in array" performático para arrays grandes,
  // então buscamos um por um em paralelo (Promise.all)
  const promises = ids.map(id => getGroupById(id));
  const results = await Promise.all(promises);
  return results.filter(g => g !== null) as ComplementGroup[];
};

export const createGroup = async (group: Omit<ComplementGroup, "id">) => {
  const ref = await addDoc(collection(db, COLLECTION), group);
  return ref.id;
};

export const updateGroup = async (id: string, data: Partial<ComplementGroup>) => {
  await updateDoc(doc(db, COLLECTION, id), data);
};

export const deleteGroup = async (id: string) => {
  await deleteDoc(doc(db, COLLECTION, id));
};