// src/components/CustomerNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Calendar, Gift, Star } from "lucide-react";

export default function CustomerNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Delivery", href: "/", icon: ShoppingBag },
    { name: "Encomendas", href: "/encomendas", icon: Gift },
    { name: "Ofertas", href: "/promocoes", icon: Star },
  ];

  return (
    <div className="sticky top-0 z-40 py-2 bg-[#FFFBF7]/95 backdrop-blur-sm border-b border-stone-100">
      <div className="max-w-md mx-auto px-4">
        <div className="flex bg-white rounded-full p-1 shadow-sm border border-stone-100">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link 
                key={tab.href} 
                href={tab.href}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
                  isActive 
                    ? "bg-stone-800 text-white shadow-md transform scale-105" 
                    : "text-stone-400 hover:bg-stone-50 hover:text-stone-600"
                }`}
              >
                <Icon size={16} />
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}