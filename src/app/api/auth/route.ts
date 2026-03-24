import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession, setSession, clearSession, generateToken, hashPassword, verifyPassword } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/auth — get current user profile
export async function GET() {
  const profile = await getSession();
  return NextResponse.json({ profile });
}

// POST /api/auth — register or login (display_name + password)
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { mode, name, password } = await req.json();

  if (!name?.trim() || !password) {
    return NextResponse.json({ error: "Display name and password required" }, { status: 400 });
  }

  const trimmedName = name.trim();

  if (mode === "register") {
    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }

    // Check if display name is taken
    const { data: existingName } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", trimmedName)
      .maybeSingle();

    if (existingName) {
      return NextResponse.json({ error: "That display name is already taken" }, { status: 400 });
    }

    const token = generateToken();
    const pwHash = await hashPassword(password);

    const { data: profile, error } = await supabase
      .from("profiles")
      .insert({
        display_name: trimmedName,
        password_hash: pwHash,
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

  if (mode === "login") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("display_name", trimmedName)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "No account with that name" }, { status: 400 });
    }

    const valid = await verifyPassword(password, profile.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Wrong password" }, { status: 400 });
    }

    // Refresh session token
    const token = generateToken();
    await supabase
      .from("profiles")
      .update({ session_token: token })
      .eq("id", profile.id);

    await setSession(token);
    return NextResponse.json({ profile });
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
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
