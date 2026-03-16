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

// POST /api/auth — sign up or sign in (name + password, no email needed)
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("placeholder")) {
    return NextResponse.json({
      error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel environment variables, then redeploy.",
    }, { status: 500 });
  }

  const supabase = await createServerSupabase();
  const body = await req.json();
  const { mode, name, password } = body;

  if (!name || !password) {
    return NextResponse.json({ error: "Name and password required" }, { status: 400 });
  }

  // Generate a fake email from the name (Supabase Auth requires email)
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (mode === "register") {
    // Use slug + random suffix to avoid collisions
    const suffix = Math.random().toString(36).slice(2, 8);
    const fakeEmail = `${slug}_${suffix}@banditos-trivia.com`;

    const { data, error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
      options: { data: { display_name: name } },
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
    // Look up the profile by display_name to find the auto-generated email
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("display_name", name)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "No account found with that name" }, { status: 400 });
    }

    // Sign in using the stored email
    const { data, error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });
    if (error) return NextResponse.json({ error: "Wrong password" }, { status: 400 });

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
