import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { getGameState } from "@/lib/game-cache";

export const dynamic = "force-dynamic";

// GET /api/game — game state + questions for active round
export async function GET() {
  const [profile, gameState] = await Promise.all([
    getSession(),
    getGameState(),
  ]);

  if (!gameState.unlocked) {
    return NextResponse.json({ unlocked: false, round: null, questions: [] });
  }

  if (!gameState.round) {
    return NextResponse.json({ unlocked: true, round: null, questions: [] });
  }

  // Get user's existing answers (only DB call that varies per-user)
  let answeredIds: string[] = [];
  if (profile && gameState.questions.length > 0) {
    const supabase = await createServerSupabase();
    const qIds = gameState.questions.map((q) => q.id);
    const { data: answers } = await supabase
      .from("answers")
      .select("question_id")
      .eq("player_id", profile.id)
      .in("question_id", qIds);
    answeredIds = (answers || []).map((a) => a.question_id as string);
  }

  return NextResponse.json({
    unlocked: true,
    round: gameState.round,
    questions: gameState.questions.map((q) => ({
      id: q.id,
      text: q.question,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      points: q.points,
      order: q.sort_order,
      answered: answeredIds.includes(q.id as string),
    })),
  });
}

// POST /api/game — submit answer
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const profile = await getSession();
  if (!profile) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { questionId, selected } = await req.json();
  const letter = ["A", "B", "C", "D"][selected];
  if (!letter) return NextResponse.json({ error: "Invalid selection" }, { status: 400 });

  // Check not already answered
  const { data: existing } = await supabase
    .from("answers")
    .select("id, is_correct, points")
    .eq("player_id", profile.id)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already answered", isCorrect: existing.is_correct, points: existing.points });
  }

  // Use cached questions instead of another DB call
  const gameState = await getGameState();
  const question = gameState.questions.find((q) => q.id === questionId);
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const isCorrect = letter === question.correct;
  const points = isCorrect ? (question.points as number) : 0;

  // Save answer
  const { error: ansError } = await supabase.from("answers").insert({
    player_id: profile.id,
    question_id: questionId,
    selected: letter,
    is_correct: isCorrect,
    points,
  });

  if (ansError) {
    console.error("Answer insert error:", ansError);
    return NextResponse.json({ error: ansError.message }, { status: 500 });
  }

  // Update player points (fire and forget for speed)
  if (points > 0) {
    supabase
      .from("profiles")
      .update({ total_points: (profile.total_points || 0) + points })
      .eq("id", profile.id)
      .then(() => {});
  }

  const correctIndex = ["A", "B", "C", "D"].indexOf(question.correct as string);
  return NextResponse.json({ isCorrect, points, correctAnswer: correctIndex });
}
