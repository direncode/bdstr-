"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";

interface NftCardProps {
  name: string;
  points: number;
  level: string;
  levelBadge: string;
  rank: number;
  gamesPlayed: number;
  bestStreak: number;
  compact?: boolean;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const LEVEL_COLORS: Record<string, { border: string; glow: string; accent: string }> = {
  Legend:   { border: "#ef4444", glow: "rgba(239,68,68,0.5)", accent: "#fca5a5" },
  Diamond:  { border: "#a855f7", glow: "rgba(168,85,247,0.5)", accent: "#d8b4fe" },
  Platinum: { border: "#3b82f6", glow: "rgba(59,130,246,0.5)", accent: "#93c5fd" },
  Gold:     { border: "#eab308", glow: "rgba(234,179,8,0.5)", accent: "#fde047" },
  Silver:   { border: "#9ca3af", glow: "rgba(156,163,175,0.5)", accent: "#d1d5db" },
  Bronze:   { border: "#d97706", glow: "rgba(217,119,6,0.5)", accent: "#fbbf24" },
  Regular:  { border: "#22c55e", glow: "rgba(34,197,94,0.3)", accent: "#86efac" },
  Newbie:   { border: "#6b7280", glow: "rgba(107,114,128,0.3)", accent: "#9ca3af" },
};

export function NftCard({ name, points, level, levelBadge, rank, gamesPlayed, bestStreak, compact }: NftCardProps) {
  const levelColors = LEVEL_COLORS[level] || LEVEL_COLORS.Newbie;

  if (compact) {
    return (
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(145deg, #1a0a2e 0%, #0d0521 50%, #1a0a2e 100%)`,
          border: `1.5px solid ${levelColors.border}`,
          boxShadow: `0 0 12px ${levelColors.glow}`,
        }}
      >
        {/* Subtle holo shimmer */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `linear-gradient(135deg, rgba(255,0,100,0.1), rgba(0,200,255,0.1), rgba(255,165,0,0.1))`,
          }}
        />
        <div className="relative z-10 h-full flex items-center px-3 py-2 gap-3">
          {/* Rank */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
            style={{
              background: `linear-gradient(135deg, ${levelColors.border}, ${levelColors.accent})`,
              color: "#0d0521",
            }}
          >
            {rank}
          </div>
          {/* Name + level */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{name}</p>
            <p className="text-[10px] font-medium" style={{ color: levelColors.accent }}>{level}</p>
          </div>
          {/* Points */}
          <div className="text-right shrink-0">
            <p
              className="text-lg font-black tabular-nums"
              style={{ color: "white", textShadow: `0 0 12px ${levelColors.glow}` }}
            >
              {points}
            </p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: `${levelColors.accent}99` }}>pts</p>
          </div>
        </div>
      </div>
    );
  }

  return <FullCard name={name} points={points} level={level} levelBadge={levelBadge} rank={rank} gamesPlayed={gamesPlayed} bestStreak={bestStreak} levelColors={levelColors} />;
}

function FullCard({ name, points, level, levelBadge, rank, gamesPlayed, bestStreak, levelColors }: Omit<NftCardProps, "compact"> & { levelColors: { border: string; glow: string; accent: string } }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const rafRef = useRef<number>(0);

  const sparkles = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      w: 1 + seededRandom(i * 3) * 2,
      left: 10 + seededRandom(i * 3 + 1) * 80,
      top: 10 + seededRandom(i * 3 + 2) * 80,
      duration: 2 + seededRandom(i * 5) * 3,
      delay: seededRandom(i * 7) * 3,
    })),
  []);

  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setRotation({ x: (0.5 - y) * 20, y: (x - 0.5) * 20 });
      setGlare({ x: x * 100, y: y * 100, opacity: 0.3 });
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => handleInteraction(e.clientX, e.clientY), [handleInteraction]);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) { e.preventDefault(); handleInteraction(e.touches[0].clientX, e.touches[0].clientY); }
  }, [handleInteraction]);
  const handleEnter = useCallback(() => setIsHovering(true), []);
  const handleLeave = useCallback(() => { setIsHovering(false); setRotation({ x: 0, y: 0 }); setGlare({ x: 50, y: 50, opacity: 0 }); }, []);

  const [ambientPhase, setAmbientPhase] = useState(0);
  useEffect(() => {
    if (isHovering) return;
    let running = true;
    let last = 0;
    const animate = (t: number) => {
      if (!running) return;
      if (t - last > 33) { setAmbientPhase(t / 1000); last = t; }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => { running = false; };
  }, [isHovering]);

  const ax = isHovering ? rotation.x : Math.sin(ambientPhase * 0.8) * 2;
  const ay = isHovering ? rotation.y : Math.cos(ambientPhase * 0.6) * 3;
  const at = isHovering ? 0 : Math.sin(ambientPhase * 0.5) * 4;
  const transform = `translateY(${at}px) rotateX(${ax}deg) rotateY(${ay}deg)`;

  // Credit card ratio: 85.6 x 53.98 = 1.586:1
  // Width: min(320px, 80vw). Height = width / 1.586
  return (
    <div style={{ perspective: "800px", WebkitPerspective: "800px" }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onTouchMove={handleTouchMove}
        onTouchStart={handleEnter}
        onTouchEnd={handleLeave}
        style={{
          transform, WebkitTransform: transform,
          transition: isHovering ? "transform 0.1s ease-out" : "transform 0.6s cubic-bezier(0.23,1,0.32,1)",
          transformStyle: "preserve-3d", WebkitTransformStyle: "preserve-3d",
          position: "relative",
          width: "min(320px, 80vw)",
          height: "0",
          paddingBottom: "calc(min(320px, 80vw) / 1.586)",
          borderRadius: "16px",
          touchAction: "none",
        }}
      >
        {/* Outer glow */}
        <div
          className="absolute rounded-[18px] opacity-50"
          style={{
            inset: "-3px",
            background: `linear-gradient(135deg, ${levelColors.border}, transparent, ${levelColors.border})`,
            filter: "blur(6px)", WebkitFilter: "blur(6px)",
            animation: "nft-glow-rotate 4s linear infinite",
          }}
        />

        {/* Card body */}
        <div
          className="absolute inset-0 rounded-[16px] overflow-hidden"
          style={{
            background: `linear-gradient(145deg, #1a0a2e 0%, #0d0521 30%, #1a0a2e 60%, #0d0521 100%)`,
            border: `1.5px solid ${levelColors.border}`,
            boxShadow: `0 0 20px ${levelColors.glow}, inset 0 0 20px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Holo foil */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(${125 + (glare.x - 50) * 2}deg,
                rgba(255,0,100,0.12) 0%, rgba(255,165,0,0.12) 20%, rgba(0,255,100,0.12) 40%,
                rgba(0,200,255,0.12) 60%, rgba(100,0,255,0.12) 80%, rgba(255,0,150,0.12) 100%)`,
              opacity: isHovering ? 1 : 0.3,
              transition: "opacity 0.3s ease",
            }}
          />

          {/* Glare */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, transparent 60%)`,
              transition: isHovering ? "none" : "opacity 0.5s ease",
            }}
          />

          {/* Sparkles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {sparkles.map((s, i) => (
              <div key={i} className="absolute rounded-full" style={{
                width: `${s.w}px`, height: `${s.w}px`, left: `${s.left}%`, top: `${s.top}%`,
                background: "white", opacity: 0,
                animation: `nft-sparkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
              }} />
            ))}
          </div>

          {/* Content — credit card layout */}
          <div className="relative z-10 h-full flex flex-col justify-between p-4">
            {/* Top row: brand + level badge */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: levelColors.accent }}>
                BANDIDOS
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: levelColors.accent, borderColor: `${levelColors.border}80`, background: `${levelColors.border}20` }}
              >
                {levelBadge}
              </span>
            </div>

            {/* Center: points */}
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-4xl font-black tabular-nums leading-none"
                  style={{ color: "white", textShadow: `0 0 30px ${levelColors.glow}` }}
                >
                  {points}
                </p>
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase mt-0.5" style={{ color: `${levelColors.accent}99` }}>
                  POINTS
                </p>
              </div>
              {/* Stats mini grid */}
              <div className="flex gap-3">
                <div className="text-center">
                  <p className="text-white font-bold text-xs">#{rank}</p>
                  <p className="text-white/30 text-[8px] uppercase">Rank</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-xs">{gamesPlayed}</p>
                  <p className="text-white/30 text-[8px] uppercase">Played</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-xs">{bestStreak}</p>
                  <p className="text-white/30 text-[8px] uppercase">Streak</p>
                </div>
              </div>
            </div>

            {/* Bottom row: name + level chip */}
            <div className="flex items-end justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-white font-bold text-sm leading-tight truncate">{name}</p>
                <p className="text-[10px] font-medium" style={{ color: levelColors.accent }}>{level}</p>
              </div>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                style={{ background: `linear-gradient(135deg, ${levelColors.border}, ${levelColors.accent})`, color: "#0d0521" }}
              >
                {levelBadge}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
