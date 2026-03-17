import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { generateApplePassJson, generateGoogleWalletSaveUrl, type PassData } from "@/lib/wallet";
import { getLevel } from "@/lib/levels";

export const dynamic = "force-dynamic";

// GET /api/wallet — get wallet card data + save URLs for current user
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

  const passData: PassData = {
    serialNumber: profile.id,
    playerName: profile.display_name,
    points: profile.total_points,
    rank,
    level: level.name,
    levelEmoji: level.emoji,
    profileUrl: `${baseUrl}/profile?id=${profile.id}`,
  };

  // Generate wallet card ID if not exists
  if (!profile.wallet_card_id) {
    const cardId = `banditos_${profile.id.slice(0, 8)}`;
    await supabase
      .from("profiles")
      .update({ wallet_card_id: cardId })
      .eq("id", profile.id);
  }

  // Apple pass JSON (not signed — needs cert for actual .pkpass)
  const applePass = generateApplePassJson(passData);

  // Google Wallet save URL (null if not configured)
  const googleSaveUrl = generateGoogleWalletSaveUrl(passData);

  // Check if wallets are configured
  const appleConfigured = !!(process.env.APPLE_PASS_TYPE_ID && process.env.APPLE_TEAM_ID);
  const googleConfigured = !!process.env.GOOGLE_WALLET_ISSUER_ID;

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.display_name,
      points: profile.total_points,
      gamesPlayed: profile.games_played,
      bestStreak: profile.best_streak,
      rank,
      level: level.name,
      levelEmoji: level.emoji,
    },
    applePass,
    appleConfigured,
    googleSaveUrl,
    googleConfigured,
    profileUrl: passData.profileUrl,
  });
}
