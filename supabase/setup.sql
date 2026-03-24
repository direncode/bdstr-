-- ============================================================
-- BANDITOS TRIVIA — Paste this into Supabase SQL Editor → RUN
-- ============================================================

-- 1. PROFILES (standalone — no Supabase Auth needed)
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  display_name text not null unique,
  password_hash text not null,
  session_token text,
  is_admin boolean default false,
  total_points int default 0,
  games_played int default 0,
  best_streak int default 0,
  wallet_card_id text,
  created_at timestamptz default now()
);

-- Index for fast session lookups (every API request checks this)
create index if not exists idx_profiles_session_token on profiles(session_token) where session_token is not null;

-- Index for fast display_name lookups (login)
create index if not exists idx_profiles_display_name on profiles(display_name);

-- Index for fast email lookups (login)
create index if not exists idx_profiles_email on profiles(email);

-- 2. ROUNDS (can be scheduled to specific dates for weekly planning)
create table if not exists rounds (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  sort_order int default 0,
  scheduled_date date  -- NULL = unscheduled, set to a date to auto-activate that day
);

-- 3. QUESTIONS (text-based: question + answer, 1 point each)
create table if not exists questions (
  id uuid default gen_random_uuid() primary key,
  round_id uuid references rounds(id) on delete cascade,
  question text not null,
  answer text not null,
  points int default 1,
  sort_order int default 0
);

-- 4. ANSWERS
create table if not exists answers (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references profiles(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  submitted text not null,
  is_correct boolean not null,
  points int default 0,
  created_at timestamptz default now(),
  unique(player_id, question_id)
);

-- 5. ATTENDANCE LOG (manual double points)
create table if not exists attendance_log (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references profiles(id) on delete cascade,
  admin_id uuid references profiles(id),
  points_added int not null default 0,
  note text,
  created_at timestamptz default now()
);

-- 6. GAME STATE (singleton)
create table if not exists game_state (
  id text primary key default 'singleton',
  is_unlocked boolean default false,
  active_round_id uuid references rounds(id),
  updated_at timestamptz default now()
);

insert into game_state (id, is_unlocked) values ('singleton', false) on conflict do nothing;

-- ============================================================
-- ROW LEVEL SECURITY — Allow all operations via anon key
-- (auth is handled by our app, not Supabase Auth)
-- ============================================================
alter table profiles enable row level security;
alter table rounds enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table attendance_log enable row level security;
alter table game_state enable row level security;

-- Allow all operations (our server handles auth via session cookies)
create policy "Allow all on profiles" on profiles for all using (true) with check (true);
create policy "Allow all on rounds" on rounds for all using (true) with check (true);
create policy "Allow all on questions" on questions for all using (true) with check (true);
create policy "Allow all on answers" on answers for all using (true) with check (true);
create policy "Allow all on attendance_log" on attendance_log for all using (true) with check (true);
create policy "Allow all on game_state" on game_state for all using (true) with check (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Rounds
insert into rounds (id, name, category, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Government & Laws', 'government', 1),
  ('22222222-2222-2222-2222-222222222222', 'SG History', 'sg_history', 2),
  ('33333333-3333-3333-3333-333333333333', 'Past SBPs', 'past_sbps', 3),
  ('44444444-4444-4444-4444-444444444444', 'Wildcard', 'wildcard', 4);

-- Government & Laws
insert into questions (round_id, question, answer, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'How many branches of the U.S. federal government are there?', '3', 1),
  ('11111111-1111-1111-1111-111111111111', 'What is the minimum age to be elected President?', '35', 2),
  ('11111111-1111-1111-1111-111111111111', 'Which amendment abolished slavery?', '13th', 3),
  ('11111111-1111-1111-1111-111111111111', 'How many justices serve on the U.S. Supreme Court?', '9', 4),
  ('11111111-1111-1111-1111-111111111111', 'What is the term length for a U.S. Senator?', '6 years', 5),
  ('11111111-1111-1111-1111-111111111111', 'Which document begins with We the People?', 'U.S. Constitution', 6),
  ('11111111-1111-1111-1111-111111111111', 'What is the supreme law of the land?', 'The Constitution', 7);

-- SG History
insert into questions (round_id, question, answer, sort_order) values
  ('22222222-2222-2222-2222-222222222222', 'What does SG stand for in campus governance?', 'Student Government', 1),
  ('22222222-2222-2222-2222-222222222222', 'In what year was UNCs Student Government founded?', '1904', 2),
  ('22222222-2222-2222-2222-222222222222', 'What is the legislative body of UNC Student Government?', 'Student Congress', 3),
  ('22222222-2222-2222-2222-222222222222', 'Which campus newspaper covers SG elections at UNC?', 'Daily Tar Heel', 4),
  ('22222222-2222-2222-2222-222222222222', 'How often are UNC SBP elections held?', 'Annually', 5),
  ('22222222-2222-2222-2222-222222222222', 'What are UNCs school colors?', 'Carolina Blue and White', 6),
  ('22222222-2222-2222-2222-222222222222', 'Where is UNCs SG office located?', 'Frank Porter Graham Student Union', 7),
  ('22222222-2222-2222-2222-222222222222', 'What is UNC SGs judiciary branch called?', 'Student Supreme Court', 8);

-- Past SBPs
insert into questions (round_id, question, answer, sort_order) values
  ('33333333-3333-3333-3333-333333333333', 'What does SBP stand for?', 'Student Body President', 1),
  ('33333333-3333-3333-3333-333333333333', 'How many students typically vote in UNC SBP elections?', '5,000-8,000', 2),
  ('33333333-3333-3333-3333-333333333333', 'What is a common SBP campaign promise?', 'Better mental health resources', 3),
  ('33333333-3333-3333-3333-333333333333', 'How long is a UNC SBPs term?', 'One year', 4),
  ('33333333-3333-3333-3333-333333333333', 'Can a UNC SBP serve more than one term?', 'Up to two terms', 5),
  ('33333333-3333-3333-3333-333333333333', 'Where does the SBP meet with the Chancellor?', 'South Building', 6);

-- Wildcard
insert into questions (round_id, question, answer, sort_order) values
  ('44444444-4444-4444-4444-444444444444', 'What is UNCs mascot?', 'Rameses', 1),
  ('44444444-4444-4444-4444-444444444444', 'What street is Bandidos on in Chapel Hill?', 'Franklin St', 2),
  ('44444444-4444-4444-4444-444444444444', 'In what year was UNC Chapel Hill founded?', '1789', 3),
  ('44444444-4444-4444-4444-444444444444', 'What is Chapel Hills nickname?', 'Southern Part of Heaven', 4),
  ('44444444-4444-4444-4444-444444444444', 'How many NCAA Mens Basketball championships has UNC won?', '6', 5),
  ('44444444-4444-4444-4444-444444444444', 'Which UNC alum is considered the basketball GOAT?', 'Michael Jordan', 6),
  ('44444444-4444-4444-4444-444444444444', 'What is the traditional UNC cheer?', 'Go Heels!', 7);

-- 7. QR SESSIONS (physical presence gating)
create table if not exists qr_sessions (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  name text not null,
  claimed_by uuid references profiles(id) on delete set null,
  claimed_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_qr_sessions_code on qr_sessions(code);

alter table qr_sessions enable row level security;
create policy "Allow all on qr_sessions" on qr_sessions for all using (true) with check (true);

-- 8. TRIVIA NIGHTS (weekly paper trivia sessions)
create table if not exists trivia_nights (
  id uuid default gen_random_uuid() primary key,
  week_label text not null,
  night_date date not null,
  is_active boolean default true,
  is_closed boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_trivia_nights_date on trivia_nights(night_date);

-- 9. TRIVIA NIGHT CHECK-INS
create table if not exists trivia_night_checkins (
  id uuid default gen_random_uuid() primary key,
  night_id uuid references trivia_nights(id) on delete cascade,
  player_id uuid references profiles(id) on delete cascade,
  has_qr_bonus boolean default false,
  points_awarded int default 0,
  checked_in_at timestamptz default now(),
  unique(night_id, player_id)
);

-- 10. TRIVIA NIGHT SCORES (per-round scoring linked to check-in)
create table if not exists trivia_night_scores (
  id uuid default gen_random_uuid() primary key,
  checkin_id uuid references trivia_night_checkins(id) on delete cascade,
  round_number int not null,
  round_label text not null default '',
  score int not null default 0,
  created_at timestamptz default now(),
  unique(checkin_id, round_number)
);

alter table trivia_nights enable row level security;
alter table trivia_night_checkins enable row level security;
alter table trivia_night_scores enable row level security;
create policy "Allow all on trivia_nights" on trivia_nights for all using (true) with check (true);
create policy "Allow all on trivia_night_checkins" on trivia_night_checkins for all using (true) with check (true);
create policy "Allow all on trivia_night_scores" on trivia_night_scores for all using (true) with check (true);

-- ============================================================
-- To make yourself admin: go to Table Editor → profiles →
-- set is_admin to true for your row
-- ============================================================
