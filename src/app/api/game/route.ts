import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { getGameState } from "@/lib/game-cache";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Normalize text for comparison: lowercase, trim, strip punctuation
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

// Parse QR cookie — returns { code, type } or null
async function parseQrCookie(): Promise<{ code: string; type: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("banditos_qr")?.value;
  if (!raw) return null;
  // Format: "CODE:type" or legacy "CODE" (defaults to inside)
  const parts = raw.split(":");
  return { code: parts[0], type: parts[1] || "inside" };
}

// Check if current player has a valid QR bonus, returns the type
async function getQrBonus(profileId: string): Promise<{ hasQr: boolean; qrType: string }> {
  const qrInfo = await parseQrCookie();
  if (!qrInfo) return { hasQr: false, qrType: "none" };

  const supabase = await createServerSupabase();

  // Outside codes don't get claimed, just check if code exists and is active
  if (qrInfo.type === "outside") {
    const { data: session } = await supabase
      .from("qr_sessions")
      .select("id")
      .eq("code", qrInfo.code.toUpperCase())
      .eq("is_active", true)
      .eq("qr_type", "outside")
      .maybeSingle();
    return { hasQr: !!session, qrType: "outside" };
  }

  // Inside and trivia_night codes must be claimed by this player
  const { data: session } = await supabase
    .from("qr_sessions")
    .select("id, qr_type")
    .eq("code", qrInfo.code.toUpperCase())
    .eq("claimed_by", profileId)
    .eq("is_active", true)
    .maybeSingle();

  if (!session) return { hasQr: false, qrType: "none" };
  return { hasQr: true, qrType: session.qr_type || qrInfo.type };
}

// Multiplier per QR type
function getMultiplier(qrType: string): number {
  switch (qrType) {
    case "outside": return 1;
    case "inside": return 2;
    case "trivia_night": return 3;
    default: return 1;
  }
}

// GET /api/game — game state + questions
export async function GET() {
  const [profile, gameState] = await Promise.all([
    getSession(),
    getGameState(),
  ]);

  if (!gameState.unlocked) {
    return NextResponse.json({ unlocked: false, round: null, questions: [], busyness: null });
  }

  if (!gameState.round) {
    return NextResponse.json({ unlocked: true, round: null, questions: [], busyness: null });
  }

  // Inside/trivia_night QR players bypass busyness limit
  const qrBonus = profile ? await getQrBonus(profile.id) : { hasQr: false, qrType: "none" };
  const bypassBusyness = qrBonus.hasQr && qrBonus.qrType !== "outside";
  const questions = bypassBusyness ? gameState.questions : gameState.availableQuestions;

  // Get user's existing answers
  let answeredIds: string[] = [];
  if (profile && questions.length > 0) {
    const supabase = await createServerSupabase();
    const qIds = questions.map((q) => q.id);
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
    questions: questions.map((q) => ({
      id: q.id,
      text: q.question,
      points: 1,
      order: q.sort_order,
      answered: answeredIds.includes(q.id as string),
    })),
    todaysRounds: gameState.todaysRounds,
    busyness: {
      percent: gameState.busynessPercent,
      questionsAllowed: bypassBusyness ? gameState.questions.length : Math.min(gameState.questionsAllowed, gameState.questions.length),
      totalInRound: gameState.questions.length,
      qrBypass: bypassBusyness,
    },
    qrBonus: qrBonus.hasQr ? { type: qrBonus.qrType, multiplier: getMultiplier(qrBonus.qrType) } : null,
  });
}

// POST /api/game — submit answer
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const profile = await getSession();
  if (!profile) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { questionId, answer } = await req.json();
  if (!answer || typeof answer !== "string") {
    return NextResponse.json({ error: "Answer is required" }, { status: 400 });
  }

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

  // Verify question is in the available set
  const gameState = await getGameState();
  const qrBonus = await getQrBonus(profile.id);
  const bypassBusyness = qrBonus.hasQr && qrBonus.qrType !== "outside";
  const allowedQuestions = bypassBusyness ? gameState.questions : gameState.availableQuestions;
  const question = allowedQuestions.find((q) => q.id === questionId);
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const isCorrect = normalize(answer) === normalize(question.answer as string);
  const points = isCorrect ? 1 : 0;

  // Save answer
  const { error: ansError } = await supabase.from("answers").insert({
    player_id: profile.id,
    question_id: questionId,
    submitted: answer.trim(),
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

  return NextResponse.json({
    isCorrect,
    points,
    correctAnswer: question.answer as string,
  });
}
