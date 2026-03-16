"use client";

import { useEffect, useState } from "react";
import { leaderboard as leaderboardApi, LeaderboardEntry } from "@/lib/api";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"alltime" | "weekly">("alltime");
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fn = tab === "alltime" ? leaderboardApi.allTime() : leaderboardApi.weekly();
    fn.then((r) => setData(r.leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab]);

  const getMedal = (i: number) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `#${i + 1}`;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("alltime")}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            tab === "alltime"
              ? "bg-banditos-red text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          All-Time
        </button>
        <button
          onClick={() => setTab("weekly")}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            tab === "weekly"
              ? "bg-banditos-red text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          This Week
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No data yet. Start playing!</div>
        ) : (
          <table className="w-full">
            <thead className="bg-banditos-dark text-white">
              <tr>
                <th className="px-6 py-3 text-left">Rank</th>
                <th className="px-6 py-3 text-left">Player</th>
                <th className="px-6 py-3 text-left">Badges</th>
                <th className="px-6 py-3 text-right">Points</th>
                {tab === "alltime" && <th className="px-6 py-3 text-right">Streak</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((player, i) => (
                <tr
                  key={player.id || i}
                  className={`border-b last:border-0 ${i < 3 ? "bg-banditos-cream" : ""}`}
                >
                  <td className="px-6 py-4 text-xl">{getMedal(i)}</td>
                  <td className="px-6 py-4 font-semibold">{player.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {player.badges?.map((b) => (
                        <span
                          key={b.type}
                          className="text-xs bg-banditos-gold text-banditos-dark px-2 py-0.5 rounded-full"
                        >
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-lg">
                    {player.totalPoints ?? player.weeklyPoints} pts
                  </td>
                  {tab === "alltime" && (
                    <td className="px-6 py-4 text-right">
                      {player.currentStreak ? `${player.currentStreak} 🔥` : "-"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
