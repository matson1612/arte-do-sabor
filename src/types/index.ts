// src/types/index.ts

export interface Option {
  id: string;
  name: string;
  priceAdd: number;
  isAvailable: boolean;
  stock: number | null;     // null = Infinito
  linkedProductId?: string; // ID se for produto vinculado
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
  basePrice: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  stock: number | null;
  complementGroupIds: string[]; // Vínculo por ID (Novo Modelo)
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
  customerType: "padrao" | "fiado";
  createdAt: any;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: string; // JSON
  total: number;
  status: "em_aberto" | "em_preparo" | "entrega" | "finalizado";
  createdAt: any;
}

export interface StoreSettings {
  id?: string; // Geralmente será 'general'
  storeName: string;
  cnpj: string;
  phone: string; // WhatsApp para receber pedidos
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
  authorizedEmail: string; // E-mail do dono (você) para acesso Admin
}