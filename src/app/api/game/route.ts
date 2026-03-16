import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/game — game state + questions for active round
export async function GET(req: NextRequest) {
  const playerId = req.cookies.get("player_id")?.value;

  const { data: state } = await supabase.from("game_state").select("*").eq("id", "singleton").maybeSingle();

  if (!state?.is_unlocked) {
    return NextResponse.json({ unlocked: false, round: null, questions: [] });
  }

  if (!state.active_round_id) {
    return NextResponse.json({ unlocked: true, round: null, questions: [] });
  }

  const { data: round } = await supabase.from("rounds").select("*").eq("id", state.active_round_id).maybeSingle();
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("round_id", state.active_round_id)
    .order("sort_order");

  // Get player's existing answers
  let answeredIds: string[] = [];
  if (playerId && questions) {
    const qIds = questions.map((q) => q.id);
    const { data: answers } = await supabase
      .from("answers")
      .select("question_id")
      .eq("player_id", playerId)
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
export async function POST(req: NextRequest) {
  const playerId = req.cookies.get("player_id")?.value;
  if (!playerId) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { questionId, selected } = await req.json();
  // selected is 0-3 index, map to A-D
  const letter = ["A", "B", "C", "D"][selected];
  if (!letter) return NextResponse.json({ error: "Invalid selection" }, { status: 400 });

  // Check not already answered
  const { data: existing } = await supabase
    .from("answers")
    .select("id, is_correct, points")
    .eq("player_id", playerId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already answered", isCorrect: existing.is_correct, points: existing.points });
  }

  // Get question
  const { data: question } = await supabase.from("questions").select("*").eq("id", questionId).maybeSingle();
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const isCorrect = letter === question.correct;
  const points = isCorrect ? question.points : 0;

  // Save answer
  await supabase.from("answers").insert({
    player_id: playerId,
    question_id: questionId,
    selected: letter,
    is_correct: isCorrect,
    points,
  });

  // Update player points
  if (points > 0) {
    const { data: player } = await supabase.from("players").select("total_points").eq("id", playerId).maybeSingle();
    await supabase
      .from("players")
      .update({ total_points: (player?.total_points || 0) + points })
      .eq("id", playerId);
  }

  // Map correct answer back to index
  const correctIndex = ["A", "B", "C", "D"].indexOf(question.correct);

  return NextResponse.json({ isCorrect, points, correctAnswer: correctIndex });
}
