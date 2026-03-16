import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, verifyToken } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({ email: z.string().email(), password: z.string() });
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50),
  password: z.string().min(6),
});

// POST /api/auth — login or register
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action; // "login" | "register"

    if (action === "register") {
      const data = registerSchema.parse(body);
      const exists = await prisma.user.findUnique({ where: { email: data.email } });
      if (exists) return NextResponse.json({ error: "Email taken" }, { status: 409 });

      const user = await prisma.user.create({
        data: { email: data.email, name: data.name, passwordHash: await bcrypt.hash(data.password, 10) },
      });
      const token = signToken(user.id, user.role);
      const res = NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
      res.cookies.set("token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 86400, path: "/" });
      return res;
    }

    // Login
    const data = loginSchema.parse(body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const token = signToken(user.id, user.role);
    const res = NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
    res.cookies.set("token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 86400, path: "/" });
    return res;
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/auth — get current user
export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ user: null });

  const session = verifyToken(token);
  if (!session) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, totalPoints: true, gamesPlayed: true, bestStreak: true },
  });
  return NextResponse.json({ user });
}

// DELETE /api/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", { maxAge: 0, path: "/" });
  return res;
}
