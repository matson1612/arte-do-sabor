// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./global.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import NotificationInit from "@/components/NotificationInit"; // <--- Importe o componente

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Arte do Sabor",
  description: "Bolos e Doces Artesanais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {/* Componente que inicia o listener de notificações no cliente */}
        <NotificationInit />
        
        {/* Os Providers precisam estar aqui para funcionar na Loja E no Admin */}
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}