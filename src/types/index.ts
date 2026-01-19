// src/types/index.ts

export type ClientType = 'standard' | 'monthly';
export type OrderStatus = 'em_aberto' | 'produzindo' | 'entrega' | 'finalizado' | 'cancelado';

// NOVO: Canal de Venda (Onde o produto aparece?)
export type SalesChannel = 'delivery' | 'encomenda' | 'evento';

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
  basePrice: number;
  pricePostpaid?: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  availableStandard?: boolean;
  availablePostpaid?: boolean;
  stock: number | null;
  complementGroupIds: string[];
  price?: number;
  fullGroups?: ComplementGroup[];
  
  // NOVO CAMPO
  salesChannel?: SalesChannel; 
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
  shortId?: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: string; // JSON
  total: number;
  status: OrderStatus;
  createdAt: any;
  paymentMethod: string;
  deliveryMethod: string;
  shippingPrice?: number;
  address?: any;
  isPaid?: boolean; 
}