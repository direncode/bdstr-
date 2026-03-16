import { Router } from "express";
import { prisma } from "../utils/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

export const creditRoutes = Router();

// Get user's credit history
creditRoutes.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { totalCredits: true },
    });
    res.json({ balance: user?.totalCredits || 0, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's point history
creditRoutes.get("/points", authenticate, async (req: AuthRequest, res) => {
  try {
    const transactions = await prisma.pointTransaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { totalPoints: true },
    });
    res.json({ totalPoints: user?.totalPoints || 0, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
