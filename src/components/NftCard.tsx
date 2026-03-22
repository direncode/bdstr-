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
}

// Stable pseudo-random based on index for sparkle positions (avoids hydration mismatch)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function NftCard({ name, points, level, levelBadge, rank, gamesPlayed, bestStreak }: NftCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const rafRef = useRef<number>(0);

  // Stable sparkle positions
  const sparkles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
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

    const rotateY = (x - 0.5) * 30;
    const rotateX = (0.5 - y) * 30;
    const glareX = x * 100;
    const glareY = y * 100;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setRotation({ x: rotateX, y: rotateY });
      setGlare({ x: glareX, y: glareY, opacity: 0.35 });
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleInteraction(e.clientX, e.clientY);
  }, [handleInteraction]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      e.preventDefault(); // Prevent scroll while tilting card
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleInteraction]);

  const handleEnter = useCallback(() => setIsHovering(true), []);
  const handleLeave = useCallback(() => {
    setIsHovering(false);
    setRotation({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  }, []);

  // Ambient float animation — throttled to reduce Safari GPU load
  const [ambientPhase, setAmbientPhase] = useState(0);
  useEffect(() => {
    if (isHovering) return;
    let running = true;
    let lastUpdate = 0;
    const animate = (time: number) => {
      if (!running) return;
      // Throttle to ~30fps for battery on mobile
      if (time - lastUpdate > 33) {
        setAmbientPhase(time / 1000);
        lastUpdate = time;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => { running = false; };
  }, [isHovering]);

  const ambientX = isHovering ? rotation.x : Math.sin(ambientPhase * 0.8) * 3;
  const ambientY = isHovering ? rotation.y : Math.cos(ambientPhase * 0.6) * 4;
  const ambientTranslateY = isHovering ? 0 : Math.sin(ambientPhase * 0.5) * 6;

  const getLevelGlow = () => {
    switch (level) {
      case "Legend": return { border: "#ef4444", glow: "rgba(239,68,68,0.5)", accent: "#fca5a5" };
      case "Diamond": return { border: "#a855f7", glow: "rgba(168,85,247,0.5)", accent: "#d8b4fe" };
      case "Platinum": return { border: "#3b82f6", glow: "rgba(59,130,246,0.5)", accent: "#93c5fd" };
      case "Gold": return { border: "#eab308", glow: "rgba(234,179,8,0.5)", accent: "#fde047" };
      case "Silver": return { border: "#9ca3af", glow: "rgba(156,163,175,0.5)", accent: "#d1d5db" };
      case "Bronze": return { border: "#d97706", glow: "rgba(217,119,6,0.5)", accent: "#fbbf24" };
      default: return { border: "#6b7280", glow: "rgba(107,114,128,0.3)", accent: "#9ca3af" };
    }
  };
  const levelColors = getLevelGlow();

  // Build transform string with -webkit prefix support
  const transformValue = `translateY(${ambientTranslateY}px) rotateX(${ambientX}deg) rotateY(${ambientY}deg)`;

  return (
    <div style={{ perspective: "1200px", WebkitPerspective: "1200px" }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onTouchMove={handleTouchMove}
        onTouchStart={handleEnter}
        onTouchEnd={handleLeave}
        style={{
          transform: transformValue,
          WebkitTransform: transformValue,
          transition: isHovering ? "transform 0.1s ease-out" : "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          position: "relative",
          width: "min(340px, 85vw)",
          // aspect-ratio fallback for older Safari: use padding-bottom trick via explicit height
          height: "0",
          paddingBottom: "calc(min(340px, 85vw) * 1.4)",
          borderRadius: "20px",
          touchAction: "none", // Prevent scroll while interacting with card
        }}
      >
        {/* Outer glow */}
        <div
          className="absolute rounded-[22px] opacity-60"
          style={{
            inset: "-4px",
            background: `linear-gradient(135deg, ${levelColors.border}, transparent, ${levelColors.border})`,
            WebkitFilter: "blur(8px)",
            filter: "blur(8px)",
            animation: "nft-glow-rotate 4s linear infinite",
          }}
        />

        {/* Card body */}
        <div
          className="absolute inset-0 rounded-[20px] overflow-hidden"
          style={{
            background: `linear-gradient(145deg, #1a0a2e 0%, #0d0521 30%, #1a0a2e 60%, #0d0521 100%)`,
            border: `2px solid ${levelColors.border}`,
            boxShadow: `0 0 30px ${levelColors.glow}, inset 0 0 30px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Holographic foil overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(
                ${125 + (glare.x - 50) * 2}deg,
                rgba(255,0,100,0.15) 0%,
                rgba(255,165,0,0.15) 15%,
                rgba(255,255,0,0.15) 30%,
                rgba(0,255,100,0.15) 45%,
                rgba(0,200,255,0.15) 60%,
                rgba(100,0,255,0.15) 75%,
                rgba(255,0,150,0.15) 100%
              )`,
              opacity: isHovering ? 1 : 0.4,
              transition: "opacity 0.3s ease",
            }}
          />

          {/* Animated rainbow shimmer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `repeating-linear-gradient(
                ${90 + ambientPhase * 30}deg,
                rgba(255,0,0,0.03) 0px,
                rgba(255,127,0,0.03) 2px,
                rgba(255,255,0,0.03) 4px,
                rgba(0,255,0,0.03) 6px,
                rgba(0,0,255,0.03) 8px,
                rgba(75,0,130,0.03) 10px,
                rgba(148,0,211,0.03) 12px,
                transparent 14px
              )`,
            }}
          />

          {/* Glare / Spotlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, transparent 60%)`,
              transition: isHovering ? "none" : "opacity 0.5s ease",
            }}
          />

          {/* Sparkle particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {sparkles.map((s, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${s.w}px`,
                  height: `${s.w}px`,
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  background: "white",
                  opacity: 0,
                  animation: `nft-sparkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                  WebkitAnimation: `nft-sparkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] sm:text-xs font-black tracking-[0.2em] uppercase"
                style={{ color: levelColors.accent }}
              >
                BANDIDOS
              </span>
              <span
                className="text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border"
                style={{
                  color: levelColors.accent,
                  borderColor: `${levelColors.border}80`,
                  background: `${levelColors.border}20`,
                }}
              >
                {levelBadge}
              </span>
            </div>

            {/* Center — Points */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative">
                <p
                  className="text-5xl sm:text-6xl font-black tabular-nums"
                  style={{
                    color: "white",
                    textShadow: `0 0 40px ${levelColors.glow}, 0 0 80px ${levelColors.glow}`,
                  }}
                >
                  {points}
                </p>
                {/* Reflection text */}
                <p
                  className="text-5xl sm:text-6xl font-black tabular-nums absolute top-full left-0 right-0 text-center"
                  style={{
                    color: "white",
                    opacity: 0.06,
                    transform: "scaleY(-0.4) translateY(-20%)",
                    WebkitTransform: "scaleY(-0.4) translateY(-20%)",
                    filter: "blur(2px)",
                    WebkitFilter: "blur(2px)",
                  }}
                  aria-hidden="true"
                >
                  {points}
                </p>
              </div>
              <p
                className="text-xs sm:text-sm font-bold tracking-[0.3em] uppercase mt-1"
                style={{ color: `${levelColors.accent}99` }}
              >
                POINTS
              </p>
            </div>

            {/* Stats row */}
            <div
              className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2 sm:mb-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="text-center">
                <p className="text-white font-bold text-xs sm:text-sm">#{rank}</p>
                <p className="text-white/30 text-[8px] sm:text-[9px] uppercase tracking-wider">Rank</p>
              </div>
              <div className="text-center border-x border-white/5">
                <p className="text-white font-bold text-xs sm:text-sm">{gamesPlayed}</p>
                <p className="text-white/30 text-[8px] sm:text-[9px] uppercase tracking-wider">Played</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-xs sm:text-sm">{bestStreak}</p>
                <p className="text-white/30 text-[8px] sm:text-[9px] uppercase tracking-wider">Streak</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-end justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-white font-bold text-sm sm:text-base leading-tight truncate">{name}</p>
                <p
                  className="text-[10px] sm:text-xs font-medium"
                  style={{ color: levelColors.accent }}
                >
                  {level}
                </p>
              </div>
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${levelColors.border}, ${levelColors.accent})`,
                  color: "#0d0521",
                }}
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
