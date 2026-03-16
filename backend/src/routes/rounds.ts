import { Router } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";

export const roundRoutes = Router();

const createRoundSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["government", "sg_history", "past_sbps", "wildcard"]),
  order: z.number().int().optional(),
});

// List all rounds
roundRoutes.get("/", async (_req, res) => {
  try {
    const rounds = await prisma.round.findMany({
      include: { questions: { select: { id: true, text: true, order: true } } },
      orderBy: { order: "asc" },
    });
    res.json({ rounds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create round (admin)
roundRoutes.post("/", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const body = createRoundSchema.parse(req.body);
    const round = await prisma.round.create({
      data: { name: body.name, category: body.category, order: body.order ?? 0 },
    });
    res.status(201).json({ round });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update round status (admin) — used to start/end rounds
roundRoutes.patch("/:id/status", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = z.object({ status: z.enum(["pending", "active", "completed"]) }).parse(req.body);
    const round = await prisma.round.update({
      where: { id: req.params.id as string },
      data: { status },
      include: { questions: true },
    });
    res.json({ round });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete round (admin)
roundRoutes.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.round.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
