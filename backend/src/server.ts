import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketServer } from "socket.io";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import { authRoutes } from "./routes/auth";
import { questionRoutes } from "./routes/questions";
import { roundRoutes } from "./routes/rounds";
import { leaderboardRoutes } from "./routes/leaderboard";
import { busynessRoutes } from "./routes/busyness";
import { creditRoutes } from "./routes/credits";
import { adminRoutes } from "./routes/admin";
import { setupSocket } from "./socket/game";
import { startBusynessPoller } from "./services/busyness";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/rounds", roundRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/busyness", busynessRoutes);
app.use("/api/credits", creditRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// WebSocket
setupSocket(io);

// Start busyness poller (every 15 min)
startBusynessPoller();

const PORT = parseInt(process.env.PORT || "3001", 10);
server.listen(PORT, () => {
  console.log(`🌮 Banditos Trivia API running on port ${PORT}`);
});

export { io };
