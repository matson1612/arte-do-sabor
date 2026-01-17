// src/types/index.ts

export type ClientType = 'standard' | 'monthly';

export interface Option {
  id: string;
  name: string;
  priceAdd: number;          
  priceAddPostpaid?: number; 
  
  isAvailable: boolean;
  stock: number | null;     
  linkedProductId?: string; 
}

export interface ComplementGroup {
  id: string;
  title: string;
  required: boolean;
  maxSelection: number;
  options: Option[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  
  // Preços do Banco
  basePrice: number;       
  pricePostpaid?: number;  

  imageUrl: string;
  category: string;
  
  // Disponibilidade
  isAvailable: boolean;         
  availableStandard?: boolean;  
  availablePostpaid?: boolean;  

  stock: number | null;
  complementGroupIds: string[]; 

  // --- CAMPOS DE APOIO AO FRONT-END (Opcionais) ---
  price?: number; // Preço final calculado para exibição
  fullGroups?: ComplementGroup[]; // Grupos carregados
}

export interface CartItem extends Product {
  cartId: string;
  selectedOptions: Record<string, Option[]>;
  quantity: number;
  finalPrice: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  clientType?: ClientType;
  createdAt: any;
  phone?: string;
  address?: any;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: string; // JSON
  total: number;
  status: "em_aberto" | "em_preparo" | "entrega" | "finalizado" | "cancelado";
  createdAt: any;
}

export interface StoreSettings {
  id?: string; 
  storeName: string;
  cnpj: string;
  phone: string; 
  address: {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  authorizedEmail: string; 
}