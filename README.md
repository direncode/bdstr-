# Banditos Trivia

Live trivia app for Bandidos Mexican Cafe, Chapel Hill NC. Powered by Supabase — edit questions like a spreadsheet.

## Setup (5 minutes)

### 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project (free)
2. Open **SQL Editor** → paste the contents of `supabase/setup.sql` → click **RUN**
3. That's it — 28 questions, 4 rounds, and demo players are seeded

### 2. Get your keys

In Supabase Dashboard → **Settings** → **API**:
- Copy **Project URL** and **anon public** key

### 3. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import → select the repo
3. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
4. Deploy!

### Or run locally

```bash
npm install
# Create .env.local with your Supabase keys (see above)
npm run dev
```

## How to edit questions

Open your **Supabase Dashboard → Table Editor → questions table**.
It works just like Google Sheets — click any cell to edit, add rows, delete rows.

| Column | What it is |
|--------|-----------|
| question | The question text |
| option_a | Answer A |
| option_b | Answer B |
| option_c | Answer C |
| option_d | Answer D |
| correct | Which is right: A, B, C, or D |
| round_id | Which round it belongs to |
| points | Points awarded (default 10) |

## App Flow

1. **Splash** → Bandidos logo, ENTER button
2. **Login** → Name + 4-digit PIN (dead simple, no email)
3. **Gate** → Locked until admin unlocks it
4. **Trivia** → Questions one at a time, tap to answer
5. **Results** → Score, streak, bonus points
6. **Leaderboard** → Ranked by points with level tiers

## Admin

Login as **Trivia Host** / PIN: **0000**

- Toggle game lock/unlock
- Pick which round is active
- Reset answers to replay a round
- Preview all questions

## Levels

| Level | Points needed |
|-------|--------------|
| 🌱 Newbie | 0 |
| 🌮 Regular | 50 |
| 🥉 Bronze | 150 |
| 🥈 Silver | 300 |
| 🥇 Gold | 500 |
| 💎 Platinum | 1,000 |
| 👑 Diamond | 2,000 |
| 🔥 Legend | 5,000 |
