"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";

export default function SplashPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string; is_admin: boolean } | null>(null);

  useEffect(() => {
    setTimeout(() => setShow(true), 200);
    fetch("/api/auth").then((r) => r.json()).then((d) => setProfile(d.profile)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark via-[#2a1a3e] to-banditos-dark flex flex-col items-center justify-center px-4">
      <div className={`transition-all duration-1000 ${show ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
        <BanditosLogo size="xl" />
      </div>

      <p className={`text-banditos-gold/80 text-lg mt-6 text-center transition-all duration-1000 delay-300 ${show ? "opacity-100" : "opacity-0"}`}>
        Live Trivia at Bandidos &middot; Chapel Hill
      </p>

      <div className={`mt-10 flex flex-col gap-3 w-full max-w-xs transition-all duration-1000 delay-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        {profile ? (
          <>
            <p className="text-center text-white/70 text-sm mb-1">Welcome back, {profile.display_name}!</p>
            <button onClick={() => router.push("/play")}
              className="w-full bg-banditos-red text-white py-4 rounded-2xl font-bold text-xl animate-pulse-glow hover:bg-red-700 transition-colors">
              PLAY TRIVIA
            </button>
            <button onClick={() => router.push("/leaderboard")}
              className="w-full bg-banditos-gold/20 text-banditos-gold py-3 rounded-2xl font-bold border border-banditos-gold/30 hover:bg-banditos-gold/30 transition-colors">
              LEADERBOARD
            </button>
            {profile.is_admin && (
              <button onClick={() => router.push("/admin")}
                className="w-full bg-white/10 text-white/80 py-3 rounded-2xl font-medium border border-white/20 hover:bg-white/20 transition-colors">
                Admin Panel
              </button>
            )}
            {profile.is_admin && (
              <button onClick={() => router.push("/qr")}
                className="w-full bg-white/5 text-white/50 py-2 rounded-2xl text-sm border border-white/10 hover:bg-white/10 transition-colors">
                Print QR Code
              </button>
            )}
          </>
        ) : (
          <>
            <button onClick={() => router.push("/play")}
              className="w-full bg-banditos-red text-white py-4 rounded-2xl font-bold text-xl animate-pulse-glow hover:bg-red-700 transition-colors">
              ENTER
            </button>
            <button onClick={() => router.push("/leaderboard")}
              className="w-full bg-banditos-gold/20 text-banditos-gold py-3 rounded-2xl font-bold border border-banditos-gold/30 hover:bg-banditos-gold/30 transition-colors">
              LEADERBOARD
            </button>
          </>
        )}
      </div>

      <p className="absolute bottom-6 text-white/30 text-xs">
        Bandidos Mexican Cafe &middot; Franklin St, Chapel Hill NC
      </p>
    </div>
  );
}
