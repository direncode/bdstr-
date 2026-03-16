import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

async function getAdminSupabase() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, error: "Not logged in" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return { supabase: null, error: "Not admin" };
  return { supabase, error: null };
}

export async function GET() {
  const { supabase, error } = await getAdminSupabase();
  if (!supabase) return NextResponse.json({ error }, { status: 403 });

  const [{ data: state }, { data: rounds }, { data: allQuestions }] = await Promise.all([
    supabase.from("game_state").select("*").eq("id", "singleton").maybeSingle(),
    supabase.from("rounds").select("*").order("sort_order"),
    supabase.from("questions").select("*").order("sort_order"),
  ]);

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

export async function POST(req: Request) {
  const { supabase, error } = await getAdminSupabase();
  if (!supabase) return NextResponse.json({ error }, { status: 403 });

  const body = await req.json();

  if (body.action === "toggle-unlock") {
    const { data: state } = await supabase.from("game_state").select("is_unlocked").eq("id", "singleton").maybeSingle();
    const newVal = !(state?.is_unlocked ?? false);
    await supabase.from("game_state").update({ is_unlocked: newVal, updated_at: new Date().toISOString() }).eq("id", "singleton");
    return NextResponse.json({ isUnlocked: newVal });
  }

  if (body.action === "set-round") {
    await supabase.from("game_state").update({ active_round_id: body.roundId || null, updated_at: new Date().toISOString() }).eq("id", "singleton");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reset-answers") {
    const { data: state } = await supabase.from("game_state").select("active_round_id").eq("id", "singleton").maybeSingle();
    if (state?.active_round_id) {
      const { data: questions } = await supabase.from("questions").select("id").eq("round_id", state.active_round_id);
      if (questions && questions.length > 0) {
        await supabase.from("answers").delete().in("question_id", questions.map((q) => q.id));
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
