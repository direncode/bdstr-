# Banditos Trivia

Live trivia app for Bandidos Mexican Cafe, Chapel Hill NC.

## Setup (5 minutes)

### 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project (free)
2. Open **SQL Editor** → paste `supabase/setup.sql` → click **RUN**
3. Go to **Authentication → Settings → Email** → turn OFF "Confirm email" (so players can sign up instantly)

### 2. Deploy to Vercel

1. Push this repo to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Add these env vars (from Supabase → Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — done!

### 3. Create an admin account

1. Sign up on the app with your email
2. In Supabase → Table Editor → `profiles` → set `is_admin` to `true` for your row

## Edit questions

Open **Supabase → Table Editor → questions** — works like Google Sheets.

## How it works

1. **Splash** → Logo + Enter
2. **Sign Up / Log In** → Email + password (permanent account via Supabase Auth)
3. **Gate** → Locked until admin opens it
4. **Trivia** → Questions one at a time, answer and earn points
5. **Results** → Score, streak, bonuses
6. **Leaderboard** → Ranked with level tiers

## Levels

| Level | Points |
|-------|--------|
| 🌱 Newbie | 0 |
| 🌮 Regular | 50 |
| 🥉 Bronze | 150 |
| 🥈 Silver | 300 |
| 🥇 Gold | 500 |
| 💎 Platinum | 1,000 |
| 👑 Diamond | 2,000 |
| 🔥 Legend | 5,000 |
