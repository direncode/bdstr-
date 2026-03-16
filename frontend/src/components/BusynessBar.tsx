"use client";

import { useEffect, useState } from "react";
import { busyness as busynessApi, BusynessData } from "@/lib/api";

export function BusynessBar() {
  const [data, setData] = useState<BusynessData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    busynessApi.get().then(setData).catch(() => setError(true));

    const interval = setInterval(() => {
      busynessApi.get().then(setData).catch(() => setError(true));
    }, 60_000); // refresh every minute on the client

    return () => clearInterval(interval);
  }, []);

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-2">Live at Bandidos</h3>
        <p className="text-gray-500">Unable to load busyness data</p>
      </div>
    );
  }

  const barColor =
    data.busynessPercent < 25
      ? "bg-green-500"
      : data.busynessPercent < 50
        ? "bg-yellow-500"
        : data.busynessPercent < 75
          ? "bg-orange-500"
          : "bg-red-500";

  return (
    <div className="bg-white rounded-xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Live at Bandidos</h3>
        <span className="text-sm px-3 py-1 rounded-full bg-banditos-dark text-white font-medium">
          {data.label}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-6 mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${data.busynessPercent}%` }}
        />
      </div>

      <p className="text-gray-700">{data.message}</p>

      <p className="text-xs text-gray-400 mt-2">
        Updated {new Date(data.updatedAt).toLocaleTimeString()} &middot; Source: {data.source}
      </p>
    </div>
  );
}
