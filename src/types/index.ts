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

// --- NOVAS CONFIGURAÇÕES DE LOJA ---

export interface PaymentMethodConfig {
  active: boolean;
  label: string;
  feePercent?: number; // Taxa (%)
  discountPercent?: number; // Desconto (%)
}

export interface StoreSettings {
  id?: string; 
  
  // Dados Gerais
  storeName: string;
  cnpj: string;
  email: string; // Email do responsável
  whatsapp: string; // Número de pedidos
  
  // Endereço e Localização
  address: {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    cep?: string; // CEP adicionado
  };
  location: { // Mantendo compatibilidade com seu mapa existente
    lat: number;
    lng: number;
  };

  // Financeiro
  pix: {
    key: string;
    name: string;
    city: string;
  };

  // Configuração de Pagamentos
  paymentMethods: {
    pix: PaymentMethodConfig;
    money: PaymentMethodConfig;
    link_debit: PaymentMethodConfig; // Link Débito
    link_credit: PaymentMethodConfig; // Link Crédito
    monthly: PaymentMethodConfig; // Conta Mensal
  };

  // Frete
  shipping: {
    type: 'fixed' | 'distance'; // Fixo ou Por KM
    fixedPrice: number; 
    pricePerKm: number; 
    minOrderValue?: number; // Pedido mínimo
    freeShippingAbove?: number; // Frete grátis acima de
  };
}