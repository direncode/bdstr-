"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import { getLevel, getNextLevel, getLevelProgress, LEVELS } from "@/lib/levels";

interface Player {
  id: string;
  display_name: string;
  total_points: number;
  games_played: number;
  best_streak: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setPlayers(d.leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const podium = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={() => router.push("/")} className="text-white/60 hover:text-white">
          ← Back
        </button>
        <BanditosLogo size="sm" />
        <div className="w-10" />
      </div>

      <h1 className="text-center text-white text-3xl font-bold mb-2">Leaderboard</h1>
      <p className="text-center text-white/40 text-sm mb-6">Top players at Banditos Trivia</p>

      {/* Level legend */}
      <div className="flex justify-center gap-2 flex-wrap px-4 mb-8">
        {LEVELS.slice(1).map((level) => (
          <span key={level.name} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
            {level.emoji} {level.name} ({level.minPoints}+)
          </span>
        ))}
      </div>

      {loading ? (
        <p className="text-white/40 text-center py-12">Loading...</p>
      ) : players.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl">🌮</span>
          <p className="text-white/60 mt-4">No players yet. Be the first!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="flex justify-center items-end gap-3 px-4 mb-8">
            {podium[1] && <PodiumCard player={podium[1]} rank={2} height="h-32" />}
            {podium[0] && <PodiumCard player={podium[0]} rank={1} height="h-40" />}
            {podium[2] && <PodiumCard player={podium[2]} rank={3} height="h-28" />}
          </div>

          {/* Rest of leaderboard */}
          <div className="px-4 pb-8 max-w-lg mx-auto space-y-2">
            {rest.map((player, i) => {
              const rank = i + 4;
              const level = getLevel(player.total_points);
              return (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className="w-full flex items-center gap-3 bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors text-left"
                >
                  <span className="text-white/40 font-bold w-8 text-center">#{rank}</span>
                  <span className="text-lg">{level.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{player.display_name}</p>
                    <p className="text-white/40 text-xs">{level.name}</p>
                  </div>
                  <span className="text-banditos-gold font-bold">{player.total_points}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Player detail modal */}
      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}

function PodiumCard({ player, rank, height }: { player: Player; rank: number; height: string }) {
  const level = getLevel(player.total_points);
  const medals = ["", "🥇", "🥈", "🥉"];
  const bgColors = ["", "from-yellow-500/30 to-yellow-600/10", "from-gray-400/20 to-gray-500/10", "from-amber-700/20 to-amber-800/10"];

  return (
    <div className={`flex-1 max-w-[140px] bg-gradient-to-b ${bgColors[rank]} backdrop-blur border border-white/10 rounded-2xl p-3 ${height} flex flex-col items-center justify-end`}>
      <span className="text-3xl">{medals[rank]}</span>
      <span className="text-lg mt-1">{level.emoji}</span>
      <p className="text-white font-bold text-sm text-center mt-1 truncate w-full">{player.display_name}</p>
      <p className="text-banditos-gold font-bold text-lg">{player.total_points}</p>
      <p className="text-white/40 text-xs">{level.name}</p>
    </div>
  );
}

function PlayerModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const level = getLevel(player.total_points);
  const next = getNextLevel(player.total_points);
  const progress = getLevelProgress(player.total_points);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-banditos-dark border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <span className="text-5xl">{level.emoji}</span>
          <h2 className="text-white text-xl font-bold mt-2">{player.display_name}</h2>
          <p className={`text-sm font-medium ${level.color.replace("text-", "text-")}`}>{level.name}</p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex justify-between text-white/80">
            <span>Total Points</span>
            <span className="font-bold text-banditos-gold">{player.total_points}</span>
          </div>
          <div className="flex justify-between text-white/80">
            <span>Games Played</span>
            <span className="font-bold">{player.games_played}</span>
          </div>
          <div className="flex justify-between text-white/80">
            <span>Best Streak</span>
            <span className="font-bold">{player.best_streak} 🔥</span>
          </div>

          {next && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>{level.emoji} {level.name}</span>
                <span>{next.emoji} {next.name} ({next.minPoints} pts)</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-banditos-red to-banditos-gold rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-white/30 text-xs mt-1">{next.minPoints - player.total_points} points to next level</p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-white/10 text-white py-2 rounded-xl hover:bg-white/20 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
