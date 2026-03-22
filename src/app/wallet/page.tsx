"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import { BottomNav } from "@/components/BottomNav";

interface WalletData {
  profile: {
    id: string; name: string; points: number; gamesPlayed: number;
    bestStreak: number; rank: number; level: string; levelEmoji: string;
  };
  profileUrl: string;
}

export default function WalletPage() {
  const router = useRouter();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError("Failed to load card data"))
      .finally(() => setLoading(false));
  }, []);

  const copyProfileLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-banditos-dark flex items-center justify-center"><BanditosLogo size="md" /></div>;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <p className="text-white/60 mt-6">{error}</p>
        <button onClick={() => router.push("/play")} className="mt-4 text-banditos-gold hover:underline">Log in to play</button>
      </div>
    );
  }

  if (!data) return null;
  const { profile } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/")} className="text-white/60 hover:text-white">← Back</button>
        <BanditosLogo size="sm" />
        <div className="w-10" />
      </div>

      <h1 className="text-center text-white text-2xl font-bold mb-2">Your Loyalty Card</h1>
      <p className="text-center text-white/40 text-sm mb-8">Your stats at a glance</p>

      <div className="max-w-sm mx-auto space-y-6">
        {/* Digital Card Preview */}
        <div className="bg-gradient-to-br from-banditos-red via-[#a01630] to-[#7a1025] rounded-2xl p-6 border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/80 text-xs font-bold tracking-wider uppercase">Bandidos Trivia</span>
            <span className="text-2xl">{profile.levelEmoji}</span>
          </div>

          <div className="text-center py-4">
            <p className="text-banditos-gold text-4xl font-bold">{profile.points}</p>
            <p className="text-white/60 text-sm">POINTS</p>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <p className="text-white font-bold text-lg">{profile.name}</p>
              <p className="text-white/50 text-xs">{profile.level} &middot; Rank #{profile.rank}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs">{profile.gamesPlayed} games</p>
              <p className="text-white/40 text-xs">{profile.bestStreak} best streak</p>
            </div>
          </div>
        </div>

        {/* Share Profile */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔗</span>
            <div>
              <h3 className="text-white font-bold">Share Your Profile</h3>
              <p className="text-white/40 text-xs">Show off your stats to friends</p>
            </div>
          </div>
          <button
            onClick={copyProfileLink}
            className="w-full bg-banditos-gold/20 text-banditos-gold py-3 rounded-xl font-medium border border-banditos-gold/30 hover:bg-banditos-gold/30 transition-colors"
          >
            {copied ? "Copied!" : "Copy Profile Link"}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
