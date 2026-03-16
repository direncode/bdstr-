import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const playerId = req.cookies.get("player_id")?.value;
  if (!playerId) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { data: state } = await supabase.from("game_state").select("*").eq("id", "singleton").maybeSingle();
  if (!state?.active_round_id) return NextResponse.json({ error: "No active round" }, { status: 400 });

  // Get questions for the round
  const { data: questions } = await supabase
    .from("questions")
    .select("id, sort_order")
    .eq("round_id", state.active_round_id)
    .order("sort_order");

  if (!questions) return NextResponse.json({ error: "No questions" }, { status: 400 });

  // Get player's answers
  const qIds = questions.map((q) => q.id);
  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .eq("player_id", playerId)
    .in("question_id", qIds);

  const answerMap = new Map((answers || []).map((a) => [a.question_id, a]));

  const correctCount = (answers || []).filter((a) => a.is_correct).length;
  const totalQuestions = questions.length;
  const totalPoints = (answers || []).reduce((sum, a) => sum + a.points, 0);

  // Calculate streak
  let currentStreak = 0;
  let maxStreak = 0;
  for (const q of questions) {
    const a = answerMap.get(q.id);
    if (a?.is_correct) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // Bonuses
  let bonusPoints = 0;
  if (correctCount === totalQuestions && totalQuestions > 0) bonusPoints = 25;
  if (maxStreak >= 5) bonusPoints += 15;

  // Update player
  const { data: player } = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();
  if (player) {
    await supabase
      .from("players")
      .update({
        total_points: player.total_points + bonusPoints,
        games_played: player.games_played + 1,
        best_streak: Math.max(player.best_streak, maxStreak),
      })
      .eq("id", playerId);
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
