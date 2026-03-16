"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { credits as creditsApi, PointTransaction, CreditTransaction } from "@/lib/api";
import { getSocket } from "@/lib/socket";

interface GameQuestion {
  questionId: string;
  text: string;
  options: string[];
  timeLimit: number;
  points: number;
  roundName: string;
  category: string;
}

interface AnswerResult {
  questionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  correctAnswer: number;
}

export default function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);

  // Live game state
  const [activeQuestion, setActiveQuestion] = useState<GameQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    creditsApi.points(token).then((r) => {
      setTotalPoints(r.totalPoints);
      setPointHistory(r.transactions);
    }).catch(console.error);
    creditsApi.history(token).then((r) => {
      setCreditBalance(r.balance);
      setCreditHistory(r.transactions);
    }).catch(console.error);
  }, [token]);

  // Socket connection for live game
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    socket.on("game:question", (q: GameQuestion) => {
      setActiveQuestion(q);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setTimeLeft(q.timeLimit);
    });

    socket.on("game:answer-result", (result: AnswerResult) => {
      setAnswerResult(result);
    });

    socket.on("game:question-results", () => {
      // Round ended, clear question after a delay
      setTimeout(() => {
        setActiveQuestion(null);
        setSelectedAnswer(null);
        setAnswerResult(null);
      }, 5000);
    });

    return () => {
      socket.off("game:question");
      socket.off("game:answer-result");
      socket.off("game:question-results");
    };
  }, [token]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || !activeQuestion) return;
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, activeQuestion]);

  const submitAnswer = useCallback((index: number) => {
    if (!token || !activeQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(index);
    const socket = getSocket(token);
    socket.emit("player:answer", { questionId: activeQuestion.questionId, selected: index });
  }, [token, activeQuestion, selectedAnswer]);

  if (authLoading || !user) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>

      {/* Live Question */}
      {activeQuestion && (
        <div className="bg-gradient-to-br from-banditos-dark to-banditos-red rounded-xl p-6 text-white">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {activeQuestion.roundName} - {activeQuestion.category}
            </span>
            <span className={`text-2xl font-bold ${timeLeft <= 5 ? "text-red-400 animate-pulse" : ""}`}>
              {timeLeft}s
            </span>
          </div>

          <h2 className="text-xl font-bold mb-4">{activeQuestion.text}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeQuestion.options.map((opt, i) => {
              let btnClass = "p-4 rounded-lg font-medium text-left transition-all ";
              if (answerResult) {
                if (i === answerResult.correctAnswer) btnClass += "bg-green-500 text-white";
                else if (i === selectedAnswer && !answerResult.isCorrect) btnClass += "bg-red-500 text-white";
                else btnClass += "bg-white/10";
              } else if (selectedAnswer === i) {
                btnClass += "bg-banditos-gold text-banditos-dark";
              } else {
                btnClass += "bg-white/20 hover:bg-white/30 cursor-pointer";
              }

              return (
                <button
                  key={i}
                  onClick={() => submitAnswer(i)}
                  disabled={selectedAnswer !== null || timeLeft <= 0}
                  className={btnClass}
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {answerResult && (
            <div className={`mt-4 p-3 rounded-lg text-center font-bold ${answerResult.isCorrect ? "bg-green-500/30" : "bg-red-500/30"}`}>
              {answerResult.isCorrect
                ? `Correct! +${answerResult.pointsEarned} points`
                : "Wrong answer!"}
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-md text-center">
          <p className="text-3xl font-bold text-banditos-red">{user.totalPoints || totalPoints}</p>
          <p className="text-sm text-gray-500 mt-1">Total Points</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-md text-center">
          <p className="text-3xl font-bold text-banditos-gold">{user.totalCredits || creditBalance}</p>
          <p className="text-sm text-gray-500 mt-1">Credits</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-md text-center">
          <p className="text-3xl font-bold text-orange-500">{user.currentStreak || 0} 🔥</p>
          <p className="text-sm text-gray-500 mt-1">Current Streak</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-md text-center">
          <p className="text-3xl font-bold text-banditos-green">{user.longestStreak || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Best Streak</p>
        </div>
      </div>

      {/* Badges */}
      {user.badges && user.badges.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold mb-3">Badges</h2>
          <div className="flex gap-3 flex-wrap">
            {user.badges.map((b) => (
              <span key={b.type} className="bg-banditos-gold text-banditos-dark px-4 py-2 rounded-full font-medium">
                {b.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold mb-3">Recent Points</h2>
          {pointHistory.length === 0 ? (
            <p className="text-gray-500">No points yet. Play trivia to earn!</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pointHistory.slice(0, 10).map((t) => (
                <div key={t.id} className="flex justify-between text-sm p-2 bg-banditos-cream rounded">
                  <span className="text-gray-600">{t.reason.replace(/_/g, " ")}</span>
                  <span className="font-bold text-green-600">+{t.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold mb-3">Credit History</h2>
          {creditHistory.length === 0 ? (
            <p className="text-gray-500">No credits yet. Keep playing!</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {creditHistory.slice(0, 10).map((t) => (
                <div key={t.id} className="flex justify-between text-sm p-2 bg-banditos-cream rounded">
                  <span className="text-gray-600">{t.reason.replace(/_/g, " ")}</span>
                  <span className="font-bold text-banditos-gold">+{t.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
