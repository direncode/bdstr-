import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// GET /api/profile?id=xxx — public player profile
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createServerSupabase();

  const { data: player } = await supabase
    .from("profiles")
    .select("id, display_name, total_points, games_played, best_streak")
    .eq("id", id)
    .maybeSingle();

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Calculate rank
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gt("total_points", player.total_points)
    .eq("is_admin", false);

  return NextResponse.json({
    player: {
      ...player,
      rank: (count || 0) + 1,
    },
  });
}
