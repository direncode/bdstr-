import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  const session = verifyToken(token);
  if (!session || session.role !== "admin") return null;
  return session;
}

// GET /api/admin — get game state + rounds
export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [state, rounds] = await Promise.all([
    prisma.gameState.findUnique({ where: { id: "singleton" } }),
    prisma.round.findMany({ include: { questions: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } }),
  ]);

  return NextResponse.json({
    isUnlocked: state?.isUnlocked ?? false,
    activeRoundId: state?.activeRoundId ?? null,
    rounds: rounds.map((r) => ({
      ...r,
      questions: r.questions.map((q) => ({ ...q, options: JSON.parse(q.options) })),
    })),
  });
}

// POST /api/admin — toggle unlock, set active round
export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  if (action === "toggle-unlock") {
    const state = await prisma.gameState.findUnique({ where: { id: "singleton" } });
    const updated = await prisma.gameState.upsert({
      where: { id: "singleton" },
      update: { isUnlocked: !(state?.isUnlocked ?? false) },
      create: { id: "singleton", isUnlocked: true },
    });
    return NextResponse.json({ isUnlocked: updated.isUnlocked });
  }

  if (action === "set-round") {
    const { roundId } = body;
    await prisma.gameState.upsert({
      where: { id: "singleton" },
      update: { activeRoundId: roundId || null },
      create: { id: "singleton", activeRoundId: roundId || null },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reset-answers") {
    // Clear all answers for the active round (restart game)
    const state = await prisma.gameState.findUnique({ where: { id: "singleton" } });
    if (state?.activeRoundId) {
      const round = await prisma.round.findUnique({
        where: { id: state.activeRoundId },
        include: { questions: { select: { id: true } } },
      });
      if (round) {
        await prisma.answer.deleteMany({
          where: { questionId: { in: round.questions.map((q) => q.id) } },
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
