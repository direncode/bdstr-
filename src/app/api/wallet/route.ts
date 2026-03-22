import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { getLevel } from "@/lib/levels";

export const dynamic = "force-dynamic";

// GET /api/wallet — get loyalty card data for current user
export async function GET() {
  const profile = await getSession();
  if (!profile) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const supabase = await createServerSupabase();

  // Calculate rank
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gt("total_points", profile.total_points)
    .eq("is_admin", false);
  const rank = (count || 0) + 1;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://bandidostrivia.com";
  const level = getLevel(profile.total_points);

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.display_name,
      points: profile.total_points,
      gamesPlayed: profile.games_played,
      bestStreak: profile.best_streak,
      rank,
      level: level.name,
      levelBadge: level.badge,
    },
    profileUrl: `${baseUrl}/profile?id=${profile.id}`,
  });
}
