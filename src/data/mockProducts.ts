// src/data/mockProducts.ts
import { Product } from "@/types";

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Bolo Vulcão de Ninho",
    description: "Massa fofinha de leite ninho com cobertura cremosa que transborda.",
    basePrice: 55.00,
    imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=400", // Imagem genérica de bolo
    categoryId: "bolos",
    isAvailable: true,
    complementGroups: [
      {
        title: "Escolha a Massa",
        required: true,
        maxSelection: 1,
        options: [
          { name: "Baunilha", priceAdd: 0, inStock: true },
          { name: "Chocolate 50%", priceAdd: 0, inStock: true },
          { name: "Red Velvet", priceAdd: 5.00, inStock: true }
        ]
      },
      {
        title: "Adicionais",
        required: false,
        maxSelection: 3,
        options: [
          { name: "Nutella Extra", priceAdd: 8.00, inStock: true },
          { name: "Morango Fresco", priceAdd: 4.00, inStock: true }
        ]
      }
    ]
  },
  {
    id: "2",
    name: "Copo da Felicidade",
    description: "Camadas de brownie, creme de avelã, morangos frescos e mousse.",
    basePrice: 22.90,
    imageUrl: "https://images.unsplash.com/photo-1563729784474-d77ddb933402?auto=format&fit=crop&q=80&w=400",
    categoryId: "doces",
    isAvailable: true,
    complementGroups: []
  },
  {
    id: "3",
    name: "Coxinha de Morango",
    description: "O clássico brigadeiro de ninho envolvendo um morango inteiro.",
    basePrice: 8.50,
    imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=400",
    categoryId: "doces",
    isAvailable: false, // Vamos testar como fica um item indisponível
    complementGroups: []
  }
];