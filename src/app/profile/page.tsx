"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import { getLevel, getNextLevel, getLevelProgress, LEVELS } from "@/lib/levels";

interface PlayerProfile {
  id: string;
  display_name: string;
  total_points: number;
  games_played: number;
  best_streak: number;
  rank: number;
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const playerId = searchParams.get("id");

  useEffect(() => {
    if (!playerId) { setError("No player ID"); setLoading(false); return; }
    fetch(`/api/profile?id=${playerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setPlayer(d.player);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex items-center justify-center">
        <BanditosLogo size="md" />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <p className="text-white/60 mt-6">{error || "Player not found"}</p>
        <button onClick={() => router.push("/")} className="mt-4 text-banditos-gold hover:underline">Go Home</button>
      </div>
    );
  }

  const level = getLevel(player.total_points);
  const next = getNextLevel(player.total_points);
  const progress = getLevelProgress(player.total_points);

  return (
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
      <BanditosLogo size="md" />

      <div className="mt-8 w-full max-w-sm animate-slide-up">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center border border-white/10">
          {/* Level badge */}
          <span className="text-6xl">{level.emoji}</span>
          <h1 className="text-white text-2xl font-bold mt-3">{player.display_name}</h1>
          <p className="text-banditos-gold font-medium">{level.name}</p>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-banditos-gold text-2xl font-bold">{player.total_points}</p>
              <p className="text-white/40 text-xs">Points</p>
            </div>
            <div>
              <p className="text-white text-2xl font-bold">#{player.rank}</p>
              <p className="text-white/40 text-xs">Rank</p>
            </div>
            <div>
              <p className="text-white text-2xl font-bold">{player.best_streak}</p>
              <p className="text-white/40 text-xs">Best Streak</p>
            </div>
          </div>

          {/* Games played */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/60 text-sm">{player.games_played} rounds played</p>
          </div>

          {/* Level progress */}
          {next && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>{level.emoji} {level.name}</span>
                <span>{next.emoji} {next.name}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-banditos-red to-banditos-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-white/30 text-xs mt-1">{next.minPoints - player.total_points} pts to next level</p>
            </div>
          )}

          {/* All levels */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-white/30 text-xs mb-2">All Levels</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {LEVELS.map((l) => (
                <span key={l.name} className={`text-xs px-2 py-0.5 rounded-full ${player.total_points >= l.minPoints ? "bg-banditos-gold/20 text-banditos-gold" : "bg-white/5 text-white/20"}`}>
                  {l.emoji} {l.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3 justify-center">
          <button onClick={() => router.push("/leaderboard")} className="text-banditos-gold/60 text-sm hover:text-banditos-gold">Leaderboard</button>
          <span className="text-white/20">|</span>
          <button onClick={() => router.push("/play")} className="text-banditos-gold/60 text-sm hover:text-banditos-gold">Play Trivia</button>
        </div>
      </div>

      <p className="mt-8 text-white/20 text-xs">Bandidos Mexican Cafe &middot; Franklin St, Chapel Hill NC</p>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-banditos-dark flex items-center justify-center">
        <BanditosLogo size="md" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
