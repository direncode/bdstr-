"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import { BottomNav } from "@/components/BottomNav";
import type { Profile } from "@/lib/supabase";

interface GameQuestion {
  id: string; text: string; points: number; order: number; answered: boolean;
}
interface RoundInfo { id: string; name: string; category: string }
interface AnswerResult { isCorrect: boolean; points: number; correctAnswer: string }
interface GameComplete {
  correctCount: number; totalQuestions: number; totalPoints: number;
  maxStreak: number; perfectRound: boolean;
  qrType: string; multiplier: number; bonusPoints: number;
}

type Screen = "auth" | "gate" | "playing" | "result" | "complete";

export default function PlayPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>("auth");
  const [loading, setLoading] = useState(true);
  const [hasQrBonus, setHasQrBonus] = useState(false);

  // Auth
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Game
  const [unlocked, setUnlocked] = useState(false);
  const [round, setRound] = useState<RoundInfo | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [busyness, setBusyness] = useState<{ percent: number; questionsAllowed: number; totalInRound: number } | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gameResult, setGameResult] = useState<GameComplete | null>(null);
  const [streak, setStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const qrCookie = document.cookie.split("; ").find(c => c.startsWith("banditos_qr="))?.split("=")[1];
    if (qrCookie) setHasQrBonus(true);

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
        setBusyness(d.busyness || null);
        const first = (d.questions || []).findIndex((q: GameQuestion) => !q.answered);
        setCurrentIdx(first >= 0 ? first : 0);
      });
  }, []);

  useEffect(() => {
    if (screen === "gate" || screen === "playing") loadGame();
  }, [screen, loadGame]);

  useEffect(() => {
    if (screen === "playing" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [screen, currentIdx]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: authMode === "register" ? "register" : "login", name: displayName.trim(), password }),
      });
      const data = await res.json();
      if (data.error) { setAuthError(data.error); setAuthLoading(false); return; }
      if (data.profile) { setProfile(data.profile); setScreen("gate"); }
      else { setAuthError("Account created but profile not ready. Please try logging in."); }
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

  const submitAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting || !answerText.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: questions[currentIdx].id, answer: answerText.trim() }),
    });
    const data = await res.json();
    setResult(data);
    if (data.isCorrect) setStreak((s) => s + 1); else setStreak(0);
    setSubmitting(false);
    setScreen("result");
  };

  const nextQuestion = () => {
    setAnswerText("");
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
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4 safe-bottom">
        <BanditosLogo size="md" />

        {hasQrBonus && (
          <div className="mt-4 bg-green-500/20 border border-green-500/40 rounded-2xl p-3 text-center max-w-sm w-full" role="status">
            <p className="text-green-300 font-bold text-sm">QR Scanned — 2x Points Active</p>
          </div>
        )}

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
              <label htmlFor="auth-name" className="sr-only">Display name</label>
              <input id="auth-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder={authMode === "register" ? "Choose a display name" : "Your display name"} autoFocus required
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none text-lg" />
            </div>
            <div>
              <label htmlFor="auth-password" className="sr-only">Password</label>
              <input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" required minLength={4}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-banditos-gold outline-none" />
            </div>
            <button type="submit" disabled={authLoading || !displayName.trim()}
              className="w-full bg-banditos-red text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-50">
              {authLoading ? "Loading..." : authMode === "register" ? "JOIN" : "LOG IN"}
            </button>
          </form>
        </div>

        <button onClick={() => router.push("/")} className="mt-6 text-white/40 text-sm hover:text-white/60" aria-label="Go back to home">&larr; Back</button>
      </main>
    );
  }

  // ============ GATE ============
  if (screen === "gate") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4 pb-32 safe-bottom">
        <BanditosLogo size="lg" />

        {hasQrBonus && (
          <div className="mt-4 bg-green-500/20 border border-green-500/40 rounded-xl px-4 py-2 text-center" role="status">
            <p className="text-green-300 font-bold text-sm">2x POINTS — In-Store Bonus Active</p>
          </div>
        )}

        <div className="mt-4 w-full max-w-sm">
          {!unlocked ? (
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
                <h2 className="text-white text-xl font-bold">Trivia is Locked</h2>
                <p className="text-white/60 mt-2">Waiting for the host to start tonight&apos;s game.</p>
                <button onClick={loadGame} className="mt-4 text-banditos-gold text-sm hover:underline">Refresh</button>
              </div>
            </div>
          ) : !round ? (
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
                <h2 className="text-white text-xl font-bold">Trivia is Open</h2>
                <p className="text-white/60 mt-2">Host is picking a round...</p>
                <button onClick={loadGame} className="mt-4 text-banditos-gold text-sm hover:underline">Refresh</button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              {busyness && (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 text-sm font-medium">Bandidos Right Now</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                      {busyness.percent < 20 ? "Quiet" : busyness.percent < 40 ? "Moderate" : busyness.percent < 60 ? "Busy" : busyness.percent < 80 ? "Very Busy" : "Packed"}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden" role="progressbar" aria-valuenow={busyness.percent} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className={`h-full rounded-full bg-gradient-to-r transition-all duration-1000 ${busyness.percent < 25 ? "from-green-400 to-green-500" : busyness.percent < 50 ? "from-yellow-400 to-yellow-500" : busyness.percent < 75 ? "from-orange-400 to-orange-500" : "from-red-400 to-red-500"}`}
                      style={{ width: `${busyness.percent}%` }}
                    />
                  </div>
                  <p className="text-white/50 text-xs mt-2">
                    {busyness.questionsAllowed} of {busyness.totalInRound} questions unlocked tonight
                  </p>
                </div>
              )}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
                <h2 className="text-white text-xl font-bold">{round.name}</h2>
                <p className="text-white/60 mt-2">
                  {questions.length} questions &middot; {questions.filter((q) => !q.answered).length} remaining
                </p>
                <button onClick={() => setScreen("playing")}
                  className="mt-6 w-full bg-banditos-red text-white py-4 rounded-2xl font-bold text-xl hover:bg-red-700 transition-colors">
                  START
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="mt-6 flex gap-3 items-center" aria-label="Quick links">
          <span className="text-white/50 text-sm">{profile?.display_name}</span>
          <span className="text-white/20" aria-hidden="true">|</span>
          <button onClick={handleSignOut} className="text-white/40 text-sm hover:text-white/60">Logout</button>
        </nav>

        <BottomNav isAdmin={profile?.is_admin} />
      </main>
    );
  }

  // ============ PLAYING / RESULT ============
  if (screen === "playing" || screen === "result") {
    const q = questions[currentIdx];
    if (!q) return null;

    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col px-4 py-6 safe-bottom">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setScreen("gate")} className="text-white/40 text-sm hover:text-white/60" aria-label="Back to lobby">&larr;</button>
            {round && <span className="text-white/60 text-sm">{round.name}</span>}
          </div>
          <div className="text-right">
            <p className="text-banditos-gold font-bold">{currentIdx + 1}/{questions.length}</p>
            {streak > 0 && <p className="text-orange-400 text-xs">{streak} streak</p>}
            {hasQrBonus && <p className="text-green-400 text-xs font-bold">BONUS PTS</p>}
          </div>
        </header>

        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
            <p className="text-white text-xl font-bold leading-relaxed">{q.text}</p>
            <p className="text-banditos-gold/60 text-sm mt-2">
              1 point{hasQrBonus && <span className="text-green-400 ml-1">(2x = 2 pts)</span>}
            </p>
          </div>

          {screen === "playing" ? (
            <form onSubmit={submitAnswer} className="space-y-3">
              <label htmlFor="answer-input" className="sr-only">Your answer</label>
              <input
                id="answer-input"
                ref={inputRef}
                type="text"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your answer..."
                autoComplete="off"
                autoCapitalize="off"
                className="w-full px-5 py-4 rounded-2xl bg-white/10 text-white text-lg placeholder-white/30 border-2 border-white/20 focus:border-banditos-gold outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={submitting || !answerText.trim()}
                className="w-full bg-banditos-red text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {submitting ? "Checking..." : "SUBMIT"}
              </button>
            </form>
          ) : (
            result && (
              <div role="status">
                <div className={`rounded-2xl p-6 text-center ${result.isCorrect ? "bg-green-500/20 border border-green-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
                  <p className="text-white font-bold text-2xl">
                    {result.isCorrect ? "Correct" : "Incorrect"}
                  </p>
                  <p className="text-white font-bold text-lg mt-1">
                    {result.isCorrect ? `+${result.points} points` : ""}
                  </p>
                  {!result.isCorrect && (
                    <p className="text-white/60 mt-2 text-sm">
                      The answer was: <span className="text-banditos-gold font-bold">{result.correctAnswer}</span>
                    </p>
                  )}
                </div>
                <button onClick={nextQuestion}
                  className="w-full mt-4 bg-banditos-red text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-700 transition-colors">
                  {currentIdx < questions.length - 1 ? "NEXT QUESTION" : "SEE RESULTS"}
                </button>
              </div>
            )
          )}
        </div>
      </main>
    );
  }

  // ============ COMPLETE ============
  if (screen === "complete" && gameResult) {
    const pct = gameResult.totalQuestions > 0 ? Math.round((gameResult.correctCount / gameResult.totalQuestions) * 100) : 0;
    let grade = "Keep practicing";
    if (pct === 100) grade = "PERFECT"; else if (pct >= 80) grade = "Great job"; else if (pct >= 60) grade = "Nice work"; else if (pct >= 40) grade = "Not bad";

    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4 pb-32 safe-bottom">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-white text-3xl font-bold">{gameResult.perfectRound ? "PERFECT ROUND!" : "Round Complete"}</h1>
          <p className="text-banditos-gold mt-1 font-medium">{grade}</p>
          <div className="mt-6 bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4 text-left">
            <div className="flex justify-between text-white"><span className="text-white/60">Correct</span><span className="font-bold">{gameResult.correctCount}/{gameResult.totalQuestions}</span></div>
            <div className="flex justify-between text-white"><span className="text-white/60">Points</span><span className="font-bold text-banditos-gold">{gameResult.totalPoints}</span></div>
            {gameResult.multiplier > 1 && (
              <div className="flex justify-between text-white">
                <span className="text-white/60">{gameResult.qrType === "trivia_night" ? "Trivia Night 3x" : "In-Store 2x"}</span>
                <span className="font-bold text-green-400">+{gameResult.bonusPoints}</span>
              </div>
            )}
            <div className="flex justify-between text-white"><span className="text-white/60">Best Streak</span><span className="font-bold">{gameResult.maxStreak}</span></div>
            <div className="pt-2">
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Accuracy">
                <div className="h-full bg-gradient-to-r from-banditos-red to-banditos-gold rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-white/40 text-sm mt-1 text-center">{pct}% accuracy</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <button onClick={() => router.push("/leaderboard")} className="w-full bg-banditos-gold text-banditos-dark py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity">VIEW LEADERBOARD</button>
            <button onClick={() => { setScreen("gate"); loadGame(); }} className="w-full bg-white/10 text-white py-3 rounded-2xl font-medium border border-white/20 hover:bg-white/20 transition-colors">Back to Lobby</button>
            <button onClick={() => router.push("/")} className="w-full text-white/40 text-sm hover:text-white/60">Back to Home</button>
          </div>
        </div>

        <BottomNav isAdmin={profile?.is_admin} />
      </main>
    );
  }

  return null;
}
