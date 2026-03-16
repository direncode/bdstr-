# Banditos Trivia - Campus Trivia Loyalty Platform

A real-time trivia platform for Bandidos Mexican Restaurant in Chapel Hill, NC. Players answer questions live via WebSocket, earn points, compete on leaderboards, and see live restaurant busyness data.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript + Prisma ORM + Socket.io
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: SQLite (MVP) — easily swappable to PostgreSQL via Prisma
- **Real-time**: Socket.io for live trivia game flow

## Project Structure

```
banditos-trivia/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database models
│   │   └── seed.ts            # 30 sample questions + demo users
│   └── src/
│       ├── server.ts           # Express + Socket.io entry point
│       ├── routes/
│       │   ├── auth.ts         # Register/Login/Me (JWT)
│       │   ├── questions.ts    # CRUD (admin only)
│       │   ├── rounds.ts       # CRUD + status management
│       │   ├── leaderboard.ts  # All-time, weekly, loser of night
│       │   ├── busyness.ts     # Google Places / simulated busyness
│       │   ├── credits.ts      # Point & credit history
│       │   └── admin.ts        # Settings, users, stats, award credits
│       ├── middleware/auth.ts   # JWT auth + admin guard
│       ├── services/busyness.ts # Google Places integration + caching
│       ├── socket/game.ts       # Real-time trivia game engine
│       └── utils/prisma.ts      # Prisma client singleton
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx         # Homepage (busyness bar, top players, hero)
│       │   ├── login/page.tsx   # Login/Register
│       │   ├── leaderboard/page.tsx  # Public leaderboard
│       │   ├── dashboard/page.tsx    # Player dashboard + live game
│       │   └── admin/page.tsx        # Admin panel (questions, rounds, live control)
│       ├── components/
│       │   ├── Navbar.tsx
│       │   └── BusynessBar.tsx
│       └── lib/
│           ├── api.ts           # API client + types
│           ├── socket.ts        # Socket.io client
│           └── auth-context.tsx  # React auth context
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm

### 1. Backend Setup

```bash
cd backend
npm install
npx prisma db push        # Create database tables
npm run db:seed            # Seed with demo data (30 questions, demo users)
npm run dev                # Starts on http://localhost:3001
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev                # Starts on http://localhost:3000
```

### 3. Demo Accounts

| Role   | Email              | Password   |
|--------|--------------------|------------|
| Admin  | admin@banditos.com | admin123   |
| Player | alice@unc.edu      | player123  |
| Player | bob@unc.edu        | player123  |

## Google Places API Setup

The app shows **live busyness data** for Bandidos Mexican Restaurant. Without an API key, it uses realistic time-based simulation.

### To enable real Google data:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable the **Places API (New)**
3. Create an API key and restrict it to the Places API
4. Add to `backend/.env`:
   ```
   GOOGLE_PLACES_API_KEY=your-key-here
   BANDIDOS_PLACE_ID=ChIJa2uJKhXvrIkRPSl2p9e3KKc
   ```

The Place ID `ChIJa2uJKhXvrIkRPSl2p9e3KKc` is for Bandidos Mexican Restaurant on Franklin Street, Chapel Hill.

> **Note**: Google's official API doesn't expose "Popular Times" / live busyness directly. The integration checks open/closed status and uses that as a signal, falling back to intelligent time-based simulation. For production, consider a third-party popular times scraping service.

## Environment Variables

### Backend (`backend/.env`)

| Variable              | Description                      | Default                |
|-----------------------|----------------------------------|------------------------|
| `DATABASE_URL`        | Prisma database URL              | `file:./dev.db`        |
| `JWT_SECRET`          | Secret for signing JWTs          | (change in prod!)      |
| `GOOGLE_PLACES_API_KEY` | Google Places API key          | (optional)             |
| `BANDIDOS_PLACE_ID`   | Google Place ID for Bandidos     | `ChIJa2uJ...`         |
| `PORT`                | Backend port                     | `3001`                 |
| `FRONTEND_URL`        | CORS origin for frontend         | `http://localhost:3000`|

### Frontend (`frontend/.env.local`)

| Variable               | Description           | Default                |
|------------------------|-----------------------|------------------------|
| `NEXT_PUBLIC_API_URL`  | Backend API URL       | `http://localhost:3001`|
| `NEXT_PUBLIC_WS_URL`   | WebSocket server URL  | `http://localhost:3001`|

## Features

### Real-time Trivia
- Admin starts rounds and pushes questions live
- Players see questions instantly via WebSocket
- Timed answers with speed bonuses
- Live answer count tracking

### Loyalty System
- **Points**: 10 per correct answer + speed bonuses + first-correct bonus
- **Streaks**: Track current and longest answer streaks
- **Credits**: Separate currency for future perks (awarded by admin)
- **Badges**: "Trivia Titan" (1000+ pts), "Streak Master" (10+ streak)

### Leaderboard
- All-time top 10 (public)
- Weekly top 10 (public)
- "Loser of the night" with funny punishment text (toggleable)

### Live Busyness
- Real-time bar showing how busy Bandidos is
- Cached every 15 minutes
- Falls back to smart time/day simulation

### Admin Panel
- Overview: user stats, player list
- Questions: add/delete with multiple choice
- Rounds: create, start, end
- Live: push questions to players in real-time
- Settings: toggle punishments, edit punishment text

## Deployment Suggestion

**Frontend**: Deploy to [Vercel](https://vercel.com) — zero-config for Next.js. Set environment variables in dashboard.

**Backend**: Deploy to [Railway](https://railway.app) or [Render](https://render.com). For production, swap SQLite for PostgreSQL by changing the Prisma datasource to `provider = "postgresql"` and setting `DATABASE_URL` to a Neon/Supabase/Railway Postgres connection string. Add a Procfile or start command: `npm run build && npm start`. Socket.io works out of the box on Railway/Render with WebSocket support enabled.
