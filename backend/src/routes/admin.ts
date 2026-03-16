import { Router } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";

export const adminRoutes = Router();

// Get app settings
adminRoutes.get("/settings", authenticate, requireAdmin, async (_req, res) => {
  try {
    let settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      settings = await prisma.appSettings.create({ data: { id: "singleton" } });
    }
    res.json({ settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update app settings
adminRoutes.patch("/settings", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      enablePunishments: z.boolean().optional(),
      punishmentText: z.string().max(500).optional(),
    }).parse(req.body);

    const settings = await prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: body,
      create: { id: "singleton", ...body },
    });
    res.json({ settings });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users (admin)
adminRoutes.get("/users", authenticate, requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true,
        totalPoints: true, totalCredits: true, currentStreak: true,
        createdAt: true,
      },
      orderBy: { totalPoints: "desc" },
    });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Award credits to a user (admin)
adminRoutes.post("/award-credits", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      userId: z.string(),
      amount: z.number().int().min(1),
      reason: z.string(),
    }).parse(req.body);

    await prisma.$transaction([
      prisma.creditTransaction.create({
        data: { userId: body.userId, amount: body.amount, reason: body.reason },
      }),
      prisma.user.update({
        where: { id: body.userId },
        data: { totalCredits: { increment: body.amount } },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Stats overview
adminRoutes.get("/stats", authenticate, requireAdmin, async (_req, res) => {
  try {
    const [totalUsers, totalQuestions, totalRounds, totalAnswers] = await Promise.all([
      prisma.user.count(),
      prisma.question.count(),
      prisma.round.count(),
      prisma.answer.count(),
    ]);
    res.json({ totalUsers, totalQuestions, totalRounds, totalAnswers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
