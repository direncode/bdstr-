"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";

interface QrSession {
  id: string; code: string; name: string;
  claimed: boolean; claimedBy: string | null;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [loading, setLoading] = useState(true);
  const [qrSession, setQrSession] = useState<QrSession | null>(null);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<{ id: string; display_name: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Auth state
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/qr-sessions?code=${code}`).then(r => r.json()),
      fetch("/api/auth").then(r => r.json()),
    ]).then(([qrData, authData]) => {
      if (qrData.error) {
        setError(qrData.error);
      } else {
        setQrSession(qrData);
      }
      if (authData.profile) {
        setProfile(authData.profile);
      }
    }).catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [code]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: authMode === "register" ? "register" : "login",
          name: displayName.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (data.error) { setAuthError(data.error); }
      else if (data.profile) { setProfile(data.profile); }
    } catch { setAuthError("Network error"); }
    setAuthLoading(false);
  };

  const claimAndPlay = async () => {
    setClaiming(true);
    try {
      const res = await fetch("/api/qr-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", code }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        // Set the QR bonus cookie — game completion will check this for double points
        document.cookie = `banditos_qr=${code}; path=/; max-age=${60 * 60 * 12}; samesite=lax`;
        setClaimed(true);
        // Brief delay to show the success screen, then redirect to play
        setTimeout(() => router.push("/play"), 1500);
      }
    } catch { setError("Network error"); }
    setClaiming(false);
  };

  // Auto-claim when logged in and session is available
  useEffect(() => {
    if (profile && qrSession && !qrSession.claimed && !claiming && !claimed) {
      claimAndPlay();
    } else if (profile && qrSession?.claimed && qrSession.claimedBy === profile.id) {
      // Already claimed by this player — set cookie and go to play
      document.cookie = `banditos_qr=${code}; path=/; max-age=${60 * 60 * 12}; samesite=lax`;
      setClaimed(true);
      setTimeout(() => router.push("/play"), 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, qrSession]);

  if (loading) {
    return (
      <div className="min-h-screen bg-banditos-dark flex items-center justify-center">
        <BanditosLogo size="md" />
      </div>
    );
  }

  // Successfully claimed — show bonus activation
  if (claimed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-green-500/20 border border-green-500/40 rounded-2xl p-8 text-center max-w-sm w-full animate-slide-up">
          <span className="text-6xl">🎉</span>
          <h2 className="text-green-300 text-2xl font-bold mt-4">2x Points Activated!</h2>
          <p className="text-green-300/70 mt-2">You&apos;re at Bandidos — all points are doubled for this session!</p>
          <p className="text-white/40 text-sm mt-4">Taking you to trivia...</p>
        </div>
      </div>
    );
  }

  // Invalid/expired QR code
  if (error && !qrSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-red-500/20 border border-red-500/40 rounded-2xl p-8 text-center max-w-sm w-full">
          <span className="text-5xl">🚫</span>
          <h2 className="text-white text-xl font-bold mt-4">Invalid QR Code</h2>
          <p className="text-white/60 mt-2">{error}</p>
          <p className="text-white/40 text-sm mt-4">Ask the host for a valid QR code for double points!</p>
        </div>
        <button onClick={() => router.push("/play")} className="mt-6 text-banditos-gold text-sm hover:underline">Play without bonus &rarr;</button>
      </div>
    );
  }

  // Already claimed by someone else
  if (qrSession?.claimed && profile && qrSession.claimedBy !== profile.id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-orange-500/20 border border-orange-500/40 rounded-2xl p-8 text-center max-w-sm w-full">
          <span className="text-5xl">⚠️</span>
          <h2 className="text-white text-xl font-bold mt-4">Already Claimed</h2>
          <p className="text-white/60 mt-2">This QR code ({qrSession.name}) has already been claimed by another player.</p>
          <p className="text-white/40 text-sm mt-4">Ask the host for a different QR code!</p>
        </div>
        <button onClick={() => router.push("/play")} className="mt-6 text-banditos-gold text-sm hover:underline">Play without bonus &rarr;</button>
      </div>
    );
  }

  // Error with fallback
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-red-500/20 border border-red-500/40 rounded-2xl p-8 text-center max-w-sm w-full">
          <span className="text-5xl">❌</span>
          <h2 className="text-white text-xl font-bold mt-4">Error</h2>
          <p className="text-white/60 mt-2">{error}</p>
        </div>
        <button onClick={() => router.push("/play")} className="mt-6 text-banditos-gold text-sm hover:underline">Play without bonus &rarr;</button>
      </div>
    );
  }

  // Need to log in / register first
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />

        <div className="mt-4 bg-green-500/20 border border-green-500/40 rounded-2xl p-4 text-center max-w-sm w-full">
          <span className="text-2xl">📍</span>
          <p className="text-green-300 font-bold text-sm mt-1">You&apos;re at Bandidos! — {qrSession?.name}</p>
          <p className="text-green-300/60 text-xs">Sign in to activate 2x points!</p>
        </div>

        <div className="mt-4 w-full max-w-sm bg-white/10 backdrop-blur rounded-2xl p-6">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setAuthMode("register")} className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${authMode === "register" ? "bg-banditos-red text-white" : "text-white/60"}`}>
              New Player
            </button>
            <button onClick={() => setAuthMode("login")} className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${authMode === "login" ? "bg-banditos-red text-white" : "text-white/60"}`}>
              Returning
            </button>
          </div>

          {authError && <p className="text-red-400 text-sm mb-3 text-center">{authError}</p>}

          <form onSubmit={handleAuth} className="space-y-3">
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name" autoFocus required
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none text-lg" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" required minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none" />
            <button type="submit" disabled={authLoading || !displayName.trim()}
              className="w-full bg-banditos-red text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-50">
              {authLoading ? "..." : authMode === "register" ? "JOIN & GET 2x" : "LOG IN & GET 2x"}
            </button>
          </form>
        </div>

        <button onClick={() => router.push("/play")} className="mt-6 text-white/40 text-sm hover:text-white/60">Play without bonus &rarr;</button>
      </div>
    );
  }

  // Claiming in progress
  return (
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
      <BanditosLogo size="md" />
      <div className="mt-8 bg-white/10 backdrop-blur rounded-2xl p-8 text-center max-w-sm w-full">
        <span className="text-5xl animate-pulse">📍</span>
        <h2 className="text-white text-xl font-bold mt-4">{claiming ? "Activating 2x points..." : "Ready!"}</h2>
        <p className="text-white/60 mt-2">{qrSession?.name}</p>
      </div>
    </div>
  );
}
