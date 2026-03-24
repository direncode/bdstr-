"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";

interface QrSession {
  id: string; code: string; name: string;
  qr_type: "outside" | "inside" | "trivia_night";
  claimed: boolean; claimedBy: string | null;
}

const TIER_INFO = {
  outside: { label: "1x Points", color: "text-blue-300", bg: "bg-blue-500/20", border: "border-blue-500/40", desc: "Welcome to Bandidos Trivia! Sign up to play." },
  inside: { label: "2x Points", color: "text-green-300", bg: "bg-green-500/20", border: "border-green-500/40", desc: "You're at Bandidos — double points on all trivia!" },
  trivia_night: { label: "3x Points", color: "text-purple-300", bg: "bg-purple-500/20", border: "border-purple-500/40", desc: "Trivia Night! Triple points on all rounds tonight." },
};

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
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInFailed, setCheckInFailed] = useState(false);

  // Auth state
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const qrType = qrSession?.qr_type || "inside";
  const tier = TIER_INFO[qrType] || TIER_INFO.inside;

  useEffect(() => {
    Promise.all([
      fetch(`/api/qr-sessions?code=${code}`).then(r => r.json()),
      fetch("/api/auth").then(r => r.json()),
    ]).then(([qrData, authData]) => {
      if (qrData.error) { setError(qrData.error); }
      else { setQrSession(qrData); }
      if (authData.profile) { setProfile(authData.profile); }
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

  const claimAndCheckIn = async () => {
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
        // Set QR cookie with type: "CODE:type"
        const cookieType = data.qr_type || qrType;
        document.cookie = `banditos_qr=${code}:${cookieType}; path=/; max-age=${60 * 60 * 12}; samesite=lax`;
        setClaimed(true);

        // Auto check-in for trivia night codes
        if (cookieType === "trivia_night") {
          try {
            const checkinRes = await fetch("/api/trivia-night", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "checkin" }),
            });
            const checkinData = await checkinRes.json();
            if (checkinData.ok) { setCheckedIn(true); }
            else { setCheckInFailed(true); }
          } catch { setCheckInFailed(true); }
        } else {
          // Not a trivia night code — go straight to success
          setCheckInFailed(true); // "failed" just means no trivia night check-in needed
        }
      }
    } catch { setError("Network error"); }
    setClaiming(false);
  };

  // Auto-claim when logged in and session is available
  useEffect(() => {
    if (profile && qrSession && !claiming && !claimed) {
      // Outside codes never need claiming
      if (qrSession.qr_type === "outside") {
        document.cookie = `banditos_qr=${code}:outside; path=/; max-age=${60 * 60 * 12}; samesite=lax`;
        setClaimed(true);
        setCheckInFailed(true); // no trivia check-in for outside
        return;
      }
      if (!qrSession.claimed) {
        claimAndCheckIn();
      } else if (qrSession.claimedBy === profile.id) {
        document.cookie = `banditos_qr=${code}:${qrSession.qr_type}; path=/; max-age=${60 * 60 * 12}; samesite=lax`;
        setClaimed(true);
        if (qrSession.qr_type === "trivia_night") {
          fetch("/api/trivia-night", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "checkin" }),
          }).then(r => r.json()).then(data => {
            if (data.ok) setCheckedIn(true);
            else setCheckInFailed(true);
          }).catch(() => setCheckInFailed(true));
        } else {
          setCheckInFailed(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, qrSession]);

  if (loading) {
    return <div className="min-h-screen bg-banditos-dark flex items-center justify-center" role="status"><BanditosLogo size="md" /></div>;
  }

  // ===== SUCCESS: Trivia Night 3x =====
  if (claimed && checkedIn && qrType === "trivia_night") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-purple-500/20 border border-purple-500/40 rounded-2xl p-8 text-center max-w-sm w-full" role="status">
          <h2 className="text-purple-300 text-3xl font-bold">You&apos;re Checked In!</h2>
          <p className="text-purple-300/80 mt-3 text-lg">Welcome to Trivia Night</p>
          <div className="mt-4 bg-purple-500/10 rounded-xl p-4">
            <p className="text-purple-300 font-bold text-2xl">3x POINTS</p>
            <p className="text-purple-300/60 text-xs mt-1">Triple points on all rounds tonight</p>
          </div>
          <p className="text-white/50 text-sm mt-4">The host will score each round — sit tight and have fun!</p>
        </div>
        <button onClick={() => router.push("/")} className="mt-6 bg-banditos-red text-white px-8 py-3 rounded-2xl font-bold text-lg hover:bg-red-700 transition-colors">
          Go to Home
        </button>
      </main>
    );
  }

  // ===== SUCCESS: Inside 2x =====
  if (claimed && qrType === "inside") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-green-500/20 border border-green-500/40 rounded-2xl p-8 text-center max-w-sm w-full" role="status">
          <h2 className="text-green-300 text-3xl font-bold">2x Points Active!</h2>
          <p className="text-green-300/70 mt-2">You&apos;re at Bandidos — all points are doubled.</p>
          <div className="mt-4 bg-green-500/10 rounded-xl p-4">
            <p className="text-green-300 font-bold text-2xl">2x POINTS</p>
            <p className="text-green-300/60 text-xs mt-1">Double points on today&apos;s trivia questions</p>
          </div>
        </div>
        <button onClick={() => router.push("/play")} className="mt-6 bg-banditos-red text-white px-8 py-3 rounded-2xl font-bold text-lg hover:bg-red-700 transition-colors">
          Play Trivia
        </button>
      </main>
    );
  }

  // ===== SUCCESS: Outside 1x =====
  if (claimed && qrType === "outside") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-blue-500/20 border border-blue-500/40 rounded-2xl p-8 text-center max-w-sm w-full" role="status">
          <h2 className="text-blue-300 text-2xl font-bold">Welcome to Bandidos Trivia!</h2>
          <p className="text-blue-300/70 mt-2">Play trivia, earn points, climb the leaderboard.</p>
          <div className="mt-4 bg-blue-500/10 rounded-xl p-4">
            <p className="text-white/80 text-sm">Come inside and scan a table QR code for <span className="text-green-300 font-bold">2x points</span></p>
          </div>
        </div>
        <button onClick={() => router.push("/play")} className="mt-6 bg-banditos-red text-white px-8 py-3 rounded-2xl font-bold text-lg hover:bg-red-700 transition-colors">
          Play Trivia
        </button>
      </main>
    );
  }

  // ===== SUCCESS: Trivia night claimed but no active night =====
  if (claimed && qrType === "trivia_night" && checkInFailed) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-purple-500/20 border border-purple-500/40 rounded-2xl p-8 text-center max-w-sm w-full" role="status">
          <h2 className="text-purple-300 text-2xl font-bold">3x Code Claimed!</h2>
          <p className="text-purple-300/70 mt-2">No Trivia Night is active yet, but your 3x code is ready.</p>
          <p className="text-white/40 text-sm mt-4">When the host opens Trivia Night, you&apos;ll get triple points automatically.</p>
        </div>
        <button onClick={() => router.push("/")} className="mt-6 bg-banditos-red text-white px-8 py-3 rounded-2xl font-bold text-lg hover:bg-red-700 transition-colors">
          Go to Home
        </button>
      </main>
    );
  }

  // Claiming in progress
  if (claimed) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-white/10 backdrop-blur rounded-2xl p-8 text-center max-w-sm w-full" role="status">
          <h2 className="text-white text-xl font-bold">Setting up your bonus...</h2>
          <p className="text-white/60 mt-2">{qrSession?.name}</p>
        </div>
      </main>
    );
  }

  // Invalid/expired QR code
  if (error && !qrSession) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-red-500/20 border border-red-500/40 rounded-2xl p-8 text-center max-w-sm w-full" role="alert">
          <h2 className="text-white text-xl font-bold">Invalid QR Code</h2>
          <p className="text-white/60 mt-2">{error}</p>
        </div>
        <button onClick={() => router.push("/")} className="mt-6 text-banditos-gold text-sm hover:underline">Go to Home &rarr;</button>
      </main>
    );
  }

  // Already claimed by someone else
  if (qrSession?.claimed && profile && qrSession.claimedBy !== profile.id && qrType !== "outside") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-orange-500/20 border border-orange-500/40 rounded-2xl p-8 text-center max-w-sm w-full" role="alert">
          <h2 className="text-white text-xl font-bold">Already Claimed</h2>
          <p className="text-white/60 mt-2">This QR code ({qrSession.name}) has been claimed by another player.</p>
          <p className="text-white/40 text-sm mt-4">Ask the host for a different code.</p>
        </div>
        <button onClick={() => router.push("/")} className="mt-6 text-banditos-gold text-sm hover:underline">Go to Home &rarr;</button>
      </main>
    );
  }

  // Error fallback
  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-red-500/20 border border-red-500/40 rounded-2xl p-8 text-center max-w-sm w-full" role="alert">
          <h2 className="text-white text-xl font-bold">Error</h2>
          <p className="text-white/60 mt-2">{error}</p>
        </div>
        <button onClick={() => router.push("/")} className="mt-6 text-banditos-gold text-sm hover:underline">Go to Home &rarr;</button>
      </main>
    );
  }

  // ===== NEED TO LOG IN / REGISTER =====
  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />

        <div className={`mt-4 ${tier.bg} border ${tier.border} rounded-2xl p-4 text-center max-w-sm w-full`} role="status">
          <p className={`${tier.color} font-bold text-sm`}>{tier.label} — {qrSession?.name}</p>
          <p className={`${tier.color} opacity-60 text-xs`}>{tier.desc}</p>
        </div>

        <div className="mt-4 w-full max-w-sm bg-white/10 backdrop-blur rounded-2xl p-6">
          <div className="flex gap-2 mb-6" role="tablist" aria-label="Login or register">
            <button onClick={() => setAuthMode("register")} role="tab" aria-selected={authMode === "register"}
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${authMode === "register" ? "bg-banditos-red text-white" : "text-white/60"}`}>
              New Player
            </button>
            <button onClick={() => setAuthMode("login")} role="tab" aria-selected={authMode === "login"}
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${authMode === "login" ? "bg-banditos-red text-white" : "text-white/60"}`}>
              Returning
            </button>
          </div>

          {authError && <p className="text-red-400 text-sm mb-3 text-center" role="alert">{authError}</p>}

          <form onSubmit={handleAuth} className="space-y-3">
            <div>
              <label htmlFor="join-name" className="sr-only">Display name</label>
              <input id="join-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder={authMode === "register" ? "Choose a display name" : "Your display name"} autoFocus required
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none text-lg" />
            </div>
            <div>
              <label htmlFor="join-password" className="sr-only">Password</label>
              <input id="join-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" required minLength={4}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none" />
            </div>
            <button type="submit" disabled={authLoading || !displayName.trim()}
              className="w-full bg-banditos-red text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-50">
              {authLoading ? "Loading..." : authMode === "register" ? "JOIN" : "LOG IN"}
            </button>
          </form>
        </div>

        <button onClick={() => router.push("/")} className="mt-6 text-white/40 text-sm hover:text-white/60">Go to Home &rarr;</button>
      </main>
    );
  }

  // Claiming in progress
  return (
    <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
      <BanditosLogo size="md" />
      <div className="mt-8 bg-white/10 backdrop-blur rounded-2xl p-8 text-center max-w-sm w-full" role="status">
        <h2 className="text-white text-xl font-bold">{claiming ? "Scanning your QR code..." : "Ready!"}</h2>
        <p className="text-white/60 mt-2">{qrSession?.name}</p>
      </div>
    </main>
  );
}
