import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabase();

  const { data: players } = await supabase
    .from("profiles")
    .select("id, display_name, total_points, games_played, best_streak")
    .eq("is_admin", false)
    .order("total_points", { ascending: false })
    .limit(50);

  return NextResponse.json({ leaderboard: players || [] });
}
