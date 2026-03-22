"use client";

import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  label: string;
  path: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/" },
  { label: "Play", path: "/play" },
  { label: "Ranks", path: "/leaderboard" },
  { label: "Stats", path: "/wallet" },
  { label: "Admin", path: "/admin", adminOnly: true },
];

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-banditos-dark/95 backdrop-blur border-t border-white/10 z-50 pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              aria-label={`Go to ${item.label}`}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center py-3 px-4 min-w-[60px] transition-colors ${
                isActive
                  ? "text-banditos-gold font-bold"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="w-4 h-0.5 rounded-full bg-banditos-gold mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
