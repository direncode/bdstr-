import { prisma } from "./prisma";

export interface BusynessData {
  percent: number;
  label: string;
  message: string;
  updatedAt: string;
}

const CACHE_MS = 15 * 60 * 1000;

function simulate(): BusynessData {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  let base = 30;
  if (day === 4) base += 25; // Thursday trivia night
  if (day === 5 || day === 6) base += 20;
  if (hour >= 11 && hour <= 14) base += 20;
  if (hour >= 17 && hour <= 21) base += 35;
  if (hour >= 21 && hour <= 23) base += 10;
  if (hour >= 0 && hour <= 10) base = 5;

  const jitter = Math.floor(Math.random() * 16) - 8;
  const percent = Math.max(0, Math.min(100, base + jitter));

  let label = "Not Busy";
  if (percent >= 75) label = "Packed";
  else if (percent >= 50) label = "Busy";
  else if (percent >= 25) label = "Moderate";

  let message = "Quiet night — grab a table!";
  if (percent >= 75) message = "Full house! Trivia night is LIT!";
  else if (percent >= 50) message = "Great energy tonight — come through!";
  else if (percent >= 25) message = "Nice crowd building up!";
  else if (percent < 10) message = "Bandidos is closed right now.";

  return { percent, label, message, updatedAt: now.toISOString() };
}

export async function getBusyness(): Promise<BusynessData> {
  try {
    const state = await prisma.gameState.findUnique({ where: { id: "singleton" } });
    if (state?.busynessCache && state.busynessAt) {
      if (Date.now() - state.busynessAt.getTime() < CACHE_MS) {
        return JSON.parse(state.busynessCache);
      }
    }
  } catch { /* cache miss */ }

  const data = simulate();

  try {
    await prisma.gameState.upsert({
      where: { id: "singleton" },
      update: { busynessCache: JSON.stringify(data), busynessAt: new Date() },
      create: { id: "singleton", busynessCache: JSON.stringify(data), busynessAt: new Date() },
    });
  } catch { /* ok */ }

  return data;
}
