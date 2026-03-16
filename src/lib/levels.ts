export interface Level {
  name: string;
  emoji: string;
  minPoints: number;
  color: string;
  bg: string;
}

export const LEVELS: Level[] = [
  { name: "Newbie",   emoji: "🌱", minPoints: 0,    color: "text-gray-500",   bg: "bg-gray-100" },
  { name: "Regular",  emoji: "🌮", minPoints: 50,   color: "text-green-600",  bg: "bg-green-100" },
  { name: "Bronze",   emoji: "🥉", minPoints: 150,  color: "text-amber-700",  bg: "bg-amber-100" },
  { name: "Silver",   emoji: "🥈", minPoints: 300,  color: "text-gray-500",   bg: "bg-gray-200" },
  { name: "Gold",     emoji: "🥇", minPoints: 500,  color: "text-yellow-600", bg: "bg-yellow-100" },
  { name: "Platinum", emoji: "💎", minPoints: 1000, color: "text-blue-600",   bg: "bg-blue-100" },
  { name: "Diamond",  emoji: "👑", minPoints: 2000, color: "text-purple-600", bg: "bg-purple-100" },
  { name: "Legend",   emoji: "🔥", minPoints: 5000, color: "text-red-600",    bg: "bg-red-100" },
];

export function getLevel(points: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(points: number): Level | null {
  const current = getLevel(points);
  const idx = LEVELS.indexOf(current);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

export function getLevelProgress(points: number): number {
  const current = getLevel(points);
  const next = getNextLevel(points);
  if (!next) return 100;
  const range = next.minPoints - current.minPoints;
  const progress = points - current.minPoints;
  return Math.round((progress / range) * 100);
}
