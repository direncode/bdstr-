"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import { BottomNav } from "@/components/BottomNav";

interface Question {
  id: string; question: string; answer: string;
  points: number; sort_order: number; round_id: string;
}
interface Round {
  id: string; name: string; category: string; sort_order: number;
  scheduled_date: string | null;
  questions: Question[];
}

type TabType = "game" | "rounds" | "questions" | "schedule" | "triviaadmin" | "qrcodes";
const VALID_TABS: TabType[] = ["game", "rounds", "questions", "schedule", "triviaadmin", "qrcodes"];

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-banditos-dark flex items-center justify-center"><BanditosLogo size="md" /></div>}>
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);

  const tabParam = searchParams.get("tab") as TabType | null;
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "game";
  const [tab, setTab] = useState<TabType>(initialTab);

  // Busyness
  const [busyness, setBusyness] = useState<{ percent: number; questionsAllowed: number; label: string; source: string } | null>(null);
  const [busyOverride, setBusyOverride] = useState("");

  // QR Sessions
  const [qrSessions, setQrSessions] = useState<{ id: string; code: string; name: string; claimed_by: string | null; claimed_name: string | null; claimed_at: string | null; is_active: boolean }[]>([]);
  const [newQrName, setNewQrName] = useState("");
  const [newQrCount, setNewQrCount] = useState("1");
  const [qrLoading, setQrLoading] = useState(false);
  const [outsideCount, setOutsideCount] = useState("1");
  const [insideCount, setInsideCount] = useState("25");
  const [triviaNightCount, setTriviaNightCount] = useState("25");
  const [scoutingCount, setScoutingCount] = useState("1");

  // Trivia Night Admin
  const [tnNight, setTnNight] = useState<{ id: string; week_label: string; is_active: boolean; is_closed: boolean } | null>(null);
  const [tnCheckins, setTnCheckins] = useState<{ id: string; player_id: string; player_name: string; has_qr_bonus: boolean; points_awarded: number; round_scores: { round_number: number; round_label: string; score: number }[] }[]>([]);
  const [tnRoundInputs, setTnRoundInputs] = useState<Record<string, Record<number, string>>>({});
  const [tnNumRounds, setTnNumRounds] = useState(4);
  const [tnLoading, setTnLoading] = useState(false);

  // Round form
  const [newRoundName, setNewRoundName] = useState("");
  const [newRoundCategory, setNewRoundCategory] = useState("");
  const [editingRound, setEditingRound] = useState<Round | null>(null);

  // Question form
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  // Inline editing
  const [editCell, setEditCell] = useState<{ qId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ qId: string; ok: boolean } | null>(null);

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
      if (!selectedRoundId && adminData.rounds.length > 0) {
        setSelectedRoundId(adminData.rounds[0].id);
      }

      // Load busyness
      const busyRes = await fetch("/api/busyness");
      const busyData = await busyRes.json();
      setBusyness(busyData);
    } catch { router.push("/"); }
    finally { setLoading(false); }
  }, [router, selectedRoundId]);

  useEffect(() => { loadAdmin(); }, [loadAdmin]);

  useEffect(() => {
    if (editCell && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editCell]);

  const doAction = async (action: string, extra: Record<string, string | number> = {}) => {
    setSaving(true);
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      await loadAdmin();
    } finally { setSaving(false); }
  };

  // Inline save a single question field
  const saveCell = async (qId: string, field: string, value: string) => {
    setEditCell(null);
    const round = rounds.find((r) => r.questions.some((q) => q.id === qId));
    const q = round?.questions.find((q) => q.id === qId);
    if (!q || q[field as keyof Question] === value) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit-question", questionId: qId, [field]: value }),
      });
      const data = await res.json();
      if (data.error) {
        setSaveStatus({ qId, ok: false });
      } else {
        setSaveStatus({ qId, ok: true });
        setRounds((prev) =>
          prev.map((r) => ({
            ...r,
            questions: r.questions.map((q) =>
              q.id === qId ? { ...q, [field]: value } : q
            ),
          }))
        );
      }
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 1500);
    }
  };

  const startEdit = (qId: string, field: string, currentValue: string) => {
    setEditCell({ qId, field });
    setEditValue(currentValue);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, qId: string, field: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveCell(qId, field, editValue);
    } else if (e.key === "Escape") {
      setEditCell(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      saveCell(qId, field, editValue);
      // Move to next cell
      const fields = ["question", "answer"];
      const currentRoundQuestions = rounds.find((r) => r.id === selectedRoundId)?.questions || [];
      const qIdx = currentRoundQuestions.findIndex((q) => q.id === qId);
      const fIdx = fields.indexOf(field);
      if (fIdx < fields.length - 1) {
        const nextField = fields[fIdx + 1];
        const q = currentRoundQuestions[qIdx];
        setTimeout(() => startEdit(q.id, nextField, q[nextField as keyof Question] as string), 50);
      } else if (qIdx < currentRoundQuestions.length - 1) {
        const nextQ = currentRoundQuestions[qIdx + 1];
        setTimeout(() => startEdit(nextQ.id, "question", nextQ.question), 50);
      }
    }
  };

  // Round handlers
  const handleAddRound = async () => {
    if (!newRoundName.trim() || !newRoundCategory.trim()) return;
    await doAction("add-round", { name: newRoundName.trim(), category: newRoundCategory.trim() });
    setNewRoundName(""); setNewRoundCategory("");
  };

  const handleEditRound = async () => {
    if (!editingRound) return;
    await doAction("edit-round", { roundId: editingRound.id, name: editingRound.name, category: editingRound.category });
    setEditingRound(null);
  };

  const handleDeleteRound = async (roundId: string, name: string) => {
    if (!confirm(`Delete round "${name}" and all its questions?`)) return;
    await doAction("delete-round", { roundId });
  };

  // Question handlers
  const handleAddQuestion = async () => {
    if (!selectedRoundId || !newQuestion.trim() || !newAnswer.trim()) return;
    await doAction("add-question", { round_id: selectedRoundId, question: newQuestion.trim(), answer: newAnswer.trim() });
    setNewQuestion(""); setNewAnswer("");
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question?")) return;
    await doAction("delete-question", { questionId });
  };

  const loadQrSessions = async () => {
    setQrLoading(true);
    try {
      const res = await fetch("/api/qr-sessions");
      const data = await res.json();
      setQrSessions(data.sessions || []);
    } finally { setQrLoading(false); }
  };

  const handleCreateQr = async () => {
    if (!newQrName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/qr-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newQrName.trim(), count: parseInt(newQrCount) || 1 }),
      });
      setNewQrName(""); setNewQrCount("1");
      await loadQrSessions();
    } finally { setSaving(false); }
  };

  const handleQrAction = async (action: string, sessionId?: string, extra: Record<string, string | boolean> = {}) => {
    setSaving(true);
    try {
      await fetch("/api/qr-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sessionId, ...extra }),
      });
      await loadQrSessions();
    } finally { setSaving(false); }
  };

  // Trivia Night handlers
  const loadTriviaNight = async () => {
    setTnLoading(true);
    try {
      const res = await fetch("/api/trivia-night?admin=true");
      const data = await res.json();
      setTnNight(data.night);
      setTnCheckins(data.checkins || []);
    } finally { setTnLoading(false); }
  };

  const openTriviaNight = async () => {
    setSaving(true);
    try {
      await fetch("/api/trivia-night", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open-night" }),
      });
      await loadTriviaNight();
    } finally { setSaving(false); }
  };

  const awardRoundScore = async (checkinId: string, roundNumber: number) => {
    const raw = tnRoundInputs[checkinId]?.[roundNumber];
    const score = parseInt(raw);
    if (isNaN(score) || score < 0) return;
    setSaving(true);
    try {
      await fetch("/api/trivia-night", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "award-round-score", checkinId, roundNumber, roundLabel: `Round ${roundNumber}`, score }),
      });
      await loadTriviaNight();
    } finally { setSaving(false); }
  };

  const awardAllRoundsForPlayer = async (checkinId: string) => {
    const inputs = tnRoundInputs[checkinId] || {};
    setSaving(true);
    try {
      for (let r = 1; r <= tnNumRounds; r++) {
        const raw = inputs[r];
        const score = parseInt(raw);
        if (!isNaN(score) && score >= 0) {
          await fetch("/api/trivia-night", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "award-round-score", checkinId, roundNumber: r, roundLabel: `Round ${r}`, score }),
          });
        }
      }
      await loadTriviaNight();
    } finally { setSaving(false); }
  };

  const closeTriviaNight = async () => {
    if (!tnNight || !confirm("Close this Trivia Night? This will also reset all QR claims for next time.")) return;
    setSaving(true);
    try {
      await fetch("/api/trivia-night", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close-night", nightId: tnNight.id }),
      });
      await loadTriviaNight();
    } finally { setSaving(false); }
  };

  const handleBusynessOverride = async () => {
    const val = parseInt(busyOverride);
    if (isNaN(val) || val < 0 || val > 100) return;
    setSaving(true);
    try {
      const res = await fetch("/api/busyness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "override", percent: val }),
      });
      const data = await res.json();
      setBusyness(data);
      setBusyOverride("");
    } finally { setSaving(false); }
  };

  const handleBusynessRefresh = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/busyness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const data = await res.json();
      setBusyness(data);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-banditos-dark flex items-center justify-center"><BanditosLogo size="md" /></div>;
  if (!isAdmin) return null;

  const currentRoundQuestions = rounds.find((r) => r.id === selectedRoundId)?.questions || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] px-4 py-6 pb-32 safe-bottom">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/")} className="text-white/60 hover:text-white">← Back</button>
        <BanditosLogo size="sm" />
        <button onClick={() => router.push("/qr")} className="text-white/40 hover:text-white text-sm">QR Code</button>
      </div>

      <h1 className="text-white text-2xl font-bold text-center mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {(["game", "rounds", "questions", "schedule", "triviaadmin", "qrcodes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "qrcodes") loadQrSessions(); if (t === "triviaadmin") loadTriviaNight(); }}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${tab === t ? "bg-banditos-red text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
          >
            {{ game: "Game", rounds: "Rounds", questions: "Questions", schedule: "Schedule", triviaadmin: "Trivia Night", qrcodes: "QR Codes" }[t]}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        {/* ==================== GAME TAB ==================== */}
        {tab === "game" && (
          <>
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
                  disabled={saving}
                  className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${isUnlocked ? "bg-green-500 text-white hover:bg-green-600" : "bg-red-500 text-white hover:bg-red-600"}`}
                >
                  {isUnlocked ? "OPEN" : "LOCKED"}
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-2">Active Round</h2>
              {(() => {
                const today = new Date().toISOString().split("T")[0];
                const todaysRounds = rounds.filter((r) => r.scheduled_date === today);
                const otherRounds = rounds.filter((r) => r.scheduled_date !== today);
                return (
                  <div className="space-y-2">
                    <button
                      onClick={() => doAction("set-round", { roundId: "" })}
                      disabled={saving}
                      className={`w-full p-3 rounded-xl text-left transition-colors ${!activeRoundId ? "bg-banditos-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                    >
                      None (waiting room)
                    </button>
                    {todaysRounds.length > 0 && (
                      <>
                        <p className="text-banditos-gold text-xs font-bold uppercase tracking-wider pt-2">Today&apos;s Rounds</p>
                        {todaysRounds.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => doAction("set-round", { roundId: r.id })}
                            disabled={saving}
                            className={`w-full p-3 rounded-xl text-left transition-colors border ${activeRoundId === r.id ? "bg-banditos-red text-white border-banditos-red" : "bg-banditos-gold/10 text-white border-banditos-gold/30 hover:bg-banditos-gold/20"}`}
                          >
                            <span className="font-medium">{r.name}</span>
                            <span className="text-xs ml-2 opacity-60">{r.questions.length} Q&apos;s — 1 pt each</span>
                          </button>
                        ))}
                      </>
                    )}
                    {otherRounds.length > 0 && (
                      <>
                        {todaysRounds.length > 0 && <p className="text-white/30 text-xs font-bold uppercase tracking-wider pt-2">All Rounds</p>}
                        {otherRounds.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => doAction("set-round", { roundId: r.id })}
                            disabled={saving}
                            className={`w-full p-3 rounded-xl text-left transition-colors ${activeRoundId === r.id ? "bg-banditos-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                          >
                            <span className="font-medium">{r.name}</span>
                            <span className="text-xs ml-2 opacity-60">{r.questions.length} Q&apos;s — 1 pt each</span>
                            {r.scheduled_date && <span className="text-xs ml-2 text-banditos-gold/60">{new Date(r.scheduled_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-2">Game Controls</h2>
              <button
                onClick={() => { if (confirm("Reset all answers for the active round?")) doAction("reset-answers"); }}
                disabled={saving}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-medium hover:bg-orange-700 transition-colors"
              >
                Reset Answers (Active Round)
              </button>
            </div>

            {/* Busyness / Question Limiter */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-2">Busyness → Questions</h2>
              <p className="text-white/40 text-sm mb-4">
                Busier restaurant = fewer questions. Resets daily from Google data.
              </p>

              {busyness && (
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{busyness.label}</span>
                    <span className="text-banditos-gold font-bold">{busyness.percent}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r transition-all ${busyness.percent < 25 ? "from-green-400 to-green-500" : busyness.percent < 50 ? "from-yellow-400 to-yellow-500" : busyness.percent < 75 ? "from-orange-400 to-orange-500" : "from-red-400 to-red-500"}`}
                      style={{ width: `${busyness.percent}%` }}
                    />
                  </div>
                  <p className="text-banditos-gold font-bold text-lg">{busyness.questionsAllowed} questions available</p>
                  <p className="text-white/30 text-xs">Source: {busyness.source}</p>
                </div>
              )}

              <div className="flex gap-2 mb-2">
                <input
                  type="number" min="0" max="100"
                  placeholder="Override % (0-100)"
                  value={busyOverride}
                  onChange={(e) => setBusyOverride(e.target.value)}
                  className="flex-1 bg-white/10 text-white rounded-xl px-4 py-2 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold text-sm"
                />
                <button
                  onClick={handleBusynessOverride}
                  disabled={saving || !busyOverride}
                  className="bg-banditos-gold text-banditos-dark px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-40"
                >
                  Set
                </button>
                <button
                  onClick={handleBusynessRefresh}
                  disabled={saving}
                  className="bg-white/10 text-white px-4 py-2 rounded-xl text-sm hover:bg-white/20"
                >
                  Refresh
                </button>
              </div>
              <p className="text-white/20 text-xs">Override sets busyness manually until next daily reset or refresh.</p>
            </div>
          </>
        )}

        {/* ==================== ROUNDS TAB ==================== */}
        {tab === "rounds" && (
          <>
            {/* Weekly Schedule View */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-2">Weekly Schedule</h2>
              <p className="text-white/40 text-sm mb-4">Schedule unlimited rounds per day. Drag dates to plan the whole week ahead.</p>
              <div className="space-y-2">
                {(() => {
                  const today = new Date();
                  const days: { date: string; label: string; dayName: string; isToday: boolean }[] = [];
                  for (let i = 0; i < 7; i++) {
                    const d = new Date(today);
                    d.setDate(d.getDate() + i);
                    const dateStr = d.toISOString().split("T")[0];
                    days.push({
                      date: dateStr,
                      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
                      isToday: i === 0,
                    });
                  }
                  return days.map((day) => {
                    const dayRounds = rounds.filter((r) => r.scheduled_date === day.date);
                    return (
                      <div key={day.date} className={`rounded-xl p-3 ${day.isToday ? "bg-banditos-gold/10 border border-banditos-gold/30" : "bg-white/5 border border-white/5"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${day.isToday ? "text-banditos-gold" : "text-white/70"}`}>{day.dayName}</span>
                            <span className="text-white/40 text-xs">{day.label}</span>
                            {day.isToday && <span className="text-xs bg-banditos-gold/20 text-banditos-gold px-2 py-0.5 rounded-full font-bold">TODAY</span>}
                          </div>
                          <span className="text-white/30 text-xs">{dayRounds.length} round{dayRounds.length !== 1 ? "s" : ""}</span>
                        </div>
                        {dayRounds.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dayRounds.map((r) => (
                              <span key={r.id} className="text-xs bg-banditos-red/20 text-banditos-red px-2 py-1 rounded-lg inline-flex items-center gap-1">
                                {r.name}
                                <button
                                  onClick={() => doAction("schedule-round", { roundId: r.id, date: "" })}
                                  disabled={saving}
                                  className="text-red-400/60 hover:text-red-400 ml-0.5"
                                  title="Unschedule"
                                >x</button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-white/20 text-xs mt-1">No rounds scheduled</p>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Add New Round */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-4">Add New Round</h2>
              <div className="space-y-3">
                <input
                  type="text" placeholder="Round name (e.g. Sports Trivia)"
                  value={newRoundName} onChange={(e) => setNewRoundName(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold"
                />
                <input
                  type="text" placeholder="Category (e.g. sports)"
                  value={newRoundCategory} onChange={(e) => setNewRoundCategory(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold"
                />
                <button
                  onClick={handleAddRound}
                  disabled={saving || !newRoundName.trim() || !newRoundCategory.trim()}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  + Add Round
                </button>
              </div>
            </div>

            {/* All Rounds with Scheduling */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-4">All Rounds ({rounds.length})</h2>
              <p className="text-white/30 text-xs mb-3">Assign a date to schedule rounds. You can schedule unlimited rounds per day.</p>
              {rounds.length === 0 ? (
                <p className="text-white/40 text-center py-4">No rounds yet. Add one above!</p>
              ) : (
                <div className="space-y-3">
                  {rounds.map((r) => (
                    <div key={r.id} className="bg-white/5 rounded-xl p-4">
                      {editingRound?.id === r.id ? (
                        <div className="space-y-2">
                          <input
                            type="text" value={editingRound.name}
                            onChange={(e) => setEditingRound({ ...editingRound, name: e.target.value })}
                            className="w-full bg-white/10 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-banditos-gold"
                          />
                          <input
                            type="text" value={editingRound.category}
                            onChange={(e) => setEditingRound({ ...editingRound, category: e.target.value })}
                            className="w-full bg-white/10 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-banditos-gold"
                          />
                          <div className="flex gap-2">
                            <button onClick={handleEditRound} disabled={saving} className="flex-1 bg-banditos-gold text-black py-2 rounded-lg font-medium text-sm">Save</button>
                            <button onClick={() => setEditingRound(null)} className="flex-1 bg-white/10 text-white py-2 rounded-lg text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{r.name}</p>
                              <p className="text-white/40 text-xs">{r.category} — {r.questions.length} questions — 1 pt each</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingRound(r)} className="text-xs bg-white/10 text-white/60 px-3 py-1.5 rounded-lg hover:bg-white/20">Edit</button>
                              <button onClick={() => handleDeleteRound(r.id, r.name)} disabled={saving} className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/30">Delete</button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <label className="text-white/30 text-xs shrink-0">Schedule:</label>
                            <input
                              type="date"
                              value={r.scheduled_date || ""}
                              onChange={(e) => doAction("schedule-round", { roundId: r.id, date: e.target.value })}
                              className="flex-1 bg-white/10 text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-banditos-gold [color-scheme:dark]"
                            />
                            {r.scheduled_date && (
                              <button
                                onClick={() => doAction("schedule-round", { roundId: r.id, date: "" })}
                                disabled={saving}
                                className="text-xs text-orange-400 hover:text-orange-300"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          {r.scheduled_date && (
                            <p className="text-banditos-gold/60 text-xs mt-1">
                              Scheduled for {new Date(r.scheduled_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== QUESTIONS TAB — INLINE EDITABLE ==================== */}
        {tab === "questions" && (
          <>
            {/* Round Selector */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <div className="flex flex-wrap gap-2">
                {rounds.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRoundId(r.id); setEditCell(null); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedRoundId === r.id ? "bg-banditos-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                  >
                    {r.name} ({r.questions.length})
                  </button>
                ))}
              </div>
              {rounds.length === 0 && <p className="text-white/40 text-sm mt-2">Create a round first in the Rounds tab.</p>}
            </div>

            {/* Inline editable question table */}
            {selectedRoundId && (
              <div className="bg-white/10 backdrop-blur rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-white font-bold text-lg">
                    Questions ({currentRoundQuestions.length})
                  </h2>
                  <p className="text-white/30 text-xs">Click to edit · Tab to move · Enter to save</p>
                </div>

                {currentRoundQuestions.length === 0 ? (
                  <p className="text-white/40 text-center py-8">No questions yet. Add one below!</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-white/40 font-medium text-left px-3 py-2 w-8">#</th>
                          <th className="text-white/40 font-medium text-left px-3 py-2">Question</th>
                          <th className="text-white/40 font-medium text-left px-3 py-2 w-1/3">Answer</th>
                          <th className="text-white/40 font-medium text-center px-3 py-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentRoundQuestions.map((q, i) => (
                          <tr key={q.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${saveStatus?.qId === q.id ? (saveStatus.ok ? "bg-green-500/10" : "bg-red-500/10") : ""}`}>
                            <td className="text-white/30 px-3 py-2 font-mono">{i + 1}</td>

                            {/* Question text */}
                            <td className="px-1 py-1">
                              {editCell?.qId === q.id && editCell.field === "question" ? (
                                <textarea
                                  ref={editRef as React.RefObject<HTMLTextAreaElement>}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => saveCell(q.id, "question", editValue)}
                                  onKeyDown={(e) => handleEditKeyDown(e, q.id, "question")}
                                  rows={2}
                                  className="w-full bg-banditos-gold/20 text-white rounded-lg px-2 py-1.5 outline-none ring-2 ring-banditos-gold resize-none text-sm"
                                />
                              ) : (
                                <div
                                  onClick={() => startEdit(q.id, "question", q.question)}
                                  className="text-white cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white/10 min-h-[32px] transition-colors"
                                >
                                  {q.question || <span className="text-white/20 italic">empty</span>}
                                </div>
                              )}
                            </td>

                            {/* Answer */}
                            <td className="px-1 py-1">
                              {editCell?.qId === q.id && editCell.field === "answer" ? (
                                <input
                                  ref={editRef as React.RefObject<HTMLInputElement>}
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => saveCell(q.id, "answer", editValue)}
                                  onKeyDown={(e) => handleEditKeyDown(e, q.id, "answer")}
                                  className="w-full bg-banditos-gold/20 text-white rounded-lg px-2 py-1.5 outline-none ring-2 ring-banditos-gold text-sm"
                                />
                              ) : (
                                <div
                                  onClick={() => startEdit(q.id, "answer", q.answer)}
                                  className="text-green-300 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white/10 min-h-[32px] transition-colors font-medium"
                                >
                                  {q.answer || <span className="text-white/20 italic">empty</span>}
                                </div>
                              )}
                            </td>

                            {/* Delete */}
                            <td className="px-1 py-1 text-center">
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                disabled={saving}
                                className="text-red-400/40 hover:text-red-400 transition-colors text-lg leading-none"
                                title="Delete question"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Inline add row */}
                <div className="border-t border-white/10 p-4">
                  <p className="text-white/40 text-xs mb-3">Add new question:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Question"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="flex-1 bg-white/5 text-white rounded-xl px-4 py-3 placeholder-white/20 outline-none focus:ring-2 focus:ring-banditos-gold text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Answer"
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      className="w-1/3 bg-white/5 text-white rounded-xl px-4 py-3 placeholder-white/20 outline-none focus:ring-2 focus:ring-banditos-gold text-sm"
                    />
                    <button
                      onClick={handleAddQuestion}
                      disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
                      className="bg-green-600 text-white px-5 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== SCHEDULE TAB ==================== */}
        {tab === "schedule" && (
          <>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-2">Round Assignment</h2>
              <p className="text-white/40 text-sm mb-4">Assign rounds to specific days. Tap a day to add rounds, or remove them.</p>

              {(() => {
                const today = new Date();
                const days: { date: string; label: string; dayName: string; fullDay: string; isToday: boolean; isPast: boolean }[] = [];
                for (let i = 0; i < 14; i++) {
                  const d = new Date(today);
                  d.setDate(d.getDate() + i);
                  const dateStr = d.toISOString().split("T")[0];
                  days.push({
                    date: dateStr,
                    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
                    fullDay: d.toLocaleDateString("en-US", { weekday: "long" }),
                    isToday: i === 0,
                    isPast: false,
                  });
                }

                return (
                  <div className="space-y-3">
                    {days.map((day) => {
                      const dayRounds = rounds.filter((r) => r.scheduled_date === day.date);
                      const unscheduledRounds = rounds.filter((r) => !r.scheduled_date || r.scheduled_date !== day.date);

                      return (
                        <div
                          key={day.date}
                          className={`rounded-xl p-4 transition-colors ${
                            day.isToday
                              ? "bg-banditos-gold/10 border-2 border-banditos-gold/40"
                              : "bg-white/5 border border-white/10"
                          }`}
                        >
                          {/* Day header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-base ${day.isToday ? "text-banditos-gold" : "text-white"}`}>
                                {day.fullDay}
                              </span>
                              <span className="text-white/40 text-sm">{day.label}</span>
                              {day.isToday && (
                                <span className="text-[10px] bg-banditos-gold text-banditos-dark px-2 py-0.5 rounded-full font-black uppercase">
                                  Today
                                </span>
                              )}
                            </div>
                            <span className="text-white/30 text-xs">
                              {dayRounds.length} round{dayRounds.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Assigned rounds */}
                          {dayRounds.length > 0 && (
                            <div className="space-y-1.5 mb-3">
                              {dayRounds.map((r) => (
                                <div
                                  key={r.id}
                                  className="flex items-center justify-between bg-banditos-red/15 border border-banditos-red/30 rounded-lg px-3 py-2"
                                >
                                  <div className="flex-1 min-w-0">
                                    <span className="text-white font-medium text-sm">{r.name}</span>
                                    <span className="text-white/40 text-xs ml-2">{r.questions.length} Q&apos;s</span>
                                  </div>
                                  <button
                                    onClick={() => doAction("schedule-round", { roundId: r.id, date: "" })}
                                    disabled={saving}
                                    className="text-red-400/60 hover:text-red-400 text-sm px-2 py-1 rounded transition-colors shrink-0"
                                    title="Remove from this day"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {dayRounds.length === 0 && (
                            <p className="text-white/20 text-xs mb-3">No rounds assigned</p>
                          )}

                          {/* Add round selector */}
                          {unscheduledRounds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {rounds.map((r) => {
                                const isAssignedHere = r.scheduled_date === day.date;
                                if (isAssignedHere) return null;
                                return (
                                  <button
                                    key={r.id}
                                    onClick={() => doAction("schedule-round", { roundId: r.id, date: day.date })}
                                    disabled={saving}
                                    className="text-xs bg-white/5 text-white/50 px-3 py-1.5 rounded-lg hover:bg-white/15 hover:text-white transition-colors border border-white/10"
                                  >
                                    + {r.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Unscheduled rounds summary */}
            {(() => {
              const unscheduled = rounds.filter((r) => !r.scheduled_date);
              if (unscheduled.length === 0) return null;
              return (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                  <h2 className="text-white font-bold text-lg mb-2">Unscheduled Rounds</h2>
                  <p className="text-white/40 text-sm mb-3">These rounds haven&apos;t been assigned to any day yet.</p>
                  <div className="space-y-2">
                    {unscheduled.map((r) => (
                      <div key={r.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-white font-medium text-sm">{r.name}</p>
                          <p className="text-white/30 text-xs">{r.category} &middot; {r.questions.length} questions</p>
                        </div>
                        <span className="text-orange-400/60 text-xs">Not scheduled</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ==================== QR CODES TAB ==================== */}
        {tab === "qrcodes" && (
          <>
            {/* ---- OUTSIDE ---- */}
            <div className="bg-blue-500/10 border border-blue-500/30 backdrop-blur rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-white font-bold text-lg">Outside — Storefront QR</h2>
              </div>
              <p className="text-white/40 text-sm mb-4">Permanent code for the window/door. Links straight to the platform. Never gets claimed, always reusable.</p>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={outsideCount}
                  onChange={(e) => setOutsideCount(e.target.value)}
                  className="w-20 bg-white/10 text-white text-center py-3 rounded-xl font-bold border border-blue-500/30 focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={async () => {
                    const count = Math.max(1, Math.min(100, parseInt(outsideCount) || 1));
                    setSaving(true);
                    try { await fetch("/api/qr-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: "Storefront", count, qr_type: "outside" }) }); await loadQrSessions(); } finally { setSaving(false); }
                  }}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
                >
                  Generate Storefront Code{parseInt(outsideCount) > 1 ? "s" : ""}
                </button>
                <button onClick={() => window.open("/qr?print=outside", "_blank")} className="bg-white/10 text-white px-5 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors">Print</button>
              </div>
              <p className="text-blue-300/40 text-xs mt-2">{qrSessions.filter((s: Record<string, unknown>) => s.qr_type === "outside").length} outside code{qrSessions.filter((s: Record<string, unknown>) => s.qr_type === "outside").length !== 1 ? "s" : ""} exist</p>
            </div>

            {/* ---- INSIDE 2x ---- */}
            <div className="bg-green-500/10 border border-green-500/30 backdrop-blur rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold">2x</span>
                <h2 className="text-white font-bold text-lg">Inside — Table QR Codes</h2>
              </div>
              <p className="text-white/40 text-sm mb-4">One per table. Players scan, sign up, and get 2x points on daily trivia rounds. Bypasses busyness question limit. Claimable — one player per code.</p>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={insideCount}
                  onChange={(e) => setInsideCount(e.target.value)}
                  className="w-20 bg-white/10 text-white text-center py-3 rounded-xl font-bold border border-green-500/30 focus:outline-none focus:border-green-400"
                />
                <button
                  onClick={async () => {
                    const count = Math.max(1, Math.min(100, parseInt(insideCount) || 25));
                    setSaving(true);
                    try { await fetch("/api/qr-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: "Table", count, qr_type: "inside" }) }); await loadQrSessions(); } finally { setSaving(false); }
                  }}
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-40"
                >
                  Generate {insideCount} Table Code{parseInt(insideCount) !== 1 ? "s" : ""}
                </button>
                <button onClick={() => window.open("/qr?print=inside", "_blank")} className="bg-white/10 text-white px-5 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors">Print</button>
              </div>
              <p className="text-green-300/40 text-xs mt-2">
                {qrSessions.filter((s: Record<string, unknown>) => s.qr_type === "inside").length} inside codes &middot;{" "}
                {qrSessions.filter((s: Record<string, unknown>) => s.qr_type === "inside" && s.claimed_by).length} claimed
              </p>
            </div>

            {/* ---- TRIVIA NIGHT 3x ---- */}
            <div className="bg-purple-500/10 border border-purple-500/30 backdrop-blur rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">3x</span>
                <h2 className="text-white font-bold text-lg">Trivia Night — Check-In Codes</h2>
              </div>
              <p className="text-white/40 text-sm mb-4">Special codes for Trivia Night. Players scan → auto check-in → 3x multiplier on all rounds. One per person. Reset after each night.</p>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={triviaNightCount}
                  onChange={(e) => setTriviaNightCount(e.target.value)}
                  className="w-20 bg-white/10 text-white text-center py-3 rounded-xl font-bold border border-purple-500/30 focus:outline-none focus:border-purple-400"
                />
                <button
                  onClick={async () => {
                    const count = Math.max(1, Math.min(100, parseInt(triviaNightCount) || 25));
                    setSaving(true);
                    try { await fetch("/api/qr-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: "Trivia Night", count, qr_type: "trivia_night" }) }); await loadQrSessions(); } finally { setSaving(false); }
                  }}
                  disabled={saving}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-40"
                >
                  Generate {triviaNightCount} Trivia Night Code{parseInt(triviaNightCount) !== 1 ? "s" : ""}
                </button>
                <button onClick={() => window.open("/qr?print=trivia_night", "_blank")} className="bg-white/10 text-white px-5 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors">Print</button>
              </div>
              <p className="text-purple-300/40 text-xs mt-2">
                {qrSessions.filter((s: Record<string, unknown>) => s.qr_type === "trivia_night").length} trivia night codes &middot;{" "}
                {qrSessions.filter((s: Record<string, unknown>) => s.qr_type === "trivia_night" && s.claimed_by).length} claimed
              </p>
            </div>

            {/* ---- SCOUTING ---- */}
            <div className="bg-orange-500/10 border border-orange-500/30 backdrop-blur rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-bold">Scout</span>
                <h2 className="text-white font-bold text-lg">Scouting — Outreach QR</h2>
              </div>
              <p className="text-white/40 text-sm mb-4">Outreach codes with Instagram group chat + platform QR side by side. Normal points, never claimed, always reusable.</p>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={scoutingCount}
                  onChange={(e) => setScoutingCount(e.target.value)}
                  className="w-20 bg-white/10 text-white text-center py-3 rounded-xl font-bold border border-orange-500/30 focus:outline-none focus:border-orange-400"
                />
                <button
                  onClick={async () => {
                    const count = Math.max(1, Math.min(100, parseInt(scoutingCount) || 1));
                    setSaving(true);
                    try { await fetch("/api/qr-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: "Scouting", count, qr_type: "scouting" }) }); await loadQrSessions(); } finally { setSaving(false); }
                  }}
                  disabled={saving}
                  className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-40"
                >
                  Generate Scouting Code{parseInt(scoutingCount) > 1 ? "s" : ""}
                </button>
                <button onClick={() => window.open("/qr?print=scouting", "_blank")} className="bg-white/10 text-white px-5 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors">Print</button>
              </div>
              <p className="text-orange-300/40 text-xs mt-2">{qrSessions.filter((s: Record<string, unknown>) => s.qr_type === "scouting").length} scouting code{qrSessions.filter((s: Record<string, unknown>) => s.qr_type === "scouting").length !== 1 ? "s" : ""} exist</p>
            </div>

            {/* Reset Claims */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-3">Reset Claims</h2>
              <div className="flex gap-2">
                <button onClick={() => { if (confirm("Reset Inside (2x) claims?")) handleQrAction("reset-all", undefined, { qr_type: "inside" }); }} disabled={saving}
                  className="flex-1 bg-green-600/20 text-green-300 py-2.5 rounded-xl font-medium text-sm border border-green-500/30 hover:bg-green-600/30 disabled:opacity-40">
                  Reset Inside
                </button>
                <button onClick={() => { if (confirm("Reset Trivia Night (3x) claims?")) handleQrAction("reset-all", undefined, { qr_type: "trivia_night" }); }} disabled={saving}
                  className="flex-1 bg-purple-600/20 text-purple-300 py-2.5 rounded-xl font-medium text-sm border border-purple-500/30 hover:bg-purple-600/30 disabled:opacity-40">
                  Reset Trivia Night
                </button>
                <button onClick={() => { if (confirm("Reset ALL claims?")) handleQrAction("reset-all"); }} disabled={saving}
                  className="flex-1 bg-orange-600/20 text-orange-300 py-2.5 rounded-xl font-medium text-sm border border-orange-500/30 hover:bg-orange-600/30 disabled:opacity-40">
                  Reset All
                </button>
              </div>
            </div>

            {/* All QR Sessions List */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-4">
                All Codes ({qrSessions.length})
              </h2>
              {qrLoading ? (
                <p className="text-white/30 text-center py-4">Loading...</p>
              ) : qrSessions.length === 0 ? (
                <p className="text-white/40 text-center py-4">No QR codes yet. Generate some above!</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {qrSessions.map((s) => {
                    const typeColor = (s as Record<string, unknown>).qr_type === "outside" ? "bg-blue-500/20 text-blue-300" : (s as Record<string, unknown>).qr_type === "trivia_night" ? "bg-purple-500/20 text-purple-300" : "bg-green-500/20 text-green-300";
                    const typeLabel = (s as Record<string, unknown>).qr_type === "outside" ? "1x" : (s as Record<string, unknown>).qr_type === "trivia_night" ? "3x" : "2x";
                    return (
                      <div key={s.id} className={`rounded-xl p-3 transition-colors ${s.claimed_by ? "bg-green-500/5 border border-green-500/20" : "bg-white/5 border border-white/5"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${typeColor}`}>{typeLabel}</span>
                            <p className="text-white font-medium text-sm truncate">{s.name}</p>
                            <p className="text-banditos-gold/60 font-mono text-[10px] shrink-0">{s.code}</p>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            {s.claimed_name && <span className="text-green-400/60 text-[10px] mr-1">{s.claimed_name}</span>}
                            {s.claimed_by && <button onClick={() => handleQrAction("reset-one", s.id)} disabled={saving} className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-1 rounded-lg">Reset</button>}
                            <button onClick={() => { if (confirm(`Delete "${s.name}"?`)) handleQrAction("delete", s.id); }} disabled={saving} className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-lg">×</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== TRIVIA NIGHT ADMIN TAB ==================== */}
        {tab === "triviaadmin" && (
          <>
            {/* Open / Status */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-bold text-lg">Trivia Night Admin</h2>
                  <p className="text-white/40 text-sm">Score players who checked in via QR code</p>
                </div>
                {!tnNight || tnNight.is_closed ? (
                  <button
                    onClick={openTriviaNight}
                    disabled={saving}
                    className="bg-green-500 text-white px-5 py-3 rounded-xl font-bold hover:bg-green-600 transition-colors disabled:opacity-40"
                  >
                    Open Night
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-sm font-bold">LIVE</span>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  </div>
                )}
              </div>

              {tnNight && !tnNight.is_closed && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white font-medium">{tnNight.week_label}</p>
                  <p className="text-white/40 text-xs mt-1">
                    {tnCheckins.length} player{tnCheckins.length !== 1 ? "s" : ""} checked in via QR
                    &middot; {tnCheckins.filter(c => c.has_qr_bonus).length} with 3x bonus
                  </p>
                </div>
              )}

              {tnNight?.is_closed && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-white/50 text-sm">{tnNight.week_label} — Closed</p>
                  <p className="text-white/30 text-xs mt-1">Open a new night to start a fresh session.</p>
                </div>
              )}

              {!tnNight && !tnLoading && (
                <p className="text-white/40 text-sm">No active night. Hit &quot;Open Night&quot; to start one.</p>
              )}

              {tnLoading && <p className="text-white/30 text-sm">Loading...</p>}
            </div>

            {/* Round Configuration */}
            {tnNight && !tnNight.is_closed && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-white font-bold text-lg">Rounds</h2>
                  <div className="flex items-center gap-2">
                    <label className="text-white/40 text-sm">Number of rounds:</label>
                    <select
                      value={tnNumRounds}
                      onChange={(e) => setTnNumRounds(parseInt(e.target.value))}
                      className="bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-banditos-gold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n} className="bg-gray-800">{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-white/30 text-xs">Set the number of rounds for tonight, then enter scores per round for each checked-in player below.</p>
              </div>
            )}

            {/* Per-Player Round Scoring */}
            {tnNight && !tnNight.is_closed && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-2">Score Players</h2>
                <p className="text-white/40 text-sm mb-4">
                  Only players who checked in by scanning a QR code appear here.
                  {tnCheckins.some(c => c.has_qr_bonus) && <> Players with QR bonus get <span className="text-green-400 font-bold">3x</span> on all scores.</>}
                </p>

                {tnCheckins.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/30">No players checked in yet.</p>
                    <p className="text-white/20 text-xs mt-2">Players check in by scanning a QR code at the venue.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tnCheckins.map((c) => {
                      const existingScores: Record<number, number> = {};
                      for (const rs of c.round_scores) {
                        existingScores[rs.round_number] = rs.score;
                      }
                      const playerInputs = tnRoundInputs[c.id] || {};
                      const totalBase = Array.from({ length: tnNumRounds }, (_, i) => {
                        const input = playerInputs[i + 1];
                        return input !== undefined ? (parseInt(input) || 0) : (existingScores[i + 1] || 0);
                      }).reduce((sum, v) => sum + v, 0);
                      const multiplier = c.has_qr_bonus ? 3 : 1;

                      return (
                        <div key={c.id} className={`rounded-2xl p-4 ${c.has_qr_bonus ? "bg-green-500/10 border border-green-500/20" : "bg-white/5 border border-white/10"}`}>
                          {/* Player header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-bold">{c.player_name}</p>
                              {c.has_qr_bonus ? (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">3x QR</span>
                              ) : (
                                <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded-full">1x</span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-banditos-gold font-bold text-sm">
                                {totalBase} base × {multiplier} = {totalBase * multiplier} pts
                              </p>
                              {c.points_awarded > 0 && (
                                <p className="text-white/30 text-xs">Saved: {c.points_awarded} pts</p>
                              )}
                            </div>
                          </div>

                          {/* Round score inputs */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                            {Array.from({ length: tnNumRounds }, (_, i) => {
                              const rn = i + 1;
                              const saved = existingScores[rn];
                              const inputVal = playerInputs[rn];
                              return (
                                <div key={rn} className="flex flex-col">
                                  <label className="text-white/40 text-xs mb-1">R{rn}</label>
                                  <div className="flex gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder={saved !== undefined ? String(saved) : "0"}
                                      value={inputVal ?? (saved !== undefined ? String(saved) : "")}
                                      onChange={(e) => setTnRoundInputs((prev) => ({
                                        ...prev,
                                        [c.id]: { ...(prev[c.id] || {}), [rn]: e.target.value },
                                      }))}
                                      className="w-full bg-white/10 text-white rounded-lg px-2 py-1.5 text-sm placeholder-white/20 outline-none focus:ring-2 focus:ring-banditos-gold text-center"
                                    />
                                    <button
                                      onClick={() => awardRoundScore(c.id, rn)}
                                      disabled={saving || (inputVal === undefined && saved === undefined) || (inputVal !== undefined && inputVal === "")}
                                      className="bg-banditos-gold/80 text-banditos-dark px-2 py-1.5 rounded-lg font-bold text-xs disabled:opacity-30 hover:bg-banditos-gold transition-colors shrink-0"
                                      title={`Save Round ${rn}`}
                                    >
                                      &#10003;
                                    </button>
                                  </div>
                                  {saved !== undefined && (
                                    <p className="text-green-400/60 text-[10px] mt-0.5 text-center">{saved} saved</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Save all rounds button */}
                          <button
                            onClick={() => awardAllRoundsForPlayer(c.id)}
                            disabled={saving}
                            className="w-full bg-banditos-gold text-banditos-dark py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                          >
                            Save All Rounds for {c.player_name}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Close Night */}
            {tnNight && !tnNight.is_closed && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-bold text-lg">Close Night</h2>
                    <p className="text-white/40 text-sm">End this session &amp; reset QR claims for next time</p>
                  </div>
                  <button
                    onClick={closeTriviaNight}
                    disabled={saving}
                    className="bg-red-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-40"
                  >
                    Close Night
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {saving && (
        <div className="fixed bottom-20 right-4 bg-banditos-gold text-black px-4 py-2 rounded-xl text-sm font-medium animate-pulse">
          Saving...
        </div>
      )}

      <BottomNav isAdmin={true} />
    </div>
  );
}
