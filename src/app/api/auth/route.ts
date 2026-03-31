import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession, setSession, clearSession, generateToken } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/auth — get current user profile
export async function GET() {
  const profile = await getSession();
  return NextResponse.json({ profile });
}

// POST /api/auth — sign in with email only (auto-registers if new)
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  // Check if account exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", trimmedEmail)
    .maybeSingle();

  if (existing) {
    // Log in existing user
    const token = generateToken();
    await supabase
      .from("profiles")
      .update({ session_token: token })
      .eq("id", existing.id);

    await setSession(token);
    return NextResponse.json({ profile: existing });
  }

  // Register new user — use email prefix as display name
  const displayName = trimmedEmail.split("@")[0];
  const token = generateToken();

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      email: trimmedEmail,
      display_name: displayName,
      session_token: token,
    })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await setSession(token);
  return NextResponse.json({ profile });
}

// DELETE /api/auth — sign out
export async function DELETE() {
  const profile = await getSession();
  if (profile) {
    const supabase = await createServerSupabase();
    await supabase
      .from("profiles")
      .update({ session_token: null })
      .eq("id", profile.id);
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
