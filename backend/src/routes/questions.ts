import { Router } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";

export const questionRoutes = Router();

const createQuestionSchema = z.object({
  text: z.string().min(5),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.number().int().min(0),
  timeLimit: z.number().int().min(5).max(120).optional(),
  points: z.number().int().min(1).optional(),
  roundId: z.string(),
  order: z.number().int().optional(),
});

// Get all questions (admin only)
questionRoutes.get("/", authenticate, requireAdmin, async (_req, res) => {
  try {
    const questions = await prisma.question.findMany({
      include: { round: { select: { name: true, category: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ questions: questions.map((q) => ({ ...q, options: JSON.parse(q.options) })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create question (admin only)
questionRoutes.post("/", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const body = createQuestionSchema.parse(req.body);
    if (body.correctAnswer >= body.options.length) {
      return res.status(400).json({ error: "correctAnswer index out of range" });
    }

    const question = await prisma.question.create({
      data: {
        text: body.text,
        options: JSON.stringify(body.options),
        correctAnswer: body.correctAnswer,
        timeLimit: body.timeLimit ?? 30,
        points: body.points ?? 10,
        roundId: body.roundId,
        order: body.order ?? 0,
      },
    });
    res.status(201).json({ question: { ...question, options: JSON.parse(question.options) } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update question (admin only)
questionRoutes.put("/:id", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const body = createQuestionSchema.partial().parse(req.body);
    const data: Record<string, unknown> = { ...body };
    if (body.options) data.options = JSON.stringify(body.options);

    const question = await prisma.question.update({
      where: { id: req.params.id as string },
      data: data as Parameters<typeof prisma.question.update>[0]["data"],
    });
    res.json({ question: { ...question, options: JSON.parse(question.options) } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete question (admin only)
questionRoutes.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
