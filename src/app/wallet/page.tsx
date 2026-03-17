"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BanditosLogo } from "@/components/BanditosLogo";

interface WalletData {
  profile: {
    id: string; name: string; points: number; gamesPlayed: number;
    bestStreak: number; rank: number; level: string; levelEmoji: string;
  };
  appleConfigured: boolean;
  googleSaveUrl: string | null;
  googleConfigured: boolean;
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
      .catch(() => setError("Failed to load wallet data"))
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
    <div className="min-h-screen bg-gradient-to-b from-banditos-dark to-[#2a1a3e] px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/")} className="text-white/60 hover:text-white">← Back</button>
        <BanditosLogo size="sm" />
        <div className="w-10" />
      </div>

      <h1 className="text-center text-white text-2xl font-bold mb-2">Your Loyalty Card</h1>
      <p className="text-center text-white/40 text-sm mb-8">Add to your phone wallet for quick access</p>

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
              <p className="text-white/40 text-xs">{profile.bestStreak} streak</p>
            </div>
          </div>
        </div>

        {/* Apple Wallet */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🍎</span>
            <div>
              <h3 className="text-white font-bold">Apple Wallet</h3>
              <p className="text-white/40 text-xs">Add to your iPhone wallet</p>
            </div>
          </div>
          {data.appleConfigured ? (
            <a
              href="/api/wallet/apple-pass"
              className="block w-full bg-black text-white py-3 rounded-xl font-medium text-center hover:bg-gray-900 transition-colors"
            >
              Add to Apple Wallet
            </a>
          ) : (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-sm">Apple Wallet requires certificate setup.</p>
              <p className="text-white/30 text-xs mt-1">See setup instructions in the docs to enable PKPass generation.</p>
            </div>
          )}
        </div>

        {/* Google Wallet */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="text-white font-bold">Google Wallet</h3>
              <p className="text-white/40 text-xs">Add to your Android wallet</p>
            </div>
          </div>
          {data.googleConfigured && data.googleSaveUrl ? (
            <a
              href={data.googleSaveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white text-gray-900 py-3 rounded-xl font-medium text-center hover:bg-gray-100 transition-colors"
            >
              Save to Google Wallet
            </a>
          ) : (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-sm">Google Wallet requires API setup.</p>
              <p className="text-white/30 text-xs mt-1">See setup instructions to enable Google Wallet integration.</p>
            </div>
          )}
        </div>

        {/* Share Profile */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔗</span>
            <div>
              <h3 className="text-white font-bold">Share Your Profile</h3>
              <p className="text-white/40 text-xs">QR code on your card links here</p>
            </div>
          </div>
          <button
            onClick={copyProfileLink}
            className="w-full bg-banditos-gold/20 text-banditos-gold py-3 rounded-xl font-medium border border-banditos-gold/30 hover:bg-banditos-gold/30 transition-colors"
          >
            {copied ? "Copied!" : "Copy Profile Link"}
          </button>
        </div>

        {/* Setup Instructions */}
        {(!data.appleConfigured || !data.googleConfigured) && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <h3 className="text-white font-bold mb-3">Setup Instructions</h3>

            {!data.appleConfigured && (
              <div className="mb-4">
                <h4 className="text-banditos-gold text-sm font-bold mb-1">Apple Wallet Setup</h4>
                <ol className="text-white/40 text-xs space-y-1 list-decimal list-inside">
                  <li>Get an Apple Developer account ($99/yr)</li>
                  <li>Create a Pass Type ID at developer.apple.com</li>
                  <li>Generate signing certificate (.p12)</li>
                  <li>Download WWDR intermediate cert</li>
                  <li>Set env vars: APPLE_PASS_TYPE_ID, APPLE_TEAM_ID, cert paths</li>
                </ol>
              </div>
            )}

            {!data.googleConfigured && (
              <div>
                <h4 className="text-banditos-gold text-sm font-bold mb-1">Google Wallet Setup</h4>
                <ol className="text-white/40 text-xs space-y-1 list-decimal list-inside">
                  <li>Enable Google Wallet API in Cloud Console</li>
                  <li>Create a service account with Wallet Writer role</li>
                  <li>Get Issuer ID from pay.google.com/business/console</li>
                  <li>Set env vars: GOOGLE_WALLET_ISSUER_ID, service account email + key</li>
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-3 pb-6">
          <button onClick={() => router.push("/leaderboard")} className="text-banditos-gold/60 text-sm hover:text-banditos-gold">Leaderboard</button>
          <span className="text-white/20">|</span>
          <button onClick={() => router.push("/play")} className="text-banditos-gold/60 text-sm hover:text-banditos-gold">Play</button>
        </div>
      </div>
    </div>
  );
}
