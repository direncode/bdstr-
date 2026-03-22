"use client";

import { useEffect, useState } from "react";

interface BusynessData {
  percent: number;
  questionsAllowed: number;
  label: string;
  message: string;
}

export function BusynessBar() {
  const [data, setData] = useState<BusynessData | null>(null);

  useEffect(() => {
    fetch("/api/busyness")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const barColor =
    data.percent < 25 ? "from-green-400 to-green-500"
    : data.percent < 50 ? "from-yellow-400 to-yellow-500"
    : data.percent < 75 ? "from-orange-400 to-orange-500"
    : "from-red-400 to-red-500";

  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-4" role="status" aria-label={`Bandidos is currently ${data.label}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/80 text-sm font-medium">Bandidos Right Now</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
          {data.label}
        </span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden" role="progressbar" aria-valuenow={data.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Busyness level">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000`}
          style={{ width: `${data.percent}%` }}
        />
      </div>
      <p className="text-white/50 text-xs mt-2">{data.message}</p>
    </div>
  );
}
