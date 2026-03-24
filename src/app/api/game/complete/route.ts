import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { getGameState } from "@/lib/game-cache";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Parse QR cookie — returns { code, type } or null
async function parseQrCookie(): Promise<{ code: string; type: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("banditos_qr")?.value;
  if (!raw) return null;
  const parts = raw.split(":");
  return { code: parts[0], type: parts[1] || "inside" };
}

export async function POST() {
  const supabase = await createServerSupabase();
  const profile = await getSession();
  if (!profile) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const gameState = await getGameState();
  if (!gameState.activeRoundId) return NextResponse.json({ error: "No active round" }, { status: 400 });

  // Check QR bonus and determine multiplier
  const qrInfo = await parseQrCookie();
  let qrType = "none";
  let multiplier = 1;

  if (qrInfo) {
    if (qrInfo.type === "outside") {
      // Verify outside code exists
      const { data: session } = await supabase
        .from("qr_sessions")
        .select("id")
        .eq("code", qrInfo.code.toUpperCase())
        .eq("is_active", true)
        .eq("qr_type", "outside")
        .maybeSingle();
      if (session) { qrType = "outside"; multiplier = 1; }
    } else {
      // Inside or trivia_night — must be claimed by this player
      const { data: session } = await supabase
        .from("qr_sessions")
        .select("id, qr_type")
        .eq("code", qrInfo.code.toUpperCase())
        .eq("claimed_by", profile.id)
        .eq("is_active", true)
        .maybeSingle();
      if (session) {
        qrType = session.qr_type || qrInfo.type;
        multiplier = qrType === "trivia_night" ? 3 : qrType === "inside" ? 2 : 1;
      }
    }
  }

  // QR inside/trivia_night bypass busyness limit
  const bypassBusyness = multiplier >= 2;
  const questions = bypassBusyness ? gameState.questions : gameState.availableQuestions;
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
  const basePoints = correctCount; // 1 point per correct answer

  // Calculate streak
  let currentStreak = 0;
  let maxStreak = 0;
  for (const q of questions) {
    const a = answerMap.get(q.id);
    if (a?.is_correct) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else { currentStreak = 0; }
  }

  // Apply multiplier bonus (extra points beyond base)
  const bonusPoints = basePoints * (multiplier - 1);
  const grandTotal = basePoints + bonusPoints;

  await supabase
    .from("profiles")
    .update({
      total_points: (profile.total_points || 0) + bonusPoints,
      games_played: (profile.games_played || 0) + 1,
      best_streak: Math.max(profile.best_streak || 0, maxStreak),
    })
    .eq("id", profile.id);

  return NextResponse.json({
    correctCount,
    totalQuestions,
    totalPoints: grandTotal,
    maxStreak,
    perfectRound: correctCount === totalQuestions,
    qrType,
    multiplier,
    bonusPoints,
  });
}
