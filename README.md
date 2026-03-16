# Banditos Trivia

Live trivia app for Bandidos Mexican Restaurant, Chapel Hill NC.

## Flow

1. **Splash** — Banditos logo + Enter
2. **Login/Register** — email + password
3. **Unlock Gate** — locked until host opens it (or auto-unlock based on busyness)
4. **Trivia** — questions one at a time from the DB, earn points per correct answer
5. **Results** — score, streak, bonus points
6. **Leaderboard** — tiered levels (Newbie → Regular → Bronze → Silver → Gold → Platinum → Diamond → Legend)

## Tech

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM (SQLite for dev, PostgreSQL for production)
- JWT auth via httpOnly cookies
- No WebSocket needed — simple stateless API

## Quick Start

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

**Demo accounts:**
- Admin: `admin@banditos.com` / `admin123`
- Player: `alice@unc.edu` / `player123`

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add a Postgres database (Neon free tier)
4. Change `prisma/schema.prisma` provider to `"postgresql"`
5. Set env vars: `DATABASE_URL`, `JWT_SECRET`
6. Vercel auto-runs `prisma generate` via the postinstall script
7. Run `npx prisma db push && npm run db:seed` against the production DB

## Admin Panel

Login as admin → Admin Panel:
- **Toggle Gate**: Lock/unlock trivia for players
- **Set Active Round**: Pick which round players see
- **Reset Answers**: Clear answers to restart a round
- **Preview Questions**: See all questions with correct answers highlighted
