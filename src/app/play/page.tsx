"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import type { Profile } from "@/lib/supabase";

interface GameQuestion {
  id: string; text: string; options: string[]; points: number; order: number; answered: boolean;
}
interface RoundInfo { id: string; name: string; category: string }
interface AnswerResult { isCorrect: boolean; points: number; correctAnswer: number }
interface GameComplete {
  correctCount: number; totalQuestions: number; totalPoints: number;
  bonusPoints: number; maxStreak: number; perfectRound: boolean;
}

type Screen = "auth" | "gate" | "playing" | "result" | "complete";

export default function PlayPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>("auth");
  const [loading, setLoading] = useState(true);

  // Auth
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Game
  const [unlocked, setUnlocked] = useState(false);
  const [round, setRound] = useState<RoundInfo | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gameResult, setGameResult] = useState<GameComplete | null>(null);
  const [streak, setStreak] = useState(0);

  // Check if already logged in
  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => { if (d.profile) { setProfile(d.profile); setScreen("gate"); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadGame = useCallback(() => {
    fetch("/api/game")
      .then((r) => r.json())
      .then((d) => {
        setUnlocked(d.unlocked);
        setRound(d.round);
        setQuestions(d.questions || []);
        const first = (d.questions || []).findIndex((q: GameQuestion) => !q.answered);
        setCurrentIdx(first >= 0 ? first : 0);
      });
  }, []);

  useEffect(() => {
    if (screen === "gate" || screen === "playing") loadGame();
  }, [screen, loadGame]);

  // Sign up or sign in via server API
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
          email,
          password,
          displayName: displayName || email.split("@")[0],
        }),
      });
      const data = await res.json();

      if (data.error) {
        setAuthError(data.error);
        setAuthLoading(false);
        return;
      }

      if (data.profile) {
        setProfile(data.profile);
        setScreen("gate");
      } else {
        setAuthError("Account created but profile not ready. Please try logging in.");
      }
    } catch (err) {
      setAuthError("Network error — check your connection and try again.");
      console.error("Auth error:", err);
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setProfile(null);
    setScreen("auth");
  };

  const submitAnswer = async (optionIdx: number) => {
    if (submitting || selected !== null) return;
    setSelected(optionIdx);
    setSubmitting(true);
    const res = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: questions[currentIdx].id, selected: optionIdx }),
    });
    const data = await res.json();
    setResult(data);
    if (data.isCorrect) setStreak((s) => s + 1); else setStreak(0);
    setSubmitting(false);
    setScreen("result");
  };

  const nextQuestion = () => {
    setSelected(null);
    setResult(null);
    if (currentIdx < questions.length - 1) { setCurrentIdx(currentIdx + 1); setScreen("playing"); }
    else { completeGame(); }
  };

  const completeGame = async () => {
    const res = await fetch("/api/game/complete", { method: "POST" });
    const data = await res.json();
    setGameResult(data);
    setScreen("complete");
  };

  if (loading) return <div className="min-h-screen bg-banditos-dark flex items-center justify-center"><BanditosLogo size="md" /></div>;

  // ============ AUTH ============
  if (screen === "auth") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <div className="mt-8 w-full max-w-sm bg-white/10 backdrop-blur rounded-2xl p-6">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setAuthMode("register")} className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${authMode === "register" ? "bg-banditos-red text-white" : "text-white/60"}`}>
              Sign Up
            </button>
            <button onClick={() => setAuthMode("login")} className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${authMode === "login" ? "bg-banditos-red text-white" : "text-white/60"}`}>
              Log In
            </button>
          </div>

          {authError && <p className="text-red-400 text-sm mb-3 text-center">{authError}</p>}

          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === "register" && (
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name" autoFocus required
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none text-lg" />
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" required autoFocus={authMode === "login"}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)" required minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none" />
            <button type="submit" disabled={authLoading}
              className="w-full bg-banditos-red text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-50">
              {authLoading ? "..." : authMode === "register" ? "CREATE ACCOUNT" : "LOG IN"}
            </button>
          </form>
        </div>

        <button onClick={() => router.push("/")} className="mt-6 text-white/40 text-sm hover:text-white/60">← Back</button>
      </div>
    );
  }

  // ============ GATE ============
  if (screen === "gate") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="lg" />

        <div className="mt-6 w-full max-w-sm">
          {!unlocked ? (
            <div className="text-center animate-slide-up">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
                <span className="text-6xl">🔒</span>
                <h2 className="text-white text-xl font-bold mt-4">Trivia is Locked</h2>
                <p className="text-white/60 mt-2">Waiting for the host to start tonight&apos;s game!</p>
                <button onClick={loadGame} className="mt-4 text-banditos-gold text-sm hover:underline">Refresh</button>
              </div>
            </div>
          ) : !round ? (
            <div className="text-center animate-slide-up">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
                <span className="text-6xl">🌮</span>
                <h2 className="text-white text-xl font-bold mt-4">Trivia is Open!</h2>
                <p className="text-white/60 mt-2">Host is picking a round...</p>
                <button onClick={loadGame} className="mt-4 text-banditos-gold text-sm hover:underline">Refresh</button>
              </div>
            </div>
          ) : (
            <div className="text-center animate-slide-up">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
                <span className="text-6xl">🎯</span>
                <h2 className="text-white text-xl font-bold mt-4">{round.name}</h2>
                <p className="text-white/60 mt-2">
                  {questions.length} questions &middot; {questions.filter((q) => !q.answered).length} remaining
                </p>
                <button onClick={() => setScreen("playing")}
                  className="mt-6 w-full bg-banditos-red text-white py-4 rounded-2xl font-bold text-xl animate-pulse-glow hover:bg-red-700 transition-colors">
                  START
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3 items-center">
          <span className="text-white/50 text-sm">{profile?.display_name}</span>
          <span className="text-white/20">|</span>
          <button onClick={() => router.push("/leaderboard")} className="text-banditos-gold/60 text-sm hover:text-banditos-gold">Leaderboard</button>
          {profile?.is_admin && (
            <><span className="text-white/20">|</span>
            <button onClick={() => router.push("/admin")} className="text-banditos-gold/60 text-sm hover:text-banditos-gold">Admin</button></>
          )}
          <span className="text-white/20">|</span>
          <button onClick={handleSignOut} className="text-white/40 text-sm hover:text-white/60">Logout</button>
        </div>
      </div>
    );
  }

  // ============ PLAYING / RESULT ============
  if (screen === "playing" || screen === "result") {
    const q = questions[currentIdx];
    if (!q) return null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BanditosLogo size="sm" />
            {round && <span className="text-white/60 text-sm">{round.name}</span>}
          </div>
          <div className="text-right">
            <p className="text-banditos-gold font-bold">{currentIdx + 1}/{questions.length}</p>
            {streak > 0 && <p className="text-orange-400 text-xs">{streak} streak 🔥</p>}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
            <p className="text-white text-xl font-bold leading-relaxed">{q.text}</p>
            <p className="text-banditos-gold/60 text-sm mt-2">{q.points} points</p>
          </div>

          <div className="space-y-3">
            {q.options.map((opt: string, i: number) => {
              let style = "bg-white/10 border-white/20 text-white hover:bg-white/20";
              if (screen === "result" && result) {
                if (i === result.correctAnswer) style = "bg-green-500/30 border-green-400 text-green-300";
                else if (i === selected && !result.isCorrect) style = "bg-red-500/30 border-red-400 text-red-300";
                else style = "bg-white/5 border-white/10 text-white/40";
              } else if (i === selected) {
                style = "bg-banditos-gold/30 border-banditos-gold text-banditos-gold";
              }
              return (
                <button key={i} onClick={() => screen === "playing" && submitAnswer(i)} disabled={screen === "result"}
                  className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${style}`}>
                  <span className="font-bold mr-3 opacity-60">{String.fromCharCode(65 + i)}</span>{opt}
                </button>
              );
            })}
          </div>

          {screen === "result" && result && (
            <div className="mt-6 animate-slide-up">
              <div className={`rounded-2xl p-6 text-center ${result.isCorrect ? "bg-green-500/20 border border-green-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
                <span className="text-4xl">{result.isCorrect ? "✅" : "❌"}</span>
                <p className="text-white font-bold text-lg mt-2">
                  {result.isCorrect ? `+${result.points} points!` : "Not quite!"}
                </p>
              </div>
              <button onClick={nextQuestion}
                className="w-full mt-4 bg-banditos-red text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-700 transition-colors">
                {currentIdx < questions.length - 1 ? "NEXT QUESTION" : "SEE RESULTS"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ COMPLETE ============
  if (screen === "complete" && gameResult) {
    const pct = gameResult.totalQuestions > 0 ? Math.round((gameResult.correctCount / gameResult.totalQuestions) * 100) : 0;
    let emoji = "😅";
    if (pct === 100) emoji = "🏆"; else if (pct >= 80) emoji = "🔥"; else if (pct >= 60) emoji = "💪"; else if (pct >= 40) emoji = "🌮";

    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center animate-slide-up">
          <span className="text-7xl">{emoji}</span>
          <h1 className="text-white text-3xl font-bold mt-4">{gameResult.perfectRound ? "PERFECT ROUND!" : "Round Complete!"}</h1>
          <div className="mt-6 bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4">
            <div className="flex justify-between text-white"><span className="text-white/60">Correct</span><span className="font-bold">{gameResult.correctCount}/{gameResult.totalQuestions}</span></div>
            <div className="flex justify-between text-white"><span className="text-white/60">Points</span><span className="font-bold text-banditos-gold">{gameResult.totalPoints}</span></div>
            {gameResult.bonusPoints > 0 && <div className="flex justify-between text-white"><span className="text-white/60">Bonus</span><span className="font-bold text-green-400">+{gameResult.bonusPoints}</span></div>}
            <div className="flex justify-between text-white"><span className="text-white/60">Best Streak</span><span className="font-bold">{gameResult.maxStreak} 🔥</span></div>
            <div className="pt-2">
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-banditos-red to-banditos-gold rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-white/40 text-sm mt-1">{pct}% accuracy</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <button onClick={() => router.push("/leaderboard")} className="w-full bg-banditos-gold text-banditos-dark py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity">VIEW LEADERBOARD</button>
            <button onClick={() => { setScreen("gate"); loadGame(); }} className="w-full bg-white/10 text-white py-3 rounded-2xl font-medium border border-white/20 hover:bg-white/20 transition-colors">Back to Lobby</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
