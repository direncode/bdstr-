import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/game — get game state (is unlocked? active round? current questions?)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const session = token ? verifyToken(token) : null;

  let state = await prisma.gameState.findUnique({ where: { id: "singleton" } });
  if (!state) {
    state = await prisma.gameState.create({ data: { id: "singleton" } });
  }

  if (!state.isUnlocked) {
    return NextResponse.json({ unlocked: false, round: null, questions: [] });
  }

  // Get active round with questions
  if (!state.activeRoundId) {
    return NextResponse.json({ unlocked: true, round: null, questions: [] });
  }

  const round = await prisma.round.findUnique({
    where: { id: state.activeRoundId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!round) {
    return NextResponse.json({ unlocked: true, round: null, questions: [] });
  }

  // Get user's existing answers for this round
  let answeredIds: string[] = [];
  if (session) {
    const answers = await prisma.answer.findMany({
      where: {
        userId: session.userId,
        questionId: { in: round.questions.map((q) => q.id) },
      },
      select: { questionId: true },
    });
    answeredIds = answers.map((a) => a.questionId);
  }

  // Return questions WITHOUT correct answer (players shouldn't see it)
  const questions = round.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: JSON.parse(q.options),
    points: q.points,
    order: q.order,
    answered: answeredIds.includes(q.id),
  }));

  return NextResponse.json({
    unlocked: true,
    round: { id: round.id, name: round.name, category: round.category },
    questions,
  });
}

// POST /api/game — submit answer
export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const session = verifyToken(token);
  if (!session) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { questionId, selected } = await req.json();
  if (!questionId || selected === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Check not already answered
  const existing = await prisma.answer.findUnique({
    where: { userId_questionId: { userId: session.userId, questionId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already answered", isCorrect: existing.isCorrect, points: existing.points });
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const isCorrect = selected === question.correctAnswer;
  const points = isCorrect ? question.points : 0;

  // Save answer
  await prisma.answer.create({
    data: { userId: session.userId, questionId, selected, isCorrect, points },
  });

  // Update user points
  if (points > 0) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { totalPoints: { increment: points } },
    });
  }

  return NextResponse.json({
    isCorrect,
    points,
    correctAnswer: question.correctAnswer,
  });
}
