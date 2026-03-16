import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function isAdmin(req: NextRequest): Promise<boolean> {
  const playerId = req.cookies.get("player_id")?.value;
  if (!playerId) return false;
  const { data } = await supabase.from("players").select("is_admin").eq("id", playerId).single();
  return data?.is_admin === true;
}

// GET /api/admin — game state + rounds
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ data: state }, { data: rounds }] = await Promise.all([
    supabase.from("game_state").select("*").eq("id", "singleton").single(),
    supabase.from("rounds").select("*").order("sort_order"),
  ]);

  // Get questions for each round
  const { data: allQuestions } = await supabase.from("questions").select("*").order("sort_order");

  const roundsWithQ = (rounds || []).map((r) => ({
    ...r,
    questions: (allQuestions || []).filter((q) => q.round_id === r.id),
  }));

  return NextResponse.json({
    isUnlocked: state?.is_unlocked ?? false,
    activeRoundId: state?.active_round_id ?? null,
    rounds: roundsWithQ,
  });
}

// POST /api/admin — actions
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  if (body.action === "toggle-unlock") {
    const { data: state } = await supabase.from("game_state").select("is_unlocked").eq("id", "singleton").single();
    const newVal = !(state?.is_unlocked ?? false);
    await supabase.from("game_state").update({ is_unlocked: newVal, updated_at: new Date().toISOString() }).eq("id", "singleton");
    return NextResponse.json({ isUnlocked: newVal });
  }

  if (body.action === "set-round") {
    await supabase
      .from("game_state")
      .update({ active_round_id: body.roundId || null, updated_at: new Date().toISOString() })
      .eq("id", "singleton");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reset-answers") {
    const { data: state } = await supabase.from("game_state").select("active_round_id").eq("id", "singleton").single();
    if (state?.active_round_id) {
      const { data: questions } = await supabase
        .from("questions")
        .select("id")
        .eq("round_id", state.active_round_id);
      if (questions && questions.length > 0) {
        await supabase.from("answers").delete().in("question_id", questions.map((q) => q.id));
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
