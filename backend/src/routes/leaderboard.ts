import { Router } from "express";
import { prisma } from "../utils/prisma";

export const leaderboardRoutes = Router();

// All-time top 10
leaderboardRoutes.get("/all-time", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { totalPoints: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        totalPoints: true,
        currentStreak: true,
        longestStreak: true,
        badges: { select: { type: true, name: true } },
      },
    });
    res.json({ leaderboard: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Weekly top 10 (points earned in last 7 days)
leaderboardRoutes.get("/weekly", async (_req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weeklyPoints = await prisma.pointTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: oneWeekAgo } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });

    const userIds = weeklyPoints.map((wp) => wp.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, badges: { select: { type: true, name: true } } },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    const leaderboard = weeklyPoints.map((wp) => ({
      ...userMap.get(wp.userId),
      weeklyPoints: wp._sum.amount || 0,
    }));

    res.json({ leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Loser of the night (lowest score among players who played today)
leaderboardRoutes.get("/loser", async (_req, res) => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    if (!settings?.enablePunishments) {
      return res.json({ enabled: false, loser: null, punishmentText: null });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayPoints = await prisma.pointTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: todayStart } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "asc" } },
      take: 1,
    });

    if (todayPoints.length === 0) {
      return res.json({ enabled: true, loser: null, punishmentText: settings.punishmentText });
    }

    const loserUser = await prisma.user.findUnique({
      where: { id: todayPoints[0].userId },
      select: { id: true, name: true },
    });

    res.json({
      enabled: true,
      loser: loserUser,
      score: todayPoints[0]._sum.amount || 0,
      punishmentText: settings.punishmentText,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
