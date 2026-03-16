import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: players } = await supabase
    .from("players")
    .select("id, name, total_points, games_played, best_streak")
    .eq("is_admin", false)
    .order("total_points", { ascending: false })
    .limit(50);

  return NextResponse.json({ leaderboard: players || [] });
}
