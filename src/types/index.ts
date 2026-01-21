// src/types/index.ts

export type ClientType = 'standard' | 'monthly' | 'reseller';
export type OrderStatus = 'em_aberto' | 'produzindo' | 'entrega' | 'finalizado' | 'cancelado';
export type SalesChannel = 'delivery' | 'encomenda' | 'evento';

export type TransactionType = 'income' | 'expense';
export type ExpenseCategory = 'insumos' | 'embalagens' | 'contas_fixas' | 'pessoal' | 'marketing' | 'manutencao' | 'venda_manual' | 'outros';

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface FinancialRecord {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  type: TransactionType;
  date: any; 
  createdAt: any;
  clientId?: string;
}

export interface Option {
  id: string;
  name: string;
  priceAdd: number;
  priceAddPostpaid?: number; 
  priceAddReseller?: number; 
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
  priceReseller?: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  availableStandard?: boolean;
  availablePostpaid?: boolean;
  availableReseller?: boolean;
  stock: number | null;
  complementGroupIds: string[];
  price?: number; 
  fullGroups?: ComplementGroup[];
  salesChannel?: SalesChannel;
  gallery?: string[];
  videoUrl?: string;
  isFeatured?: boolean;
}

export interface CartItem extends Product {
  cartId: string;
  selectedOptions: Record<string, Option[]>;
  quantity: number;
  finalPrice: number;
}

export interface UserAddress {
  id: string;
  nickname: string;
  regionType: 'plano_diretor' | 'outras_localidades';
  sectorName?: string;
  street: string;
  number: string;
  district: string;
  complement?: string;
  cep: string;
  location?: { lat: number; lng: number };
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  clientType?: ClientType; 
  role?: 'admin' | 'user'; // <--- CORREÇÃO AQUI (Adicionado)
  createdAt: any;
  phone?: string;
  savedAddresses?: UserAddress[];
  address?: any;
  pushToken?: string; // (Opcional: já adicionando para o Push Notification)
}

export interface Order {
  id: string;
  shortId?: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: string;
  total: number;
  status: OrderStatus;
  createdAt: any;
  paymentMethod: string;
  deliveryMethod: string;
  shippingPrice?: number;
  address?: any;
  isPaid?: boolean;
  isManual?: boolean;
  contractUrl?: string;
  description?: string;
}

// --- CONFIGURAÇÕES DE LOJA ---

export interface PaymentMethodConfig {
  active: boolean;
  label: string;
  feePercent?: number;
  discountPercent?: number;
}

export interface ShippingDistanceRule {
  minKm: number;
  maxKm: number;
  price: number;
}

export interface ShippingFixedArea {
  id: string;
  name: string;
  price: number;
  type: 'fixed' | 'km_plus_tax';
  tax?: number;
}

export interface StoreSettings {
  id?: string; 
  isOpen: boolean; 
  
  storeName: string;
  cnpj: string;
  email: string;
  whatsapp: string;
  
  address: {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    cep: string;
  };
  location: { 
    lat: number;
    lng: number;
  };

  pix: {
    key: string;
    name: string;
    city: string;
  };

  paymentMethods: {
    pix: PaymentMethodConfig;
    money: PaymentMethodConfig;
    link_debit: PaymentMethodConfig;
    link_credit: PaymentMethodConfig;
    monthly: PaymentMethodConfig;
  };

  shipping: {
    distanceTable: ShippingDistanceRule[];
    fixedAreas: ShippingFixedArea[];
    freeShippingAbove?: number;
  };
}