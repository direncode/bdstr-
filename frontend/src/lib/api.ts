const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type FetchOptions = RequestInit & { token?: string };

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, name: string, password: string) =>
    apiFetch<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, name, password }),
    }),
  me: (token: string) => apiFetch<{ user: User }>("/api/auth/me", { token }),
};

// Leaderboard
export const leaderboard = {
  allTime: () => apiFetch<{ leaderboard: LeaderboardEntry[] }>("/api/leaderboard/all-time"),
  weekly: () => apiFetch<{ leaderboard: LeaderboardEntry[] }>("/api/leaderboard/weekly"),
  loser: () => apiFetch<LoserData>("/api/leaderboard/loser"),
};

// Busyness
export const busyness = {
  get: () => apiFetch<BusynessData>("/api/busyness"),
};

// Admin
export const admin = {
  stats: (token: string) => apiFetch<AdminStats>("/api/admin/stats", { token }),
  settings: (token: string) => apiFetch<{ settings: AppSettings }>("/api/admin/settings", { token }),
  updateSettings: (token: string, data: Partial<AppSettings>) =>
    apiFetch<{ settings: AppSettings }>("/api/admin/settings", {
      token,
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  users: (token: string) => apiFetch<{ users: User[] }>("/api/admin/users", { token }),
  awardCredits: (token: string, userId: string, amount: number, reason: string) =>
    apiFetch("/api/admin/award-credits", {
      token,
      method: "POST",
      body: JSON.stringify({ userId, amount, reason }),
    }),
};

// Questions & Rounds
export const questions = {
  list: (token: string) => apiFetch<{ questions: Question[] }>("/api/questions", { token }),
  create: (token: string, data: CreateQuestionData) =>
    apiFetch<{ question: Question }>("/api/questions", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (token: string, id: string) =>
    apiFetch("/api/questions/" + id, { token, method: "DELETE" }),
};

export const rounds = {
  list: () => apiFetch<{ rounds: Round[] }>("/api/rounds"),
  create: (token: string, data: { name: string; category: string; order?: number }) =>
    apiFetch<{ round: Round }>("/api/rounds", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateStatus: (token: string, id: string, status: string) =>
    apiFetch<{ round: Round }>(`/api/rounds/${id}/status`, {
      token,
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// Credits
export const credits = {
  history: (token: string) => apiFetch<{ balance: number; transactions: CreditTransaction[] }>("/api/credits", { token }),
  points: (token: string) => apiFetch<{ totalPoints: number; transactions: PointTransaction[] }>("/api/credits/points", { token }),
};

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  totalPoints?: number;
  totalCredits?: number;
  currentStreak?: number;
  longestStreak?: number;
  badges?: Badge[];
}

export interface Badge {
  type: string;
  name: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  totalPoints?: number;
  weeklyPoints?: number;
  currentStreak?: number;
  longestStreak?: number;
  badges?: Badge[];
}

export interface BusynessData {
  busynessPercent: number;
  label: string;
  message: string;
  updatedAt: string;
  source: string;
}

export interface LoserData {
  enabled: boolean;
  loser: { id: string; name: string } | null;
  score?: number;
  punishmentText: string | null;
}

export interface AdminStats {
  totalUsers: number;
  totalQuestions: number;
  totalRounds: number;
  totalAnswers: number;
}

export interface AppSettings {
  enablePunishments: boolean;
  punishmentText: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
  points: number;
  roundId: string;
  round?: { name: string; category: string };
}

export interface Round {
  id: string;
  name: string;
  category: string;
  status: string;
  order: number;
  questions?: { id: string; text: string; order: number }[];
}

export interface CreateQuestionData {
  text: string;
  options: string[];
  correctAnswer: number;
  roundId: string;
  timeLimit?: number;
  points?: number;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface PointTransaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}
