"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";

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
  const [tab, setTab] = useState<"game" | "rounds" | "questions">("game");

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

  if (loading) return <div className="min-h-screen bg-banditos-dark flex items-center justify-center"><BanditosLogo size="md" /></div>;
  if (!isAdmin) return null;

  const currentRoundQuestions = rounds.find((r) => r.id === selectedRoundId)?.questions || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/")} className="text-white/60 hover:text-white">← Back</button>
        <BanditosLogo size="sm" />
        <button onClick={() => router.push("/qr")} className="text-white/40 hover:text-white text-sm">QR Code</button>
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
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-banditos-gold text-black px-4 py-2 rounded-xl text-sm font-medium animate-pulse">
          Saving...
        </div>
      )}
    </div>
  );
}
