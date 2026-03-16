"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BusynessBar } from "@/components/BusynessBar";
import { leaderboard as leaderboardApi, LeaderboardEntry, LoserData } from "@/lib/api";

export default function HomePage() {
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [loser, setLoser] = useState<LoserData | null>(null);

  useEffect(() => {
    leaderboardApi.allTime().then((r) => setTopPlayers(r.leaderboard.slice(0, 5))).catch(console.error);
    leaderboardApi.loser().then(setLoser).catch(console.error);
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="text-center py-12 bg-gradient-to-br from-banditos-dark to-banditos-red rounded-2xl text-white">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-banditos-gold">Banditos</span> Trivia
        </h1>
        <p className="text-xl text-gray-200 mb-6 max-w-2xl mx-auto">
          The ultimate campus trivia experience at Bandidos Mexican Restaurant, Chapel Hill.
          Answer questions, earn points, climb the leaderboard!
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-banditos-gold text-banditos-dark px-8 py-3 rounded-lg font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Join Now
          </Link>
          <Link
            href="/leaderboard"
            className="border-2 border-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-white hover:text-banditos-dark transition-all"
          >
            View Leaderboard
          </Link>
        </div>
      </section>

      {/* Busyness */}
      <BusynessBar />

      {/* Quick Leaderboard */}
      <section className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Top Players</h2>
          <Link href="/leaderboard" className="text-banditos-red font-medium hover:underline">
            View All
          </Link>
        </div>

        {topPlayers.length === 0 ? (
          <p className="text-gray-500">No players yet. Be the first to play!</p>
        ) : (
          <div className="space-y-3">
            {topPlayers.map((player, i) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-lg bg-banditos-cream"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${i === 0 ? "text-banditos-gold" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-gray-600"}`}>
                    #{i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    {player.badges && player.badges.length > 0 && (
                      <div className="flex gap-1">
                        {player.badges.map((b) => (
                          <span key={b.type} className="text-xs bg-banditos-gold text-banditos-dark px-2 py-0.5 rounded-full">
                            {b.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="font-bold text-lg">{player.totalPoints} pts</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Loser of the Night */}
      {loser?.enabled && loser.loser && (
        <section className="bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-300 rounded-xl p-6">
          <h2 className="text-xl font-bold text-red-700 mb-2">Loser of the Night</h2>
          <p className="text-lg">
            <span className="font-bold">{loser.loser.name}</span> with {loser.score} points
          </p>
          {loser.punishmentText && (
            <p className="mt-2 text-gray-700 italic">{loser.punishmentText}</p>
          )}
        </section>
      )}

      {/* How it works */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: "🎯", title: "Play Trivia", desc: "Answer questions in real-time during trivia nights at Bandidos." },
          { icon: "🏆", title: "Earn Points", desc: "10 points per correct answer, bonuses for streaks and speed." },
          { icon: "⭐", title: "Climb Rankings", desc: "Top the weekly and all-time leaderboards. Earn badges and credits!" },
        ].map((item) => (
          <div key={item.title} className="bg-white rounded-xl p-6 shadow-md text-center">
            <span className="text-4xl">{item.icon}</span>
            <h3 className="text-xl font-bold mt-3 mb-2">{item.title}</h3>
            <p className="text-gray-600">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
