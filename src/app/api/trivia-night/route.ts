import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Helpers
function getTuesdayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getTuesdayDate(now: Date): string {
  return now.toISOString().split("T")[0];
}

function isTuesdayWindow(now: Date): boolean {
  const day = now.getDay();
  const hour = now.getHours();
  return day === 2 && hour >= 19 && hour < 21;
}

// GET /api/trivia-night
export async function GET(req: Request) {
  const supabase = await createServerSupabase();
  const profile = await getSession();
  const { searchParams } = new URL(req.url);
  const isAdminReq = searchParams.get("admin") === "true";

  const now = new Date();
  const isWindow = isTuesdayWindow(now);

  // Admin: get active night with all check-ins and their round scores
  if (isAdminReq) {
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const { data: night } = await supabase
      .from("trivia_nights")
      .select("*")
      .eq("is_active", true)
      .order("night_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!night) {
      return NextResponse.json({ night: null, checkins: [], isWindow });
    }

    // Get all check-ins with player names
    const { data: checkins } = await supabase
      .from("trivia_night_checkins")
      .select("id, player_id, has_qr_bonus, points_awarded, checked_in_at")
      .eq("night_id", night.id)
      .order("checked_in_at", { ascending: true });

    // Get player names
    const playerIds = (checkins || []).map((c) => c.player_id);
    let playerMap: Record<string, string> = {};
    if (playerIds.length > 0) {
      const { data: players } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", playerIds);
      playerMap = Object.fromEntries((players || []).map((p) => [p.id, p.display_name]));
    }

    // Get all round scores for these check-ins
    const checkinIds = (checkins || []).map((c) => c.id);
    let scoresMap: Record<string, { round_number: number; round_label: string; score: number }[]> = {};
    if (checkinIds.length > 0) {
      const { data: scores } = await supabase
        .from("trivia_night_scores")
        .select("checkin_id, round_number, round_label, score")
        .in("checkin_id", checkinIds)
        .order("round_number", { ascending: true });

      for (const s of scores || []) {
        if (!scoresMap[s.checkin_id]) scoresMap[s.checkin_id] = [];
        scoresMap[s.checkin_id].push({ round_number: s.round_number, round_label: s.round_label, score: s.score });
      }
    }

    return NextResponse.json({
      night,
      checkins: (checkins || []).map((c) => ({
        ...c,
        player_name: playerMap[c.player_id] || "Unknown",
        round_scores: scoresMap[c.id] || [],
      })),
      isWindow,
    });
  }

  // Player: get check-in status for current window
  if (!isWindow) {
    return NextResponse.json({ isWindow: false, night: null, checkedIn: false });
  }

  const today = getTuesdayDate(now);
  const { data: night } = await supabase
    .from("trivia_nights")
    .select("id, week_label, is_active, is_closed")
    .eq("night_date", today)
    .maybeSingle();

  if (!night || night.is_closed) {
    return NextResponse.json({ isWindow: true, night: null, checkedIn: false });
  }

  let checkedIn = false;
  let hasQrBonus = false;
  if (profile) {
    const { data: checkin } = await supabase
      .from("trivia_night_checkins")
      .select("id, has_qr_bonus")
      .eq("night_id", night.id)
      .eq("player_id", profile.id)
      .maybeSingle();
    if (checkin) {
      checkedIn = true;
      hasQrBonus = checkin.has_qr_bonus;
    }
  }

  return NextResponse.json({
    isWindow: true,
    night: { id: night.id, label: night.week_label, isActive: night.is_active },
    checkedIn,
    hasQrBonus,
  });
}

// POST /api/trivia-night
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const profile = await getSession();
  if (!profile) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ========== PLAYER: CHECK IN ==========
  if (action === "checkin") {
    // Find any active night (admin may have opened it at any time)
    const { data: activeNight } = await supabase
      .from("trivia_nights")
      .select("id")
      .eq("is_active", true)
      .eq("is_closed", false)
      .order("night_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeNight) {
      return NextResponse.json({ error: "No active Trivia Night session" }, { status: 404 });
    }

    // Check for QR bonus cookie
    const cookieStore = await cookies();
    const qrCode = cookieStore.get("banditos_qr")?.value;
    let hasQrBonus = false;

    if (qrCode) {
      const { data: qrSession } = await supabase
        .from("qr_sessions")
        .select("id")
        .eq("code", qrCode.toUpperCase())
        .eq("claimed_by", profile.id)
        .eq("is_active", true)
        .maybeSingle();
      if (qrSession) hasQrBonus = true;
    }

    // Insert check-in (ignore duplicate)
    const { error } = await supabase
      .from("trivia_night_checkins")
      .upsert({
        night_id: activeNight.id,
        player_id: profile.id,
        has_qr_bonus: hasQrBonus,
      }, { onConflict: "night_id,player_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, hasQrBonus });
  }

  // ========== ADMIN ACTIONS ==========
  if (!profile.is_admin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  // Open tonight's session
  if (action === "open-night") {
    const now = new Date();
    const today = getTuesdayDate(now);
    const label = getTuesdayLabel(now);

    const { data: existing } = await supabase
      .from("trivia_nights")
      .select("id")
      .eq("night_date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("trivia_nights")
        .update({ is_active: true, is_closed: false })
        .eq("id", existing.id);
      return NextResponse.json({ ok: true, nightId: existing.id });
    }

    const { data: night, error } = await supabase
      .from("trivia_nights")
      .insert({ week_label: `Trivia Night — ${label}`, night_date: today })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, nightId: night.id });
  }

  // Award round score to a checked-in player
  if (action === "award-round-score") {
    const { checkinId, roundNumber, roundLabel, score } = body;
    if (!checkinId || typeof roundNumber !== "number" || typeof score !== "number" || score < 0) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    // Verify the check-in exists and has QR bonus (must be linked to QR)
    const { data: checkin } = await supabase
      .from("trivia_night_checkins")
      .select("id, player_id, has_qr_bonus")
      .eq("id", checkinId)
      .single();

    if (!checkin) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });

    // Get existing score for this round (to calculate delta)
    const { data: existingScore } = await supabase
      .from("trivia_night_scores")
      .select("score")
      .eq("checkin_id", checkinId)
      .eq("round_number", roundNumber)
      .maybeSingle();

    const previousScore = existingScore?.score || 0;
    const multiplier = checkin.has_qr_bonus ? 3 : 1;
    const finalScore = score * multiplier;
    const previousFinal = previousScore * multiplier;
    const pointsDelta = finalScore - previousFinal;

    // Upsert the round score (store base score, multiplier applied on total)
    await supabase
      .from("trivia_night_scores")
      .upsert({
        checkin_id: checkinId,
        round_number: roundNumber,
        round_label: roundLabel || `Round ${roundNumber}`,
        score,
      }, { onConflict: "checkin_id,round_number" });

    // Recalculate total points_awarded on check-in
    const { data: allScores } = await supabase
      .from("trivia_night_scores")
      .select("score")
      .eq("checkin_id", checkinId);

    const totalBase = (allScores || []).reduce((sum, s) => sum + s.score, 0);
    const totalFinal = totalBase * multiplier;

    await supabase
      .from("trivia_night_checkins")
      .update({ points_awarded: totalFinal })
      .eq("id", checkinId);

    // Update player's total points with the delta
    if (pointsDelta !== 0) {
      const { data: player } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("id", checkin.player_id)
        .single();

      await supabase
        .from("profiles")
        .update({ total_points: Math.max(0, (player?.total_points || 0) + pointsDelta) })
        .eq("id", checkin.player_id);
    }

    return NextResponse.json({ ok: true, baseScore: score, multiplier, finalScore, pointsDelta, totalAwarded: totalFinal });
  }

  // Legacy: Award points (single value) to a checked-in player
  if (action === "award-points") {
    const { checkinId, points } = body;
    if (!checkinId || typeof points !== "number" || points < 0) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { data: checkin } = await supabase
      .from("trivia_night_checkins")
      .select("id, player_id, has_qr_bonus, points_awarded")
      .eq("id", checkinId)
      .single();

    if (!checkin) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });

    const multiplier = checkin.has_qr_bonus ? 3 : 1;
    const finalPoints = points * multiplier;
    const previousAward = checkin.points_awarded || 0;
    const pointsDelta = finalPoints - previousAward;

    await supabase
      .from("trivia_night_checkins")
      .update({ points_awarded: finalPoints })
      .eq("id", checkinId);

    if (pointsDelta !== 0) {
      const { data: player } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("id", checkin.player_id)
        .single();

      await supabase
        .from("profiles")
        .update({ total_points: Math.max(0, (player?.total_points || 0) + pointsDelta) })
        .eq("id", checkin.player_id);
    }

    return NextResponse.json({ ok: true, basePoints: points, multiplier, finalPoints, pointsDelta });
  }

  // Close the night
  if (action === "close-night") {
    const { nightId } = body;
    await supabase
      .from("trivia_nights")
      .update({ is_active: false, is_closed: true })
      .eq("id", nightId);

    // Reset all QR claims for next time
    await supabase
      .from("qr_sessions")
      .update({ claimed_by: null, claimed_at: null })
      .eq("is_active", true);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
