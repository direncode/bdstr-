"use client";

import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  label: string;
  icon: string;
  path: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: "🏠", path: "/" },
  { label: "Play", icon: "🎯", path: "/play" },
  { label: "Ranks", icon: "🏆", path: "/leaderboard" },
  { label: "Card", icon: "💳", path: "/wallet" },
  { label: "Admin", icon: "⚙️", path: "/admin", adminOnly: true },
];

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-banditos-dark/95 backdrop-blur border-t border-white/10 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center py-2 px-3 min-w-[60px] transition-colors ${
                isActive
                  ? "text-banditos-gold"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-banditos-gold mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
