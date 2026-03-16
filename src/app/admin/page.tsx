"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";

interface Question {
  id: string; question: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct: string; sort_order: number; round_id: string;
}
interface Round {
  id: string; name: string; category: string; sort_order: number;
  questions: Question[];
}

const emptyQuestion = { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct: "A" };

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [tab, setTab] = useState<"game" | "rounds" | "questions">("game");

  // Round form
  const [newRoundName, setNewRoundName] = useState("");
  const [newRoundCategory, setNewRoundCategory] = useState("");
  const [editingRound, setEditingRound] = useState<Round | null>(null);

  // Question form
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [qForm, setQForm] = useState(emptyQuestion);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [saving, setSaving] = useState(false);

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
    } catch { router.push("/"); }
    finally { setLoading(false); }
  }, [router, selectedRoundId]);

  useEffect(() => { loadAdmin(); }, [loadAdmin]);

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
    if (!selectedRoundId || !qForm.question.trim()) return;
    await doAction("add-question", { round_id: selectedRoundId, ...qForm });
    setQForm({ ...emptyQuestion });
  };

  const handleEditQuestion = async () => {
    if (!editingQuestion) return;
    await doAction("edit-question", {
      questionId: editingQuestion.id,
      question: editingQuestion.question,
      option_a: editingQuestion.option_a,
      option_b: editingQuestion.option_b,
      option_c: editingQuestion.option_c,
      option_d: editingQuestion.option_d,
      correct: editingQuestion.correct,
    });
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question?")) return;
    await doAction("delete-question", { questionId });
  };

  if (loading) return <div className="min-h-screen bg-banditos-dark flex items-center justify-center"><BanditosLogo size="md" /></div>;
  if (!isAdmin) return null;

  const currentRoundQuestions = rounds.find((r) => r.id === selectedRoundId)?.questions || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/")} className="text-white/60 hover:text-white">← Back</button>
        <BanditosLogo size="sm" />
        <div className="w-10" />
      </div>

      <h1 className="text-white text-2xl font-bold text-center mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-6">
        {(["game", "rounds", "questions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition-all ${tab === t ? "bg-banditos-red text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
          >
            {t === "game" ? "Game Controls" : t === "rounds" ? "Rounds" : "Questions"}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* ==================== GAME TAB ==================== */}
        {tab === "game" && (
          <>
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
                  disabled={saving}
                  className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${isUnlocked ? "bg-green-500 text-white hover:bg-green-600" : "bg-red-500 text-white hover:bg-red-600"}`}
                >
                  {isUnlocked ? "OPEN" : "LOCKED"}
                </button>
              </div>
            </div>

            {/* Active Round */}
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

            {/* Reset */}
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
          </>
        )}

        {/* ==================== ROUNDS TAB ==================== */}
        {tab === "rounds" && (
          <>
            {/* Add Round */}
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

            {/* Existing Rounds */}
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

        {/* ==================== QUESTIONS TAB ==================== */}
        {tab === "questions" && (
          <>
            {/* Round Selector */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-3">Select Round</h2>
              <div className="flex flex-wrap gap-2">
                {rounds.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRoundId(r.id); setEditingQuestion(null); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedRoundId === r.id ? "bg-banditos-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                  >
                    {r.name} ({r.questions.length})
                  </button>
                ))}
              </div>
              {rounds.length === 0 && <p className="text-white/40 text-sm mt-2">Create a round first in the Rounds tab.</p>}
            </div>

            {/* Add Question Form */}
            {selectedRoundId && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-4">Add Question</h2>
                <div className="space-y-3">
                  <textarea
                    placeholder="Question text"
                    value={qForm.question} onChange={(e) => setQForm({ ...qForm, question: e.target.value })}
                    rows={2}
                    className="w-full bg-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Option A" value={qForm.option_a} onChange={(e) => setQForm({ ...qForm, option_a: e.target.value })}
                      className="bg-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold" />
                    <input type="text" placeholder="Option B" value={qForm.option_b} onChange={(e) => setQForm({ ...qForm, option_b: e.target.value })}
                      className="bg-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold" />
                    <input type="text" placeholder="Option C" value={qForm.option_c} onChange={(e) => setQForm({ ...qForm, option_c: e.target.value })}
                      className="bg-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold" />
                    <input type="text" placeholder="Option D" value={qForm.option_d} onChange={(e) => setQForm({ ...qForm, option_d: e.target.value })}
                      className="bg-white/10 text-white rounded-xl px-4 py-3 placeholder-white/30 outline-none focus:ring-2 focus:ring-banditos-gold" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-white/60 text-sm">Correct Answer:</label>
                    <div className="flex gap-2">
                      {["A", "B", "C", "D"].map((letter) => (
                        <button
                          key={letter}
                          onClick={() => setQForm({ ...qForm, correct: letter })}
                          className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors ${qForm.correct === letter ? "bg-green-500 text-white" : "bg-white/10 text-white/40 hover:bg-white/20"}`}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAddQuestion}
                    disabled={saving || !qForm.question.trim() || !qForm.option_a.trim() || !qForm.option_b.trim() || !qForm.option_c.trim() || !qForm.option_d.trim()}
                    className="w-full bg-banditos-green text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    + Add Question
                  </button>
                </div>
              </div>
            )}

            {/* Question List */}
            {selectedRoundId && (
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-4">
                  Questions ({currentRoundQuestions.length})
                </h2>
                {currentRoundQuestions.length === 0 ? (
                  <p className="text-white/40 text-center py-4">No questions yet. Add one above!</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {currentRoundQuestions.map((q, i) => (
                      <div key={q.id} className="bg-white/5 rounded-xl p-4">
                        {editingQuestion?.id === q.id ? (
                          /* Edit mode */
                          <div className="space-y-2">
                            <textarea
                              value={editingQuestion.question}
                              onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                              rows={2}
                              className="w-full bg-white/10 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-banditos-gold resize-none text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={editingQuestion.option_a}
                                onChange={(e) => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })}
                                className="bg-white/10 text-white rounded-lg px-3 py-2 outline-none text-sm" placeholder="A" />
                              <input type="text" value={editingQuestion.option_b}
                                onChange={(e) => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })}
                                className="bg-white/10 text-white rounded-lg px-3 py-2 outline-none text-sm" placeholder="B" />
                              <input type="text" value={editingQuestion.option_c}
                                onChange={(e) => setEditingQuestion({ ...editingQuestion, option_c: e.target.value })}
                                className="bg-white/10 text-white rounded-lg px-3 py-2 outline-none text-sm" placeholder="C" />
                              <input type="text" value={editingQuestion.option_d}
                                onChange={(e) => setEditingQuestion({ ...editingQuestion, option_d: e.target.value })}
                                className="bg-white/10 text-white rounded-lg px-3 py-2 outline-none text-sm" placeholder="D" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 text-xs">Correct:</span>
                              {["A", "B", "C", "D"].map((letter) => (
                                <button
                                  key={letter}
                                  onClick={() => setEditingQuestion({ ...editingQuestion, correct: letter })}
                                  className={`w-8 h-8 rounded-lg font-bold text-xs ${editingQuestion.correct === letter ? "bg-green-500 text-white" : "bg-white/10 text-white/40"}`}
                                >
                                  {letter}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleEditQuestion} disabled={saving} className="flex-1 bg-banditos-gold text-black py-2 rounded-lg font-medium text-sm">Save</button>
                              <button onClick={() => setEditingQuestion(null)} className="flex-1 bg-white/10 text-white py-2 rounded-lg text-sm">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          /* View mode */
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-white text-sm font-medium flex-1">{i + 1}. {q.question}</p>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => setEditingQuestion(q)} className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-lg hover:bg-white/20">Edit</button>
                                <button onClick={() => handleDeleteQuestion(q.id)} disabled={saving} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/30">Del</button>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
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
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-banditos-gold text-black px-4 py-2 rounded-xl text-sm font-medium animate-pulse">
          Saving...
        </div>
      )}
    </div>
  );
}
