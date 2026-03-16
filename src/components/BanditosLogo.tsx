"use client";

import Image from "next/image";

const LOGO_URL = "https://bandidoscafe.com/wp-content/uploads/2023/02/Bandidos-300-%C3%97-250-px-350-%C3%97-250-px-400-%C3%97-250-px-1.svg";

export function BanditosLogo({ size = "lg" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const dims = { sm: { w: 100, h: 80 }, md: { w: 160, h: 130 }, lg: { w: 240, h: 200 }, xl: { w: 350, h: 280 } };
  const d = dims[size];

  return (
    <div className="flex flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_URL}
        alt="Bandidos Mexican Cafe"
        width={d.w}
        height={d.h}
        className="drop-shadow-lg"
        style={{ width: d.w, height: d.h, objectFit: "contain" }}
      />
      {size !== "sm" && (
        <p
          className="font-bold tracking-widest mt-1"
          style={{
            fontSize: size === "xl" ? 28 : size === "lg" ? 20 : 14,
            color: "#FFD700",
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
            fontFamily: "'Passion One', Impact, sans-serif",
          }}
        >
          TRIVIA
        </p>
      )}
    </div>
  );
}
