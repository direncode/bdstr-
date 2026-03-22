"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";
import { BottomNav } from "@/components/BottomNav";
import { NftCard } from "@/components/NftCard";

interface WalletData {
  profile: {
    id: string; name: string; points: number; gamesPlayed: number;
    bestStreak: number; rank: number; level: string; levelBadge: string;
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

  if (loading) return <div className="min-h-screen bg-banditos-dark flex items-center justify-center" role="status"><BanditosLogo size="md" /></div>;

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] flex flex-col items-center justify-center px-4">
        <BanditosLogo size="md" />
        <p className="text-white/60 mt-6" role="alert">{error}</p>
        <button onClick={() => router.push("/play")} className="mt-4 text-banditos-gold hover:underline">Log in to play</button>
      </main>
    );
  }

  if (!data) return null;
  const { profile } = data;

  return (
    <main className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] px-4 py-6 pb-32">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/")} className="text-white/60 hover:text-white" aria-label="Go back to home">&larr; Back</button>
        <BanditosLogo size="sm" />
        <div className="w-10" />
      </div>

      <h1 className="text-center text-white text-2xl font-bold mb-2">Your Stats</h1>
      <p className="text-center text-white/40 text-sm mb-8">Your stats at a glance</p>

      <div className="max-w-sm mx-auto space-y-6">
        {/* NFT Holographic Card */}
        <div className="flex justify-center">
          <NftCard
            name={profile.name}
            points={profile.points}
            level={profile.level}
            levelBadge={profile.levelBadge}
            rank={profile.rank}
            gamesPlayed={profile.gamesPlayed}
            bestStreak={profile.bestStreak}
          />
        </div>

        {/* Share Profile */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5">
          <h2 className="text-white font-bold mb-1">Share Your Profile</h2>
          <p className="text-white/40 text-xs mb-3">Show off your stats to friends</p>
          <button
            onClick={copyProfileLink}
            aria-label="Copy your profile link to clipboard"
            className="w-full bg-banditos-gold/20 text-banditos-gold py-3 rounded-xl font-medium border border-banditos-gold/30 hover:bg-banditos-gold/30 transition-colors"
          >
            {copied ? "Copied!" : "Copy Profile Link"}
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
