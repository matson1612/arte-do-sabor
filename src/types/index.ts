// src/types/index.ts

export type ClientType = 'standard' | 'monthly';

// Correção do erro "Module has no exported member OrderStatus"
export type OrderStatus = 'em_aberto' | 'produzindo' | 'entrega' | 'finalizado' | 'cancelado';

export interface Option {
  id: string;
  name: string;
  priceAdd: number;
  priceAddPostpaid?: number; // Preço a prazo
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
  basePrice: number;
  pricePostpaid?: number; // Preço a prazo
  imageUrl: string;
  category: string;
  
  // Disponibilidade
  isAvailable: boolean;
  availableStandard?: boolean;
  availablePostpaid?: boolean;

  stock: number | null;
  complementGroupIds: string[];
  
  // Auxiliares do front
  price?: number; 
  fullGroups?: ComplementGroup[];
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
  clientType?: ClientType; // 'standard' ou 'monthly'
  createdAt: any;
  phone?: string;
  address?: any;
}

// Correção dos erros "Property does not exist on type Order"
export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: string; // JSON string
  total: number;
  status: OrderStatus; // Usa o tipo novo
  createdAt: any;
  
  // Novos campos obrigatórios
  paymentMethod: string;
  deliveryMethod: string;
  shippingPrice: number;
  address?: any;
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