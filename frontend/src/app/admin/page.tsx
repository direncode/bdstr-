"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  admin as adminApi,
  questions as questionsApi,
  rounds as roundsApi,
  AdminStats,
  AppSettings,
  Question,
  Round,
  User,
} from "@/lib/api";
import { getSocket } from "@/lib/socket";

export default function AdminPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "questions" | "rounds" | "live" | "settings">("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [allRounds, setAllRounds] = useState<Round[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // New question form
  const [newQ, setNewQ] = useState({ text: "", options: ["", "", "", ""], correctAnswer: 0, roundId: "" });
  // New round form
  const [newRound, setNewRound] = useState({ name: "", category: "wildcard" });

  // Live game state
  const [answerCount, setAnswerCount] = useState(0);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [s, st, q, r, u] = await Promise.all([
        adminApi.settings(token),
        adminApi.stats(token),
        questionsApi.list(token),
        roundsApi.list(),
        adminApi.users(token),
      ]);
      setSettings(s.settings);
      setStats(st);
      setAllQuestions(q.questions);
      setAllRounds(r.rounds);
      setUsers(u.users);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // Socket for live game hosting
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socket.on("game:answer-count", (data: { count: number }) => {
      setAnswerCount(data.count);
    });
    return () => { socket.off("game:answer-count"); };
  }, [token]);

  const startQuestion = (questionId: string) => {
    if (!token) return;
    const socket = getSocket(token);
    socket.emit("admin:start-question", { questionId });
    setActiveQuestionId(questionId);
    setAnswerCount(0);
  };

  const endQuestion = (questionId: string) => {
    if (!token) return;
    const socket = getSocket(token);
    socket.emit("admin:end-question", { questionId });
    setActiveQuestionId(null);
  };

  const addQuestion = async () => {
    if (!token || !newQ.text || !newQ.roundId) return;
    const opts = newQ.options.filter((o) => o.trim());
    if (opts.length < 2) return;
    await questionsApi.create(token, { ...newQ, options: opts });
    setNewQ({ text: "", options: ["", "", "", ""], correctAnswer: 0, roundId: "" });
    loadData();
  };

  const addRound = async () => {
    if (!token || !newRound.name) return;
    await roundsApi.create(token, newRound);
    setNewRound({ name: "", category: "wildcard" });
    loadData();
  };

  const updateSettings = async (data: Partial<AppSettings>) => {
    if (!token) return;
    const res = await adminApi.updateSettings(token, data);
    setSettings(res.settings);
  };

  if (authLoading || !user) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["overview", "questions", "rounds", "live", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              tab === t ? "bg-banditos-red text-white" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Questions" value={stats.totalQuestions} />
            <StatCard label="Rounds" value={stats.totalRounds} />
            <StatCard label="Answers" value={stats.totalAnswers} />
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Players</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-banditos-cream">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-right">Points</th>
                    <th className="px-4 py-2 text-right">Credits</th>
                    <th className="px-4 py-2 text-right">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="px-4 py-2 font-medium">{u.name}</td>
                      <td className="px-4 py-2 text-gray-500">{u.email}</td>
                      <td className="px-4 py-2 text-right">{u.totalPoints}</td>
                      <td className="px-4 py-2 text-right">{u.totalCredits}</td>
                      <td className="px-4 py-2 text-right">{u.currentStreak}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      {tab === "questions" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Add New Question</h2>
            <div className="space-y-3">
              <input
                value={newQ.text}
                onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                placeholder="Question text..."
                className="w-full px-4 py-2 border rounded-lg"
              />
              {newQ.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="radio"
                    name="correct"
                    checked={newQ.correctAnswer === i}
                    onChange={() => setNewQ({ ...newQ, correctAnswer: i })}
                  />
                  <input
                    value={opt}
                    onChange={(e) => {
                      const opts = [...newQ.options];
                      opts[i] = e.target.value;
                      setNewQ({ ...newQ, options: opts });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 px-4 py-2 border rounded-lg"
                  />
                </div>
              ))}
              <select
                value={newQ.roundId}
                onChange={(e) => setNewQ({ ...newQ, roundId: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Select Round...</option>
                {allRounds.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                onClick={addQuestion}
                className="bg-banditos-red text-white px-6 py-2 rounded-lg font-medium"
              >
                Add Question
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">All Questions ({allQuestions.length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allQuestions.map((q) => (
                <div key={q.id} className="p-3 bg-banditos-cream rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{q.text}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {q.round?.name} &middot; Answer: {q.options[q.correctAnswer]}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!token) return;
                        await questionsApi.delete(token, q.id);
                        loadData();
                      }}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rounds */}
      {tab === "rounds" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Create Round</h2>
            <div className="flex gap-3">
              <input
                value={newRound.name}
                onChange={(e) => setNewRound({ ...newRound, name: e.target.value })}
                placeholder="Round name..."
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <select
                value={newRound.category}
                onChange={(e) => setNewRound({ ...newRound, category: e.target.value })}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="government">Government/Laws</option>
                <option value="sg_history">SG History</option>
                <option value="past_sbps">Past SBPs</option>
                <option value="wildcard">Wildcard</option>
              </select>
              <button
                onClick={addRound}
                className="bg-banditos-red text-white px-6 py-2 rounded-lg font-medium"
              >
                Create
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allRounds.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-5 shadow-md">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold">{r.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.status === "active" ? "bg-green-100 text-green-700"
                    : r.status === "completed" ? "bg-gray-100 text-gray-700"
                    : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Category: {r.category} &middot; {r.questions?.length || 0} questions
                </p>
                <div className="flex gap-2">
                  {r.status !== "active" && (
                    <button
                      onClick={() => token && roundsApi.updateStatus(token, r.id, "active").then(loadData)}
                      className="text-sm bg-green-500 text-white px-3 py-1 rounded"
                    >
                      Start
                    </button>
                  )}
                  {r.status === "active" && (
                    <button
                      onClick={() => token && roundsApi.updateStatus(token, r.id, "completed").then(loadData)}
                      className="text-sm bg-red-500 text-white px-3 py-1 rounded"
                    >
                      End
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Game */}
      {tab === "live" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">Live Game Control</h2>
            {activeQuestionId && (
              <div className="mb-4 p-4 bg-green-100 rounded-lg">
                <p className="font-medium text-green-700">
                  Question active! {answerCount} answers received.
                </p>
                <button
                  onClick={() => endQuestion(activeQuestionId)}
                  className="mt-2 bg-red-500 text-white px-4 py-2 rounded-lg"
                >
                  End Question & Reveal Answer
                </button>
              </div>
            )}

            <p className="text-gray-600 mb-4">
              Select a question below to push it live to all connected players.
            </p>

            {allRounds
              .filter((r) => r.status === "active")
              .map((r) => (
                <div key={r.id} className="mb-6">
                  <h3 className="font-bold text-lg mb-2">{r.name}</h3>
                  <div className="space-y-2">
                    {allQuestions
                      .filter((q) => q.roundId === r.id)
                      .map((q) => (
                        <div key={q.id} className="flex justify-between items-center p-3 bg-banditos-cream rounded-lg">
                          <span className="font-medium">{q.text}</span>
                          <button
                            onClick={() => startQuestion(q.id)}
                            disabled={activeQuestionId !== null}
                            className="bg-banditos-red text-white px-4 py-1 rounded text-sm disabled:opacity-50"
                          >
                            Push Live
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

            {allRounds.filter((r) => r.status === "active").length === 0 && (
              <p className="text-gray-500">No active rounds. Go to Rounds tab to start one.</p>
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      {tab === "settings" && settings && (
        <div className="bg-white rounded-xl p-6 shadow-md space-y-6">
          <h2 className="text-xl font-bold">App Settings</h2>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enablePunishments}
                onChange={(e) => updateSettings({ enablePunishments: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-banditos-red rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-banditos-red"></div>
            </label>
            <span className="font-medium">Enable Funny Punishments</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Punishment Text</label>
            <textarea
              value={settings.punishmentText}
              onChange={(e) => setSettings({ ...settings, punishmentText: e.target.value })}
              onBlur={() => updateSettings({ punishmentText: settings.punishmentText })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-md text-center">
      <p className="text-3xl font-bold text-banditos-red">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
