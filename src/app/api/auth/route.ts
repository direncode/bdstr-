import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

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

// POST /api/auth — sign up or sign in
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const body = await req.json();
  const { mode, email, password, displayName } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (mode === "register") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email.split("@")[0] } },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Wait briefly for the profile trigger, then fetch profile
    let profile = null;
    for (let i = 0; i < 3; i++) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user?.id)
        .maybeSingle();
      if (p) { profile = p; break; }
      await new Promise((r) => setTimeout(r, 500));
    }

    return NextResponse.json({ user: data.user, profile });
  }

  if (mode === "login") {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    return NextResponse.json({ user: data.user, profile });
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}

// DELETE /api/auth — sign out
export async function DELETE() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
