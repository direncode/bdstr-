"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";

interface Question {
  id: string; question: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct: string; sort_order: number;
}
interface Round {
  id: string; name: string; category: string; sort_order: number;
  questions: Question[];
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);

  const loadAdmin = useCallback(async () => {
    try {
      const authRes = await fetch("/api/auth");
      const authData = await authRes.json();
      if (!authData.profile?.is_admin) { router.push("/"); return; }
      setIsAdmin(true);

      const adminRes = await fetch("/api/admin");
      const adminData = await adminRes.json();
      setIsUnlocked(adminData.isUnlocked);
      setActiveRoundId(adminData.activeRoundId);
      setRounds(adminData.rounds);
    } catch { router.push("/"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadAdmin(); }, [loadAdmin]);

  const doAction = async (action: string, extra: Record<string, string> = {}) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    loadAdmin();
  };

  if (loading) return <div className="min-h-screen bg-banditos-dark flex items-center justify-center"><BanditosLogo size="md" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => router.push("/")} className="text-white/60 hover:text-white">← Back</button>
        <BanditosLogo size="sm" />
        <div className="w-10" />
      </div>

      <h1 className="text-white text-2xl font-bold text-center mb-2">Admin Panel</h1>
      <p className="text-center text-white/40 text-sm mb-8">
        Edit questions directly in{" "}
        <a href={`https://supabase.com/dashboard`} target="_blank" rel="noopener noreferrer" className="text-banditos-gold underline">
          Supabase Table Editor
        </a>
        {" "}— it works like a spreadsheet!
      </p>

      <div className="max-w-lg mx-auto space-y-4">
        {/* Unlock Toggle */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">Trivia Gate</h2>
              <p className="text-white/50 text-sm">
                {isUnlocked ? "Players can join" : "Players see a locked screen"}
              </p>
            </div>
            <button
              onClick={() => doAction("toggle-unlock")}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${isUnlocked ? "bg-green-500 text-white hover:bg-green-600" : "bg-red-500 text-white hover:bg-red-600"}`}
            >
              {isUnlocked ? "🔓 OPEN" : "🔒 LOCKED"}
            </button>
          </div>
        </div>

        {/* Active Round */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">Active Round</h2>
          <div className="space-y-2">
            <button
              onClick={() => doAction("set-round", { roundId: "" })}
              className={`w-full p-3 rounded-xl text-left transition-colors ${!activeRoundId ? "bg-banditos-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
            >
              None (waiting room)
            </button>
            {rounds.map((r) => (
              <button
                key={r.id}
                onClick={() => doAction("set-round", { roundId: r.id })}
                className={`w-full p-3 rounded-xl text-left transition-colors ${activeRoundId === r.id ? "bg-banditos-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
              >
                <span className="font-medium">{r.name}</span>
                <span className="text-xs ml-2 opacity-60">{r.questions.length} questions</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reset */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-2">Game Controls</h2>
          <button
            onClick={() => { if (confirm("Reset all answers for the active round?")) doAction("reset-answers"); }}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-medium hover:bg-orange-700 transition-colors"
          >
            Reset Answers (Active Round)
          </button>
        </div>

        {/* Questions Preview */}
        {activeRoundId && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">
              Questions: {rounds.find((r) => r.id === activeRoundId)?.name}
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {rounds.find((r) => r.id === activeRoundId)?.questions.map((q, i) => (
                <div key={q.id} className="bg-white/5 rounded-xl p-3">
                  <p className="text-white text-sm font-medium">{i + 1}. {q.question}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {[
                      { label: "A", val: q.option_a },
                      { label: "B", val: q.option_b },
                      { label: "C", val: q.option_c },
                      { label: "D", val: q.option_d },
                    ].map((opt) => (
                      <span key={opt.label}
                        className={`text-xs px-2 py-0.5 rounded ${opt.label === q.correct ? "bg-green-500/30 text-green-300" : "bg-white/10 text-white/40"}`}>
                        {opt.label}: {opt.val}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
