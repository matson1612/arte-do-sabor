// src/services/settingsService.ts
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { StoreSettings } from "@/types";

const SETTINGS_DOC = "general"; // ID fixo para facilitar
const COLLECTION = "settings";

export const getStoreSettings = async (): Promise<StoreSettings | null> => {
  try {
    const d = await getDoc(doc(db, COLLECTION, SETTINGS_DOC));
    if (d.exists()) return d.data() as StoreSettings;
    return null;
  } catch (error) {
    console.error("Erro ao buscar configs:", error);
    return null;
  }
};

export const saveStoreSettings = async (settings: StoreSettings) => {
  try {
    await setDoc(doc(db, COLLECTION, SETTINGS_DOC), settings);
  } catch (error) {
    console.error("Erro ao salvar configs:", error);
    throw error;
  }
};