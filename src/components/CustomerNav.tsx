// src/components/CustomerNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Calendar, Gift } from "lucide-react";

export default function CustomerNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Delivery", href: "/", icon: ShoppingBag },
    { name: "Encomendas", href: "/encomendas", icon: Gift },
    { name: "Datas Especiais", href: "/especiais", icon: Calendar },
  ];

  return (
    <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link 
              key={tab.href} 
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 text-xs font-bold uppercase transition-colors border-b-2 ${
                isActive 
                  ? "border-pink-600 text-pink-600 bg-pink-50/50" 
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon size={20} className="mb-1" />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}