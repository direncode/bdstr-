"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import { BottomNav } from "@/components/BottomNav";
import { NftCard } from "@/components/NftCard";
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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = () => {
      fetch("/api/leaderboard")
        .then((r) => r.json())
        .then((d) => setPlayers(d.leaderboard || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    fetchLeaderboard();
    fetch("/api/auth").then(r => r.json()).then(d => { if (d.profile?.is_admin) setIsAdmin(true); }).catch(() => {});
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] pb-32 safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={() => router.push("/")} className="text-white/60 hover:text-white" aria-label="Go back to home">
          &larr; Back
        </button>
        <BanditosLogo size="sm" />
        <div className="w-10" />
      </div>

      <h1 className="text-center text-white text-3xl font-bold mb-2">Leaderboard</h1>
      <p className="text-center text-white/40 text-sm mb-6">Top players at Bandidos Trivia</p>

      {/* Level legend */}
      <div className="flex justify-center gap-2 flex-wrap px-4 mb-8" aria-label="Level guide">
        {LEVELS.slice(1).map((level) => (
          <span key={level.name} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
            {level.name} ({level.minPoints}+)
          </span>
        ))}
      </div>

      {loading ? (
        <p className="text-white/40 text-center py-12" role="status">Loading...</p>
      ) : players.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/60 mt-4">No players yet. Be the first!</p>
        </div>
      ) : (
        <div className="px-4 max-w-lg mx-auto space-y-3">
          {players.map((player, i) => {
            const rank = i + 1;
            const level = getLevel(player.total_points);
            const isTop3 = rank <= 3;

            return (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                aria-label={`View ${player.display_name}, rank ${rank}, ${player.total_points} points`}
                className="w-full text-left transition-transform active:scale-[0.98]"
                style={{ height: isTop3 ? "64px" : "56px" }}
              >
                <NftCard
                  name={player.display_name}
                  points={player.total_points}
                  level={level.name}
                  levelBadge={level.badge}
                  rank={rank}
                  gamesPlayed={player.games_played}
                  bestStreak={player.best_streak}
                  compact
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Player detail modal */}
      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}

      <BottomNav isAdmin={isAdmin} />
    </main>
  );
}

function PlayerModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const level = getLevel(player.total_points);
  const next = getNextLevel(player.total_points);
  const progress = getLevelProgress(player.total_points);
  const rank = 0; // not available here, but modal shows other stats

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${player.display_name} stats`}>
      <div className="bg-banditos-dark border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <h2 className="text-white text-xl font-bold">{player.display_name}</h2>
          <p className={`text-sm font-medium ${level.color}`}>{level.name}</p>
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
            <span className="font-bold">{player.best_streak}</span>
          </div>

          {next && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>{level.name}</span>
                <span>{next.name} ({next.minPoints} pts)</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
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
          autoFocus
        >
          Close
        </button>
      </div>
    </div>
  );
}
