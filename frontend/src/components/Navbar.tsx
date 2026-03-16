"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <nav className="bg-banditos-dark text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🌮</span>
            <span className="text-xl font-bold text-banditos-gold">Banditos Trivia</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/leaderboard" className="hover:text-banditos-gold transition-colors">
              Leaderboard
            </Link>

            {loading ? null : user ? (
              <>
                <Link href="/dashboard" className="hover:text-banditos-gold transition-colors">
                  Dashboard
                </Link>
                {user.role === "admin" && (
                  <Link href="/admin" className="hover:text-banditos-gold transition-colors">
                    Admin
                  </Link>
                )}
                <span className="text-sm text-gray-400">
                  {user.name}
                </span>
                <button
                  onClick={logout}
                  className="text-sm bg-banditos-red px-3 py-1 rounded hover:opacity-90 transition-opacity"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-banditos-red px-4 py-2 rounded font-medium hover:opacity-90 transition-opacity"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
