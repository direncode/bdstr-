import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// GET /api/game — game state + questions for active round
export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: state } = await supabase
    .from("game_state")
    .select("*")
    .eq("id", "singleton")
    .maybeSingle();

  if (!state?.is_unlocked) {
    return NextResponse.json({ unlocked: false, round: null, questions: [] });
  }

  if (!state.active_round_id) {
    return NextResponse.json({ unlocked: true, round: null, questions: [] });
  }

  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", state.active_round_id)
    .maybeSingle();

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("round_id", state.active_round_id)
    .order("sort_order");

  // Get user's existing answers
  let answeredIds: string[] = [];
  if (user && questions) {
    const qIds = questions.map((q) => q.id);
    const { data: answers } = await supabase
      .from("answers")
      .select("question_id")
      .eq("player_id", user.id)
      .in("question_id", qIds);
    answeredIds = (answers || []).map((a) => a.question_id);
  }

  return NextResponse.json({
    unlocked: true,
    round: round || null,
    questions: (questions || []).map((q) => ({
      id: q.id,
      text: q.question,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      points: q.points,
      order: q.sort_order,
      answered: answeredIds.includes(q.id),
    })),
  });
}

// POST /api/game — submit answer
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { questionId, selected } = await req.json();
  const letter = ["A", "B", "C", "D"][selected];
  if (!letter) return NextResponse.json({ error: "Invalid selection" }, { status: 400 });

  // Check not already answered
  const { data: existing } = await supabase
    .from("answers")
    .select("id, is_correct, points")
    .eq("player_id", user.id)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already answered", isCorrect: existing.is_correct, points: existing.points });
  }

  // Get question
  const { data: question } = await supabase
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const isCorrect = letter === question.correct;
  const points = isCorrect ? question.points : 0;

  // Save answer
  const { error: ansError } = await supabase.from("answers").insert({
    player_id: user.id,
    question_id: questionId,
    selected: letter,
    is_correct: isCorrect,
    points,
  });

  if (ansError) {
    console.error("Answer insert error:", ansError);
    return NextResponse.json({ error: ansError.message }, { status: 500 });
  }

  // Update player points
  if (points > 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_points")
      .eq("id", user.id)
      .maybeSingle();
    await supabase
      .from("profiles")
      .update({ total_points: (profile?.total_points || 0) + points })
      .eq("id", user.id);
  }

  const correctIndex = ["A", "B", "C", "D"].indexOf(question.correct);
  return NextResponse.json({ isCorrect, points, correctAnswer: correctIndex });
}
