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
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInFailed, setCheckInFailed] = useState(false);

  // Auth state
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authEmail, setAuthEmail] = useState("");
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
          email: authEmail.trim(),
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
        // Set QR cookie
        document.cookie = `banditos_qr=${code}; path=/; max-age=${60 * 60 * 12}; samesite=lax`;
        setClaimed(true);

        // Auto check-in for trivia night
        try {
          const checkinRes = await fetch("/api/trivia-night", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "checkin" }),
          });
          const checkinData = await checkinRes.json();
          if (checkinData.ok) {
            setCheckedIn(true);
          } else {
            // No active trivia night — that's fine, they still get 2x points
            setCheckInFailed(true);
          }
        } catch {
          setCheckInFailed(true);
        }
      }
    } catch { setError("Network error"); }
    setClaiming(false);
  };

  // Auto-claim when logged in and session is available
  useEffect(() => {
    if (profile && qrSession && !qrSession.claimed && !claiming && !claimed) {
      claimAndCheckIn();
    } else if (profile && qrSession?.claimed && qrSession.claimedBy === profile.id) {
      document.cookie = `banditos_qr=${code}; path=/; max-age=${60 * 60 * 12}; samesite=lax`;
      setClaimed(true);
      // Also try to check in
      fetch("/api/trivia-night", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin" }),
      }).then(r => r.json()).then(data => {
        if (data.ok) setCheckedIn(true);
        else setCheckInFailed(true);
      }).catch(() => setCheckInFailed(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, qrSession]);

  if (loading) {
    return (
      <div className="min-h-screen bg-banditos-dark flex items-center justify-center" role="status">
        <BanditosLogo size="md" />
      </div>
    );
  }

  // Successfully claimed + checked in for trivia night
  if (claimed && checkedIn) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-green-500/20 border border-green-500/40 rounded-2xl p-8 text-center max-w-sm w-full" role="status">
          <h2 className="text-green-300 text-3xl font-bold">You&apos;re Checked In!</h2>
          <p className="text-green-300/80 mt-3 text-lg">Welcome to Trivia Night at Bandidos</p>
          <div className="mt-4 bg-green-500/10 rounded-xl p-4">
            <p className="text-green-300 font-bold text-sm">3x POINTS ACTIVATED</p>
            <p className="text-green-300/60 text-xs mt-1">Your QR scan gives you triple points on all rounds tonight</p>
          </div>
          <p className="text-white/50 text-sm mt-4">The host will score each round — sit tight and have fun!</p>
        </div>
        <button onClick={() => router.push("/")}
          className="mt-6 bg-banditos-red text-white px-8 py-3 rounded-2xl font-bold text-lg hover:bg-red-700 transition-colors">
          Go to Home
        </button>
      </main>
    );
  }

  // Claimed QR but no active trivia night (gets 2x for regular play)
  if (claimed && checkInFailed) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-green-500/20 border border-green-500/40 rounded-2xl p-8 text-center max-w-sm w-full" role="status">
          <h2 className="text-green-300 text-2xl font-bold">2x Points Activated!</h2>
          <p className="text-green-300/70 mt-2">You&apos;re at Bandidos — all points are doubled for this session.</p>
          <p className="text-white/40 text-sm mt-4">No Trivia Night is active right now, but you can still play trivia with double points!</p>
        </div>
        <button onClick={() => router.push("/play")}
          className="mt-6 bg-banditos-red text-white px-8 py-3 rounded-2xl font-bold text-lg hover:bg-red-700 transition-colors">
          Play Trivia
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
          <h2 className="text-white text-xl font-bold">Checking you in...</h2>
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
          <p className="text-white/40 text-sm mt-4">Ask the host for a valid QR code.</p>
        </div>
        <button onClick={() => router.push("/")} className="mt-6 text-banditos-gold text-sm hover:underline">Go to Home &rarr;</button>
      </main>
    );
  }

  // Already claimed by someone else
  if (qrSession?.claimed && profile && qrSession.claimedBy !== profile.id) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 bg-orange-500/20 border border-orange-500/40 rounded-2xl p-8 text-center max-w-sm w-full" role="alert">
          <h2 className="text-white text-xl font-bold">Already Claimed</h2>
          <p className="text-white/60 mt-2">This QR code ({qrSession.name}) has already been claimed by another player.</p>
          <p className="text-white/40 text-sm mt-4">Ask the host for a different QR code.</p>
        </div>
        <button onClick={() => router.push("/")} className="mt-6 text-banditos-gold text-sm hover:underline">Go to Home &rarr;</button>
      </main>
    );
  }

  // Error with fallback
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

  // Need to log in / register
  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />

        <div className="mt-4 bg-green-500/20 border border-green-500/40 rounded-2xl p-4 text-center max-w-sm w-full" role="status">
          <p className="text-green-300 font-bold text-sm">You&apos;re at Bandidos! — {qrSession?.name}</p>
          <p className="text-green-300/60 text-xs">Sign in to check in for Trivia Night</p>
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
              <label htmlFor="join-email" className="sr-only">Email</label>
              <input id="join-email" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Email" autoFocus required
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none text-lg" />
            </div>
            {authMode === "register" && (
              <div>
                <label htmlFor="join-name" className="sr-only">Display name</label>
                <input id="join-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name" required
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none" />
              </div>
            )}
            <div>
              <label htmlFor="join-password" className="sr-only">Password</label>
              <input id="join-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" required minLength={4}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none" />
            </div>
            <button type="submit" disabled={authLoading || !authEmail.trim() || (authMode === "register" && !displayName.trim())}
              className="w-full bg-banditos-red text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-50">
              {authLoading ? "Loading..." : authMode === "register" ? "JOIN & CHECK IN" : "LOG IN & CHECK IN"}
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
