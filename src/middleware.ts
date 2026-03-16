import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Simple pass-through — session is handled via httpOnly cookie in API routes
  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
