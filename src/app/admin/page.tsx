"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import { BottomNav } from "@/components/BottomNav";

interface Question {
  id: string; question: string; answer: string;
  points: number; sort_order: number; round_id: string;
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
  const [tab, setTab] = useState<"game" | "rounds" | "questions" | "attendance" | "qrcodes" | "trivianight">("game");

  // Busyness
  const [busyness, setBusyness] = useState<{ percent: number; questionsAllowed: number; label: string; source: string } | null>(null);
  const [busyOverride, setBusyOverride] = useState("");

  // Attendance
  const [attendSearch, setAttendSearch] = useState("");
  const [attendPlayers, setAttendPlayers] = useState<{ id: string; display_name: string; total_points: number; games_played: number }[]>([]);
  const [attendLogs, setAttendLogs] = useState<{ id: string; player_name: string; points_added: number; note: string; created_at: string }[]>([]);
  const [attendLoading, setAttendLoading] = useState(false);
  const [doubleResult, setDoubleResult] = useState<{ playerName: string; pointsAdded: number; newTotal: number } | null>(null);

  // QR Sessions
  const [qrSessions, setQrSessions] = useState<{ id: string; code: string; name: string; claimed_by: string | null; claimed_name: string | null; claimed_at: string | null; is_active: boolean }[]>([]);
  const [newQrName, setNewQrName] = useState("");
  const [newQrCount, setNewQrCount] = useState("1");
  const [qrLoading, setQrLoading] = useState(false);

  // Trivia Night
  const [tnNight, setTnNight] = useState<{ id: string; week_label: string; is_active: boolean; is_closed: boolean } | null>(null);
  const [tnCheckins, setTnCheckins] = useState<{ id: string; player_id: string; player_name: string; has_qr_bonus: boolean; points_awarded: number }[]>([]);
  const [tnPointInputs, setTnPointInputs] = useState<Record<string, string>>({});
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

  // Attendance handlers
  const searchPlayers = async (q: string) => {
    setAttendSearch(q);
    if (!q.trim()) { setAttendPlayers([]); return; }
    setAttendLoading(true);
    try {
      const res = await fetch(`/api/attendance?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setAttendPlayers(data.players || []);
      setAttendLogs(data.logs || []);
    } finally { setAttendLoading(false); }
  };

  const loadAttendanceLogs = async () => {
    const res = await fetch("/api/attendance?q=");
    const data = await res.json();
    setAttendLogs(data.logs || []);
  };

  const addDoublePoints = async (playerId: string, basePoints: number = 10) => {
    if (!confirm(`Add ${basePoints * 2} double points to this player?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, basePoints }),
      });
      const data = await res.json();
      if (data.ok) {
        setDoubleResult(data);
        setTimeout(() => setDoubleResult(null), 3000);
        // Refresh search results
        if (attendSearch.trim()) searchPlayers(attendSearch);
        loadAttendanceLogs();
      }
    } finally { setSaving(false); }
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

  const handleQrAction = async (action: string, sessionId?: string, extra: Record<string, boolean> = {}) => {
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

  const awardTriviaNightPoints = async (checkinId: string) => {
    const raw = tnPointInputs[checkinId];
    const points = parseInt(raw);
    if (isNaN(points) || points < 0) return;
    setSaving(true);
    try {
      await fetch("/api/trivia-night", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "award-points", checkinId, points }),
      });
      await loadTriviaNight();
      setTnPointInputs((prev) => ({ ...prev, [checkinId]: "" }));
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
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/")} className="text-white/60 hover:text-white">← Back</button>
        <BanditosLogo size="sm" />
        <button onClick={() => router.push("/qr")} className="text-white/40 hover:text-white text-sm">QR Code</button>
      </div>

      <h1 className="text-white text-2xl font-bold text-center mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {(["game", "rounds", "questions", "attendance", "qrcodes", "trivianight"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "attendance") loadAttendanceLogs(); if (t === "qrcodes") loadQrSessions(); if (t === "trivianight") loadTriviaNight(); }}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition-all ${tab === t ? "bg-banditos-red text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
          >
            {t === "game" ? "Game" : t === "rounds" ? "Rounds" : t === "questions" ? "Questions" : t === "attendance" ? "Attendance" : t === "qrcodes" ? "QR Codes" : "🎤 Night"}
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
              <h2 className="text-white font-bold text-lg mb-4">Active Round</h2>
              <div className="space-y-2">
                <button
                  onClick={() => doAction("set-round", { roundId: "" })}
                  disabled={saving}
                  className={`w-full p-3 rounded-xl text-left transition-colors ${!activeRoundId ? "bg-banditos-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                >
                  None (waiting room)
                </button>
                {rounds.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => doAction("set-round", { roundId: r.id })}
                    disabled={saving}
                    className={`w-full p-3 rounded-xl text-left transition-colors ${activeRoundId === r.id ? "bg-banditos-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs ml-2 opacity-60">{r.questions.length} questions</span>
                  </button>
                ))}
              </div>
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
                  className="w-full bg-banditos-green text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  + Add Round
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-4">Existing Rounds ({rounds.length})</h2>
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
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{r.name}</p>
                            <p className="text-white/40 text-xs">{r.category} — {r.questions.length} questions</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingRound(r)} className="text-xs bg-white/10 text-white/60 px-3 py-1.5 rounded-lg hover:bg-white/20">Edit</button>
                            <button onClick={() => handleDeleteRound(r.id, r.name)} disabled={saving} className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/30">Delete</button>
                          </div>
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
                      className="bg-banditos-green text-white px-5 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== ATTENDANCE TAB ==================== */}
        {tab === "attendance" && (
          <>
            {/* Double points success banner */}
            {doubleResult && (
              <div className="bg-green-500/20 border border-green-500/40 rounded-2xl p-4 text-center animate-slide-up">
                <p className="text-green-300 font-bold text-lg">+{doubleResult.pointsAdded} points added!</p>
                <p className="text-green-300/60 text-sm">{doubleResult.playerName} now has {doubleResult.newTotal} total</p>
              </div>
            )}

            {/* Player Search */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-2">Add Double Points</h2>
              <p className="text-white/40 text-sm mb-4">Search for a player from the paper sign-in sheet, then award 2x points for attendance.</p>

              <input
                type="text"
                placeholder="Search player by name..."
                value={attendSearch}
                onChange={(e) => searchPlayers(e.target.value)}
                autoFocus
                className="w-full bg-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold text-lg"
              />

              {attendLoading && <p className="text-white/30 text-sm mt-3">Searching...</p>}

              {attendPlayers.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attendPlayers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                      <div>
                        <p className="text-white font-medium">{p.display_name}</p>
                        <p className="text-white/40 text-xs">{p.total_points} pts &middot; {p.games_played} games</p>
                      </div>
                      <button
                        onClick={() => addDoublePoints(p.id)}
                        disabled={saving}
                        className="bg-banditos-gold text-banditos-dark px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                      >
                        +20 Double
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {attendSearch.trim() && !attendLoading && attendPlayers.length === 0 && (
                <p className="text-white/30 text-sm mt-3">No players found for &quot;{attendSearch}&quot;</p>
              )}
            </div>

            {/* Recent Attendance Log */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-4">Recent Attendance Log</h2>
              {attendLogs.length === 0 ? (
                <p className="text-white/40 text-center py-4">No attendance entries yet.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {attendLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                      <div>
                        <p className="text-white font-medium text-sm">{log.player_name}</p>
                        <p className="text-white/30 text-xs">{log.note}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-sm">+{log.points_added}</p>
                        <p className="text-white/20 text-xs">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== QR CODES TAB ==================== */}
        {tab === "qrcodes" && (
          <>
            {/* Create QR Codes */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-2">Create QR Codes</h2>
              <p className="text-white/40 text-sm mb-4">Generate named QR codes for tables, bar, entrance, etc. Players who scan get 2x points for being in-store!</p>
              <div className="space-y-3">
                <input
                  type="text" placeholder="Name (e.g. Table 1, Bar, Front Door)"
                  value={newQrName} onChange={(e) => setNewQrName(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-white/30 text-xs">How many?</label>
                    <input
                      type="number" min="1" max="50" value={newQrCount}
                      onChange={(e) => setNewQrCount(e.target.value)}
                      className="w-full bg-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold"
                    />
                  </div>
                  <button
                    onClick={handleCreateQr}
                    disabled={saving || !newQrName.trim()}
                    className="self-end bg-banditos-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    + Create
                  </button>
                </div>
                <p className="text-white/20 text-xs">If count &gt; 1, codes are numbered (e.g. &quot;Table 1&quot;, &quot;Table 2&quot;...)</p>
              </div>
            </div>

            {/* Reset All */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">Reset All Claims</h2>
                  <p className="text-white/40 text-sm">Unclaim all QR codes for a new game night</p>
                </div>
                <button
                  onClick={() => { if (confirm("Reset all QR claims? Players will need to re-scan.")) handleQrAction("reset-all"); }}
                  disabled={saving}
                  className="bg-orange-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-orange-700 transition-colors disabled:opacity-40"
                >
                  Reset All
                </button>
              </div>
            </div>

            {/* Active QR Sessions */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-4">
                QR Codes ({qrSessions.length})
                <span className="text-white/40 text-sm font-normal ml-2">
                  {qrSessions.filter(s => s.claimed_by).length} claimed
                </span>
              </h2>

              {qrLoading ? (
                <p className="text-white/30 text-center py-4">Loading...</p>
              ) : qrSessions.length === 0 ? (
                <p className="text-white/40 text-center py-4">No QR codes yet. Create some above!</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {qrSessions.map((s) => (
                    <div key={s.id} className={`rounded-xl p-4 transition-colors ${s.claimed_by ? "bg-green-500/10 border border-green-500/20" : "bg-white/5 border border-white/5"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium truncate">{s.name}</p>
                            {!s.is_active && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>}
                          </div>
                          <p className="text-banditos-gold font-mono text-xs mt-0.5">{s.code}</p>
                          {s.claimed_name && (
                            <p className="text-green-400/80 text-xs mt-1">Claimed by {s.claimed_name}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => window.open(`/qr/${s.code}`, "_blank")}
                            className="text-xs bg-white/10 text-white/60 px-3 py-1.5 rounded-lg hover:bg-white/20"
                            title="View/print QR"
                          >
                            QR
                          </button>
                          {s.claimed_by && (
                            <button
                              onClick={() => handleQrAction("reset-one", s.id)}
                              disabled={saving}
                              className="text-xs bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg hover:bg-orange-500/30"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            onClick={() => { if (confirm(`Delete QR code "${s.name}"?`)) handleQrAction("delete", s.id); }}
                            disabled={saving}
                            className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/30"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== TRIVIA NIGHT TAB ==================== */}
        {tab === "trivianight" && (
          <>
            {/* Open / Status */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-bold text-lg">🎤 Trivia Night</h2>
                  <p className="text-white/40 text-sm">Paper trivia at Bandidos — Tuesday 7-9 PM</p>
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
                    {tnCheckins.length} player{tnCheckins.length !== 1 ? "s" : ""} checked in
                    &middot; {tnCheckins.filter(c => c.has_qr_bonus).length} with QR bonus (3x)
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
                <p className="text-white/40 text-sm">No active night. Hit &quot;Open Night&quot; to start one for tonight.</p>
              )}

              {tnLoading && <p className="text-white/30 text-sm">Loading...</p>}
            </div>

            {/* Award Points */}
            {tnNight && !tnNight.is_closed && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-2">Award Points</h2>
                <p className="text-white/40 text-sm mb-4">
                  Enter base points from paper trivia. Players with QR scan get <span className="text-green-400 font-bold">3x</span>, others get <span className="text-white font-bold">1x</span>.
                </p>

                {tnCheckins.length === 0 ? (
                  <p className="text-white/30 text-center py-6">No players checked in yet. Players check in via the app during Tuesday 7-9 PM.</p>
                ) : (
                  <div className="space-y-3">
                    {tnCheckins.map((c) => (
                      <div key={c.id} className={`rounded-xl p-4 ${c.has_qr_bonus ? "bg-green-500/10 border border-green-500/20" : "bg-white/5 border border-white/5"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium truncate">{c.player_name}</p>
                              {c.has_qr_bonus && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold shrink-0">3x</span>
                              )}
                              {!c.has_qr_bonus && (
                                <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded-full shrink-0">1x</span>
                              )}
                            </div>
                            {c.points_awarded > 0 && (
                              <p className="text-banditos-gold text-xs mt-0.5">
                                Awarded: {c.points_awarded} pts
                                {c.has_qr_bonus && <span className="text-green-400"> (includes 3x)</span>}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min="0"
                              placeholder="Pts"
                              value={tnPointInputs[c.id] || ""}
                              onChange={(e) => setTnPointInputs((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              className="w-20 bg-white/10 text-white rounded-lg px-3 py-2 text-sm placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold text-center"
                            />
                            <button
                              onClick={() => awardTriviaNightPoints(c.id)}
                              disabled={saving || !tnPointInputs[c.id]}
                              className="bg-banditos-gold text-banditos-dark px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-40"
                            >
                              Award
                            </button>
                          </div>
                        </div>
                        {tnPointInputs[c.id] && parseInt(tnPointInputs[c.id]) > 0 && (
                          <p className="text-white/30 text-xs mt-2">
                            Preview: {tnPointInputs[c.id]} base × {c.has_qr_bonus ? "3" : "1"} = <span className="text-banditos-gold font-bold">{parseInt(tnPointInputs[c.id]) * (c.has_qr_bonus ? 3 : 1)} pts</span>
                          </p>
                        )}
                      </div>
                    ))}
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
