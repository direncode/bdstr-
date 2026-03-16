import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// GET /api/auth — get current user + profile
export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ user: null, profile: null });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ user, profile });
}

// DELETE /api/auth — sign out
export async function DELETE() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
