import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { data: state } = await supabase
    .from("game_state")
    .select("*")
    .eq("id", "singleton")
    .maybeSingle();
  if (!state?.active_round_id) return NextResponse.json({ error: "No active round" }, { status: 400 });

  const { data: questions } = await supabase
    .from("questions")
    .select("id, sort_order")
    .eq("round_id", state.active_round_id)
    .order("sort_order");

  if (!questions) return NextResponse.json({ error: "No questions" }, { status: 400 });

  const qIds = questions.map((q) => q.id);
  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .eq("player_id", user.id)
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
    if (a?.is_correct) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else { currentStreak = 0; }
  }

  let bonusPoints = 0;
  if (correctCount === totalQuestions && totalQuestions > 0) bonusPoints = 25;
  if (maxStreak >= 5) bonusPoints += 15;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    await supabase
      .from("profiles")
      .update({
        total_points: profile.total_points + bonusPoints,
        games_played: profile.games_played + 1,
        best_streak: Math.max(profile.best_streak, maxStreak),
      })
      .eq("id", user.id);
  }

  return NextResponse.json({
    correctCount, totalQuestions,
    totalPoints: totalPoints + bonusPoints,
    bonusPoints, maxStreak,
    perfectRound: correctCount === totalQuestions,
  });
}
