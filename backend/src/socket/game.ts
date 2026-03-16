import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";

interface AuthSocket extends Socket {
  userId?: string;
  userName?: string;
}

// Track active game state
let activeQuestion: {
  questionId: string;
  roundId: string;
  startedAt: number;
  timeLimit: number;
} | null = null;

const answeredUsers = new Set<string>();

export function setupSocket(io: Server) {
  // Auth middleware for sockets
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret") as {
        userId: string;
        role: string;
      };
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket: AuthSocket) => {
    console.log(`Player connected: ${socket.userId}`);

    // Join a personal room for targeted messages
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      const user = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: { name: true },
      });
      socket.userName = user?.name;
    }

    // Admin starts a question
    socket.on("admin:start-question", async (data: { questionId: string }) => {
      try {
        const question = await prisma.question.findUnique({
          where: { id: data.questionId },
          include: { round: true },
        });
        if (!question) return;

        activeQuestion = {
          questionId: question.id,
          roundId: question.roundId,
          startedAt: Date.now(),
          timeLimit: question.timeLimit,
        };
        answeredUsers.clear();

        // Send question to all players (without correct answer)
        io.emit("game:question", {
          questionId: question.id,
          text: question.text,
          options: JSON.parse(question.options),
          timeLimit: question.timeLimit,
          points: question.points,
          roundName: question.round.name,
          category: question.round.category,
        });
      } catch (err) {
        console.error("start-question error:", err);
      }
    });

    // Player submits answer
    socket.on("player:answer", async (data: { questionId: string; selected: number }) => {
      if (!socket.userId || !activeQuestion) return;
      if (activeQuestion.questionId !== data.questionId) return;
      if (answeredUsers.has(socket.userId)) return;

      answeredUsers.add(socket.userId);
      const timeMs = Date.now() - activeQuestion.startedAt;

      // Check if within time limit
      if (timeMs > activeQuestion.timeLimit * 1000 + 1000) return; // 1s grace

      try {
        const question = await prisma.question.findUnique({
          where: { id: data.questionId },
        });
        if (!question) return;

        const isCorrect = data.selected === question.correctAnswer;
        let pointsEarned = 0;

        if (isCorrect) {
          pointsEarned = question.points;

          // Speed bonus: extra points for fast answers
          const speedRatio = 1 - timeMs / (question.timeLimit * 1000);
          if (speedRatio > 0.5) pointsEarned += Math.floor(question.points * 0.5);
          else if (speedRatio > 0.25) pointsEarned += Math.floor(question.points * 0.25);

          // First correct bonus
          const existingCorrect = await prisma.answer.count({
            where: { questionId: data.questionId, isCorrect: true },
          });
          if (existingCorrect === 0) {
            pointsEarned += 5; // First blood bonus
          }
        }

        // Save answer
        await prisma.answer.create({
          data: {
            userId: socket.userId,
            questionId: data.questionId,
            roundId: activeQuestion.roundId,
            selected: data.selected,
            isCorrect,
            timeMs,
            points: pointsEarned,
          },
        });

        if (pointsEarned > 0) {
          // Create point transaction
          const reasons: string[] = [];
          if (isCorrect) reasons.push("correct_answer");

          await prisma.pointTransaction.create({
            data: { userId: socket.userId, amount: pointsEarned, reason: reasons.join(",") },
          });

          // Update user stats
          const user = await prisma.user.findUnique({ where: { id: socket.userId } });
          if (user) {
            const newStreak = user.currentStreak + 1;
            await prisma.user.update({
              where: { id: socket.userId },
              data: {
                totalPoints: { increment: pointsEarned },
                currentStreak: newStreak,
                longestStreak: Math.max(newStreak, user.longestStreak),
              },
            });

            // Check for badges
            await checkAndAwardBadges(socket.userId, user.totalPoints + pointsEarned, newStreak);
          }
        } else {
          // Wrong answer — reset streak
          await prisma.user.update({
            where: { id: socket.userId },
            data: { currentStreak: 0 },
          });
        }

        // Notify the player of result
        socket.emit("game:answer-result", {
          questionId: data.questionId,
          isCorrect,
          pointsEarned,
          correctAnswer: question.correctAnswer,
        });

        // Notify admin of submission count
        io.emit("game:answer-count", {
          questionId: data.questionId,
          count: answeredUsers.size,
        });
      } catch (err) {
        console.error("answer error:", err);
      }
    });

    // Admin ends question and reveals answer
    socket.on("admin:end-question", async (data: { questionId: string }) => {
      try {
        const question = await prisma.question.findUnique({
          where: { id: data.questionId },
        });
        if (!question) return;

        const answers = await prisma.answer.findMany({
          where: { questionId: data.questionId },
          include: { user: { select: { name: true } } },
          orderBy: { timeMs: "asc" },
        });

        io.emit("game:question-results", {
          questionId: data.questionId,
          correctAnswer: question.correctAnswer,
          answers: answers.map((a) => ({
            userName: a.user.name,
            selected: a.selected,
            isCorrect: a.isCorrect,
            points: a.points,
            timeMs: a.timeMs,
          })),
        });

        activeQuestion = null;
        answeredUsers.clear();
      } catch (err) {
        console.error("end-question error:", err);
      }
    });

    // Live leaderboard
    socket.on("request:leaderboard", async () => {
      const top10 = await prisma.user.findMany({
        orderBy: { totalPoints: "desc" },
        take: 10,
        select: { id: true, name: true, totalPoints: true, currentStreak: true },
      });
      socket.emit("live:leaderboard", { leaderboard: top10 });
    });

    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.userId}`);
    });
  });
}

async function checkAndAwardBadges(userId: string, totalPoints: number, currentStreak: number) {
  const badges: Array<{ type: string; name: string }> = [];

  if (totalPoints >= 1000) badges.push({ type: "trivia_titan", name: "Trivia Titan" });
  if (currentStreak >= 10) badges.push({ type: "streak_master", name: "Streak Master" });

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { userId_type: { userId, type: badge.type } },
      update: {},
      create: { userId, type: badge.type, name: badge.name },
    });
  }
}
