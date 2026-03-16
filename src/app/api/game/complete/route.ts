import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// POST /api/game/complete — mark game complete, calculate streak/bonus
export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const session = verifyToken(token);
  if (!session) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const state = await prisma.gameState.findUnique({ where: { id: "singleton" } });
  if (!state?.activeRoundId) {
    return NextResponse.json({ error: "No active round" }, { status: 400 });
  }

  // Get all user answers for this round
  const round = await prisma.round.findUnique({
    where: { id: state.activeRoundId },
    include: { questions: true },
  });
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

  const answers = await prisma.answer.findMany({
    where: {
      userId: session.userId,
      questionId: { in: round.questions.map((q) => q.id) },
    },
  });

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = round.questions.length;
  const totalPoints = answers.reduce((sum, a) => sum + a.points, 0);

  // Calculate streak (consecutive correct answers)
  const sortedAnswers = answers.sort((a, b) => {
    const qA = round.questions.find((q) => q.id === a.questionId);
    const qB = round.questions.find((q) => q.id === b.questionId);
    return (qA?.order || 0) - (qB?.order || 0);
  });

  let currentStreak = 0;
  let maxStreak = 0;
  for (const a of sortedAnswers) {
    if (a.isCorrect) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // Bonus: perfect round
  let bonusPoints = 0;
  if (correctCount === totalQuestions && totalQuestions > 0) {
    bonusPoints = 25;
  }
  // Bonus: 5+ streak
  if (maxStreak >= 5) {
    bonusPoints += 15;
  }

  if (bonusPoints > 0) {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        totalPoints: { increment: bonusPoints },
        gamesPlayed: { increment: 1 },
        bestStreak: { increment: 0 }, // handled below
      },
    });
  } else {
    await prisma.user.update({
      where: { id: session.userId },
      data: { gamesPlayed: { increment: 1 } },
    });
  }

  // Update best streak
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (user && maxStreak > user.bestStreak) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { bestStreak: maxStreak },
    });
  }

  return NextResponse.json({
    correctCount,
    totalQuestions,
    totalPoints: totalPoints + bonusPoints,
    bonusPoints,
    maxStreak,
    perfectRound: correctCount === totalQuestions,
  });
}
