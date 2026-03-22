"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import { BusynessBar } from "@/components/BusynessBar";
import { BottomNav } from "@/components/BottomNav";

interface AdminState {
  isUnlocked: boolean;
  activeRoundId: string | null;
  rounds: { id: string; name: string; category: string; questions: { id: string }[] }[];
}

export default function HomePage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string; is_admin: boolean } | null>(null);

  // Trivia Night state
  const [triviaNight, setTriviaNight] = useState<{ isWindow: boolean; night: { id: string; label: string } | null; checkedIn: boolean; hasQrBonus: boolean } | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  // Admin key
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [adminKeyError, setAdminKeyError] = useState("");
  const [adminKeySuccess, setAdminKeySuccess] = useState(false);

  // Admin dashboard state
  const [adminState, setAdminState] = useState<AdminState | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);

  const loadAdminState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const data = await res.json();
        setAdminState(data);
      }
    } catch { /* not admin or error */ }
  }, []);

  useEffect(() => {
    setTimeout(() => setShow(true), 200);
    fetch("/api/auth").then((r) => r.json()).then((d) => {
      setProfile(d.profile);
      if (d.profile) {
        fetch("/api/trivia-night").then(r => r.json()).then(setTriviaNight).catch(() => {});
        if (d.profile.is_admin) loadAdminState();
      }
    }).catch(() => {});
  }, [loadAdminState]);

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

  const handleAdminKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminKeyError("");
    try {
      const res = await fetch("/api/admin-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey }),
      });
      const data = await res.json();
      if (data.ok) {
        setAdminKeySuccess(true);
        setProfile((prev) => prev ? { ...prev, is_admin: true } : prev);
        loadAdminState();
        setTimeout(() => { setShowAdminKey(false); setAdminKeySuccess(false); }, 1500);
      } else {
        setAdminKeyError(data.error || "Invalid key");
      }
    } catch {
      setAdminKeyError("Network error");
    }
    setAdminKey("");
  };

  // Quick admin actions
  const toggleUnlock = async () => {
    setAdminSaving(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-unlock" }),
      });
      const data = await res.json();
      setAdminState((prev) => prev ? { ...prev, isUnlocked: data.isUnlocked } : prev);
    } finally { setAdminSaving(false); }
  };

  const setActiveRound = async (roundId: string) => {
    setAdminSaving(true);
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-round", roundId }),
      });
      setAdminState((prev) => prev ? { ...prev, activeRoundId: roundId || null } : prev);
    } finally { setAdminSaving(false); }
  };

  const activeRound = adminState?.rounds.find((r) => r.id === adminState.activeRoundId);
  const totalQuestions = adminState?.rounds.reduce((sum, r) => sum + r.questions.length, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark via-[#2a1a3e] to-banditos-dark px-4 pb-24 pt-8">
      {/* Logo */}
      <div className={`flex justify-center transition-all duration-1000 ${show ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
        <BanditosLogo size="lg" />
      </div>

      <p className={`text-banditos-gold/80 text-lg mt-4 text-center transition-all duration-1000 delay-300 ${show ? "opacity-100" : "opacity-0"}`}>
        Live Trivia at Bandidos &middot; Chapel Hill
      </p>

      <div className={`mt-8 w-full max-w-md mx-auto space-y-4 transition-all duration-1000 delay-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

        {/* ========== LOGGED IN ========== */}
        {profile ? (
          <>
            <p className="text-center text-white/70 text-sm">Welcome back, <span className="font-bold text-white">{profile.display_name}</span></p>

            {/* Trivia Night Check-In */}
            {triviaNight?.isWindow && triviaNight.night && !triviaNight.checkedIn && !justCheckedIn && (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg animate-pulse-glow hover:opacity-90 transition-opacity disabled:opacity-50 border border-purple-400/30"
              >
                {checkingIn ? "Checking in..." : "🎤 TRIVIA NIGHT — CHECK IN"}
              </button>
            )}

            {(triviaNight?.checkedIn || justCheckedIn) && (
              <div className="w-full bg-green-500/20 border border-green-500/40 rounded-2xl p-4 text-center animate-slide-up">
                <p className="text-green-300 font-bold">🎤 Checked in for Trivia Night!</p>
                {triviaNight?.hasQrBonus ? (
                  <p className="text-green-300/70 text-xs mt-1">📍 QR scanned — your points will be <span className="font-bold">TRIPLED</span></p>
                ) : (
                  <p className="text-white/40 text-xs mt-1">Scan a QR code at Bandidos for 3x points!</p>
                )}
              </div>
            )}

            {/* Main action */}
            <button onClick={() => router.push("/play")}
              className="w-full bg-banditos-red text-white py-4 rounded-2xl font-bold text-xl animate-pulse-glow hover:bg-red-700 transition-colors">
              PLAY TRIVIA
            </button>

            {/* Quick links grid */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => router.push("/leaderboard")}
                className="bg-banditos-gold/20 text-banditos-gold py-3 rounded-2xl font-bold border border-banditos-gold/30 hover:bg-banditos-gold/30 transition-colors">
                🏆 Leaderboard
              </button>
              <button onClick={() => router.push("/wallet")}
                className="bg-white/10 text-white/80 py-3 rounded-2xl font-medium border border-white/20 hover:bg-white/20 transition-colors">
                📊 My Stats
              </button>
            </div>

            {/* ========== ADMIN DASHBOARD ========== */}
            {profile.is_admin && adminState && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-white/30 text-xs font-bold uppercase tracking-wider">Admin Controls</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Game status card */}
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold">Game Status</h3>
                    <button
                      onClick={toggleUnlock}
                      disabled={adminSaving}
                      className={`px-4 py-1.5 rounded-xl font-bold text-sm transition-all ${
                        adminState.isUnlocked
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-red-500/80 text-white hover:bg-red-600"
                      }`}
                    >
                      {adminState.isUnlocked ? "OPEN" : "LOCKED"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white/5 rounded-xl p-2">
                      <p className="text-banditos-gold font-bold text-lg">{adminState.rounds.length}</p>
                      <p className="text-white/40 text-[10px]">Rounds</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2">
                      <p className="text-banditos-gold font-bold text-lg">{totalQuestions}</p>
                      <p className="text-white/40 text-[10px]">Questions</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2">
                      <p className="text-banditos-gold font-bold text-lg truncate text-sm">
                        {activeRound ? activeRound.name : "None"}
                      </p>
                      <p className="text-white/40 text-[10px]">Active Round</p>
                    </div>
                  </div>
                </div>

                {/* Quick round selector */}
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                  <h3 className="text-white font-bold mb-3">Set Active Round</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    <button
                      onClick={() => setActiveRound("")}
                      disabled={adminSaving}
                      className={`w-full p-2.5 rounded-xl text-left text-sm transition-colors ${
                        !adminState.activeRoundId
                          ? "bg-banditos-red text-white font-bold"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      None (waiting room)
                    </button>
                    {adminState.rounds.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setActiveRound(r.id)}
                        disabled={adminSaving}
                        className={`w-full p-2.5 rounded-xl text-left text-sm transition-colors ${
                          adminState.activeRoundId === r.id
                            ? "bg-banditos-red text-white font-bold"
                            : "bg-white/5 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        <span>{r.name}</span>
                        <span className="text-xs ml-2 opacity-60">{r.questions.length} Q&apos;s &middot; {r.category}</span>
                      </button>
                    ))}
                  </div>
                  {adminState.rounds.length === 0 && (
                    <p className="text-white/30 text-xs mt-2">No rounds yet — create some in the Admin Panel.</p>
                  )}
                </div>

                {/* Admin nav grid */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => router.push("/admin?tab=questions")}
                    className="bg-purple-600/20 text-purple-300 py-3 rounded-2xl font-medium border border-purple-500/30 hover:bg-purple-600/30 transition-colors text-sm">
                    📝 Edit Questions
                  </button>
                  <button onClick={() => router.push("/admin?tab=rounds")}
                    className="bg-purple-600/20 text-purple-300 py-3 rounded-2xl font-medium border border-purple-500/30 hover:bg-purple-600/30 transition-colors text-sm">
                    📂 Manage Rounds
                  </button>
                  <button onClick={() => router.push("/admin?tab=trivianight")}
                    className="bg-purple-600/20 text-purple-300 py-3 rounded-2xl font-medium border border-purple-500/30 hover:bg-purple-600/30 transition-colors text-sm">
                    🎤 Trivia Night
                  </button>
                  <button onClick={() => router.push("/admin?tab=qrcodes")}
                    className="bg-purple-600/20 text-purple-300 py-3 rounded-2xl font-medium border border-purple-500/30 hover:bg-purple-600/30 transition-colors text-sm">
                    📱 QR Codes
                  </button>
                  <button onClick={() => router.push("/admin?tab=attendance")}
                    className="bg-purple-600/20 text-purple-300 py-3 rounded-2xl font-medium border border-purple-500/30 hover:bg-purple-600/30 transition-colors text-sm">
                    ✋ Attendance
                  </button>
                  <button onClick={() => router.push("/admin?tab=game")}
                    className="bg-purple-600/20 text-purple-300 py-3 rounded-2xl font-medium border border-purple-500/30 hover:bg-purple-600/30 transition-colors text-sm">
                    ⚙️ Full Admin
                  </button>
                </div>
              </div>
            )}

            {/* Admin key entry for non-admins */}
            {!profile.is_admin && (
              <div className="pt-2">
                {!showAdminKey ? (
                  <button
                    onClick={() => setShowAdminKey(true)}
                    className="w-full bg-white/5 text-white/40 text-sm py-3 rounded-2xl border border-white/10 hover:bg-white/10 hover:text-white/60 transition-colors"
                  >
                    🔑 Staff Login
                  </button>
                ) : (
                  <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-purple-500/30 animate-slide-up">
                    <p className="text-white/60 text-xs mb-3 text-center">Enter the admin key to access staff controls</p>
                    <form onSubmit={handleAdminKey} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={adminKey}
                          onChange={(e) => setAdminKey(e.target.value)}
                          placeholder="Admin key..."
                          autoFocus
                          className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/20 focus:border-purple-400 outline-none"
                        />
                        <button
                          type="submit"
                          className="px-5 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors"
                        >
                          Unlock
                        </button>
                      </div>
                      {adminKeyError && <p className="text-red-400 text-xs text-center">{adminKeyError}</p>}
                      {adminKeySuccess && <p className="text-green-400 text-xs text-center font-bold">Admin access granted!</p>}
                      <button type="button" onClick={() => { setShowAdminKey(false); setAdminKeyError(""); }} className="w-full text-white/20 text-xs hover:text-white/40">Cancel</button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* ========== NOT LOGGED IN ========== */
          <>
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

        {/* Busyness */}
        <div className="pt-2">
          <BusynessBar />
        </div>
      </div>

      <p className="mt-8 text-white/30 text-xs text-center">
        Bandidos Mexican Cafe &middot; Franklin St, Chapel Hill NC
      </p>

      {profile && <BottomNav isAdmin={profile.is_admin} />}
    </div>
  );
}
