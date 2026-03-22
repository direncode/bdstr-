"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import { BusynessBar } from "@/components/BusynessBar";

export default function SplashPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string; is_admin: boolean } | null>(null);

  // Trivia Night state
  const [triviaNight, setTriviaNight] = useState<{ isWindow: boolean; night: { id: string; label: string } | null; checkedIn: boolean; hasQrBonus: boolean } | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 200);
    fetch("/api/auth").then((r) => r.json()).then((d) => {
      setProfile(d.profile);
      // Only check trivia night if logged in
      if (d.profile) {
        fetch("/api/trivia-night").then(r => r.json()).then(setTriviaNight).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await fetch("/api/trivia-night", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin" }),
      });
      const data = await res.json();
      if (data.ok) {
        setJustCheckedIn(true);
        setTriviaNight((prev) => prev ? { ...prev, checkedIn: true, hasQrBonus: data.hasQrBonus } : prev);
      }
    } catch { /* ignore */ }
    setCheckingIn(false);
  };

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

            {/* Trivia Night Check-In — Tuesday 7-9 PM only */}
            {triviaNight?.isWindow && triviaNight.night && !triviaNight.checkedIn && !justCheckedIn && (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg animate-pulse-glow hover:opacity-90 transition-opacity disabled:opacity-50 border border-purple-400/30"
              >
                {checkingIn ? "Checking in..." : "🎤 TRIVIA NIGHT — CHECK IN"}
              </button>
            )}

            {/* Checked-in confirmation */}
            {(triviaNight?.checkedIn || justCheckedIn) && (
              <div className="w-full bg-green-500/20 border border-green-500/40 rounded-2xl p-4 text-center animate-slide-up">
                <p className="text-green-300 font-bold">🎤 Checked in for Trivia Night!</p>
                {triviaNight?.hasQrBonus && (
                  <p className="text-green-300/70 text-xs mt-1">📍 QR scanned — your points will be <span className="font-bold">TRIPLED</span></p>
                )}
                {!triviaNight?.hasQrBonus && (
                  <p className="text-white/40 text-xs mt-1">Scan a QR code at Bandidos for 3x points!</p>
                )}
              </div>
            )}

            <button onClick={() => router.push("/play")}
              className="w-full bg-banditos-red text-white py-4 rounded-2xl font-bold text-xl animate-pulse-glow hover:bg-red-700 transition-colors">
              PLAY TRIVIA
            </button>
            <button onClick={() => router.push("/leaderboard")}
              className="w-full bg-banditos-gold/20 text-banditos-gold py-3 rounded-2xl font-bold border border-banditos-gold/30 hover:bg-banditos-gold/30 transition-colors">
              LEADERBOARD
            </button>
            <button onClick={() => router.push("/wallet")}
              className="w-full bg-white/10 text-white/80 py-3 rounded-2xl font-medium border border-white/20 hover:bg-white/20 transition-colors">
              MY LOYALTY CARD
            </button>
            {profile.is_admin && (
              <button onClick={() => router.push("/admin")}
                className="w-full bg-white/10 text-white/80 py-3 rounded-2xl font-medium border border-white/20 hover:bg-white/20 transition-colors">
                Admin Panel
              </button>
            )}
          </>
        ) : (
          <>
            {/* Show trivia night teaser for non-logged-in users during the window */}
            {(() => {
              const now = new Date();
              const isTuesday = now.getDay() === 2 && now.getHours() >= 19 && now.getHours() < 21;
              return isTuesday ? (
                <div className="w-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-2xl p-4 text-center">
                  <p className="text-purple-300 font-bold">🎤 TRIVIA NIGHT IS LIVE!</p>
                  <p className="text-purple-300/60 text-xs mt-1">Sign in to check in and earn points</p>
                </div>
              ) : null;
            })()}
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

      <div className={`mt-8 w-full max-w-xs transition-all duration-1000 delay-700 ${show ? "opacity-100" : "opacity-0"}`}>
        <BusynessBar />
      </div>

      <p className="absolute bottom-6 text-white/30 text-xs">
        Bandidos Mexican Cafe &middot; Franklin St, Chapel Hill NC
      </p>
    </div>
  );
}
