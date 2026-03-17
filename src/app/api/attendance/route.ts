import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/attendance — search players + get recent attendance log
export async function GET(req: Request) {
  const profile = await getSession();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const supabase = await createServerSupabase();

  // Search players by name
  let players: Record<string, unknown>[] = [];
  if (query && query.trim()) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, total_points, games_played")
      .ilike("display_name", `%${query.trim()}%`)
      .eq("is_admin", false)
      .order("display_name")
      .limit(20);
    players = data || [];
  }

  // Recent attendance entries (last 50)
  const { data: logs } = await supabase
    .from("attendance_log")
    .select("id, player_id, points_added, note, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Get player names for log display
  const playerIds = [...new Set((logs || []).map((l) => l.player_id))];
  let playerNames: Record<string, string> = {};
  if (playerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", playerIds);
    playerNames = Object.fromEntries((profiles || []).map((p) => [p.id, p.display_name]));
  }

  const logsWithNames = (logs || []).map((l) => ({
    ...l,
    player_name: playerNames[l.player_id as string] || "Unknown",
  }));

  return NextResponse.json({ players, logs: logsWithNames });
}

// POST /api/attendance — add double points for a player
export async function POST(req: Request) {
  const profile = await getSession();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { playerId, basePoints, note } = await req.json();
  if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });

  const base = basePoints || 10; // default base points
  const doublePoints = base * 2;
  const supabase = await createServerSupabase();

  // Get current player
  const { data: player } = await supabase
    .from("profiles")
    .select("id, display_name, total_points")
    .eq("id", playerId)
    .maybeSingle();

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Add double points
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ total_points: (player.total_points as number) + doublePoints })
    .eq("id", playerId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Create attendance log
  const { error: logErr } = await supabase.from("attendance_log").insert({
    player_id: playerId,
    admin_id: profile.id,
    points_added: doublePoints,
    note: note || `Double points (${base} x2) for in-person attendance`,
  });

  if (logErr) console.error("Attendance log error:", logErr);

  return NextResponse.json({
    ok: true,
    playerName: player.display_name,
    pointsAdded: doublePoints,
    newTotal: (player.total_points as number) + doublePoints,
  });
}
