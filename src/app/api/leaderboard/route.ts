import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { role: "player" },
    orderBy: { totalPoints: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      totalPoints: true,
      gamesPlayed: true,
      bestStreak: true,
    },
  });

  return NextResponse.json({ leaderboard: users });
}
