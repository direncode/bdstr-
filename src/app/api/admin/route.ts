import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { invalidateGameCache } from "@/lib/game-cache";

export const dynamic = "force-dynamic";

async function getAdminSupabase() {
  const profile = await getSession();
  if (!profile) return { supabase: null, error: "Not logged in" };
  if (!profile.is_admin) return { supabase: null, error: "Not admin" };

  const supabase = await createServerSupabase();
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

  const roundsWithQ = (rounds || []).map((r: Record<string, unknown>) => ({
    ...r,
    questions: (allQuestions || []).filter((q: Record<string, unknown>) => q.round_id === r.id),
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

  // Invalidate cached game state after any admin action
  invalidateGameCache();

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
        await supabase.from("answers").delete().in("question_id", questions.map((q: Record<string, unknown>) => q.id));
      }
    }
    return NextResponse.json({ ok: true });
  }

  // --- Round CRUD ---
  if (body.action === "add-round") {
    const { name, category } = body;
    if (!name || !category) return NextResponse.json({ error: "Name and category required" }, { status: 400 });
    const { data: maxOrder } = await supabase.from("rounds").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const nextOrder = ((maxOrder?.sort_order as number) ?? 0) + 1;
    const { data, error: insertErr } = await supabase.from("rounds").insert({ name, category, sort_order: nextOrder }).select().maybeSingle();
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    return NextResponse.json({ round: data });
  }

  if (body.action === "edit-round") {
    const { roundId, name, category, scheduled_date } = body;
    if (!roundId) return NextResponse.json({ error: "roundId required" }, { status: 400 });
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (scheduled_date !== undefined) updates.scheduled_date = scheduled_date || null;
    const { error: updateErr } = await supabase.from("rounds").update(updates).eq("id", roundId);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Schedule a round to a specific date
  if (body.action === "schedule-round") {
    const { roundId, date } = body;
    if (!roundId) return NextResponse.json({ error: "roundId required" }, { status: 400 });
    const { error: updateErr } = await supabase.from("rounds").update({ scheduled_date: date || null }).eq("id", roundId);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete-round") {
    const { roundId } = body;
    if (!roundId) return NextResponse.json({ error: "roundId required" }, { status: 400 });
    const { error: delErr } = await supabase.from("rounds").delete().eq("id", roundId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // --- Question CRUD ---
  if (body.action === "add-question") {
    const { round_id, question, answer } = body;
    if (!round_id || !question || !answer) {
      return NextResponse.json({ error: "Question and answer required" }, { status: 400 });
    }
    const { data: maxOrder } = await supabase.from("questions").select("sort_order").eq("round_id", round_id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const nextOrder = ((maxOrder?.sort_order as number) ?? 0) + 1;
    const { data, error: insertErr } = await supabase.from("questions").insert({
      round_id, question, answer, sort_order: nextOrder,
    }).select().maybeSingle();
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    return NextResponse.json({ question: data });
  }

  if (body.action === "edit-question") {
    const { questionId, ...fields } = body;
    if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });
    const allowed = ["question", "answer", "round_id", "sort_order"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) updates[key] = fields[key];
    }
    const { error: updateErr } = await supabase.from("questions").update(updates).eq("id", questionId);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete-question") {
    const { questionId } = body;
    if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });
    const { error: delErr } = await supabase.from("questions").delete().eq("id", questionId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
