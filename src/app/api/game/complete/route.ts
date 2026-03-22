import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { getGameState } from "@/lib/game-cache";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createServerSupabase();
  const profile = await getSession();
  if (!profile) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const gameState = await getGameState();
  if (!gameState.activeRoundId) return NextResponse.json({ error: "No active round" }, { status: 400 });

  // Check QR bonus early — QR players bypass busyness limit
  const cookieStore = await cookies();
  const qrCode = cookieStore.get("banditos_qr")?.value;
  let hasQr = false;

  if (qrCode) {
    const { data: qrSession } = await supabase
      .from("qr_sessions")
      .select("id")
      .eq("code", qrCode.toUpperCase())
      .eq("claimed_by", profile.id)
      .eq("is_active", true)
      .maybeSingle();
    if (qrSession) hasQr = true;
  }

  // QR players get all questions, others get busyness-limited
  const questions = hasQr ? gameState.questions : gameState.availableQuestions;
  if (!questions.length) return NextResponse.json({ error: "No questions" }, { status: 400 });

  const qIds = questions.map((q) => q.id as string);
  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .eq("player_id", profile.id)
    .in("question_id", qIds);

  const answerMap = new Map((answers || []).map((a) => [a.question_id, a]));
  const correctCount = (answers || []).filter((a) => a.is_correct).length;
  const totalQuestions = questions.length;
  const totalPoints = (answers || []).reduce((sum, a) => sum + (a.points as number), 0);

  // Calculate streak
  let currentStreak = 0;
  let maxStreak = 0;
  for (const q of questions) {
    const a = answerMap.get(q.id);
    if (a?.is_correct) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else { currentStreak = 0; }
  }

  let bonusPoints = 0;
  if (correctCount === totalQuestions && totalQuestions > 0) bonusPoints = 25;
  if (maxStreak >= 5) bonusPoints += 15;

  // Apply QR double points (in-store bonus) — already verified above
  let doublePoints = false;
  let doublePointsAdded = 0;

  if (hasQr) {
    doublePoints = true;
    // Double the earned points (question points + bonus)
    doublePointsAdded = totalPoints + bonusPoints;
  }

  const grandTotal = totalPoints + bonusPoints + doublePointsAdded;

  await supabase
    .from("profiles")
    .update({
      total_points: (profile.total_points || 0) + bonusPoints + doublePointsAdded,
      games_played: (profile.games_played || 0) + 1,
      best_streak: Math.max(profile.best_streak || 0, maxStreak),
    })
    .eq("id", profile.id);

  return NextResponse.json({
    correctCount, totalQuestions,
    totalPoints: grandTotal,
    bonusPoints, maxStreak,
    perfectRound: correctCount === totalQuestions,
    doublePoints,
    doublePointsAdded,
  });
}
