-- ============================================================
-- BANDITOS TRIVIA — Paste this into Supabase SQL Editor → RUN
-- ============================================================

-- 1. PROFILES (standalone — no Supabase Auth needed)
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  display_name text not null unique,
  password_hash text not null,
  session_token text,
  is_admin boolean default false,
  total_points int default 0,
  games_played int default 0,
  best_streak int default 0,
  created_at timestamptz default now()
);

-- 2. ROUNDS
create table if not exists rounds (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  sort_order int default 0
);

-- 3. QUESTIONS
create table if not exists questions (
  id uuid default gen_random_uuid() primary key,
  round_id uuid references rounds(id) on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct text not null check (correct in ('A','B','C','D')),
  points int default 10,
  sort_order int default 0
);

-- 4. ANSWERS
create table if not exists answers (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references profiles(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  selected text not null,
  is_correct boolean not null,
  points int default 0,
  created_at timestamptz default now(),
  unique(player_id, question_id)
);

-- 5. GAME STATE (singleton)
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
alter table game_state enable row level security;

-- Allow all operations (our server handles auth via session cookies)
create policy "Allow all on profiles" on profiles for all using (true) with check (true);
create policy "Allow all on rounds" on rounds for all using (true) with check (true);
create policy "Allow all on questions" on questions for all using (true) with check (true);
create policy "Allow all on answers" on answers for all using (true) with check (true);
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
insert into questions (round_id, question, option_a, option_b, option_c, option_d, correct, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'How many branches of the U.S. federal government are there?', '2', '3', '4', '5', 'B', 1),
  ('11111111-1111-1111-1111-111111111111', 'What is the minimum age to be elected President?', '25', '30', '35', '40', 'C', 2),
  ('11111111-1111-1111-1111-111111111111', 'Which amendment abolished slavery?', '12th', '13th', '14th', '15th', 'B', 3),
  ('11111111-1111-1111-1111-111111111111', 'How many justices serve on the U.S. Supreme Court?', '7', '9', '11', '12', 'B', 4),
  ('11111111-1111-1111-1111-111111111111', 'What is the term length for a U.S. Senator?', '2 years', '4 years', '6 years', '8 years', 'C', 5),
  ('11111111-1111-1111-1111-111111111111', 'Which document begins with We the People?', 'Declaration of Independence', 'Bill of Rights', 'U.S. Constitution', 'Articles of Confederation', 'C', 6),
  ('11111111-1111-1111-1111-111111111111', 'What is the supreme law of the land?', 'Bill of Rights', 'The Constitution', 'Federal Statutes', 'Executive Orders', 'B', 7);

-- SG History
insert into questions (round_id, question, option_a, option_b, option_c, option_d, correct, sort_order) values
  ('22222222-2222-2222-2222-222222222222', 'What does SG stand for in campus governance?', 'Student Group', 'Student Government', 'School Governance', 'Senate Group', 'B', 1),
  ('22222222-2222-2222-2222-222222222222', 'In what year was UNCs Student Government founded?', '1897', '1904', '1923', '1945', 'B', 2),
  ('22222222-2222-2222-2222-222222222222', 'What is the legislative body of UNC Student Government?', 'Student Senate', 'Student Congress', 'Student Assembly', 'Student Council', 'B', 3),
  ('22222222-2222-2222-2222-222222222222', 'Which campus newspaper covers SG elections at UNC?', 'Tar Heel Times', 'Daily Tar Heel', 'Carolina Journal', 'Blue Review', 'B', 4),
  ('22222222-2222-2222-2222-222222222222', 'How often are UNC SBP elections held?', 'Every semester', 'Annually', 'Every 2 years', 'Every 4 years', 'B', 5),
  ('22222222-2222-2222-2222-222222222222', 'What are UNCs school colors?', 'Blue and Gold', 'Carolina Blue and White', 'Navy and Silver', 'Royal Blue and Red', 'B', 6),
  ('22222222-2222-2222-2222-222222222222', 'Where is UNCs SG office located?', 'Davis Library', 'Frank Porter Graham Student Union', 'South Building', 'Hamilton Hall', 'B', 7),
  ('22222222-2222-2222-2222-222222222222', 'What is UNC SGs judiciary branch called?', 'Student Supreme Court', 'Honor Court', 'Student Judiciary', 'Campus Court', 'A', 8);

-- Past SBPs
insert into questions (round_id, question, option_a, option_b, option_c, option_d, correct, sort_order) values
  ('33333333-3333-3333-3333-333333333333', 'What does SBP stand for?', 'Student Board President', 'Student Body President', 'Student Bureau President', 'Senate Board President', 'B', 1),
  ('33333333-3333-3333-3333-333333333333', 'How many students typically vote in UNC SBP elections?', '500-1,000', '2,000-5,000', '5,000-8,000', '10,000+', 'C', 2),
  ('33333333-3333-3333-3333-333333333333', 'What is a common SBP campaign promise?', 'Free textbooks', 'Better mental health resources', 'Canceling classes', 'Free parking', 'B', 3),
  ('33333333-3333-3333-3333-333333333333', 'How long is a UNC SBPs term?', 'One semester', 'One year', 'Two years', 'Until graduation', 'B', 4),
  ('33333333-3333-3333-3333-333333333333', 'Can a UNC SBP serve more than one term?', 'Unlimited terms', 'Up to two terms', 'One term only', 'Depends on year', 'B', 5),
  ('33333333-3333-3333-3333-333333333333', 'Where does the SBP meet with the Chancellor?', 'Wilson Library', 'South Building', 'Dean Dome', 'Morehead Planetarium', 'B', 6);

-- Wildcard
insert into questions (round_id, question, option_a, option_b, option_c, option_d, correct, sort_order) values
  ('44444444-4444-4444-4444-444444444444', 'What is UNCs mascot?', 'Rameses', 'Brutus', 'Bucky', 'Smokey', 'A', 1),
  ('44444444-4444-4444-4444-444444444444', 'What street is Bandidos on in Chapel Hill?', 'Columbia St', 'Franklin St', 'Henderson St', 'Rosemary St', 'B', 2),
  ('44444444-4444-4444-4444-444444444444', 'In what year was UNC Chapel Hill founded?', '1776', '1789', '1795', '1801', 'B', 3),
  ('44444444-4444-4444-4444-444444444444', 'What is Chapel Hills nickname?', 'Southern Part of Heaven', 'The Hill', 'Blue City', 'Tar Town', 'A', 4),
  ('44444444-4444-4444-4444-444444444444', 'How many NCAA Mens Basketball championships has UNC won?', '4', '5', '6', '7', 'C', 5),
  ('44444444-4444-4444-4444-444444444444', 'Which UNC alum is considered the basketball GOAT?', 'LeBron James', 'Kobe Bryant', 'Michael Jordan', 'Vince Carter', 'C', 6),
  ('44444444-4444-4444-4444-444444444444', 'What is the traditional UNC cheer?', 'Go Pack Go!', 'Roll Tide!', 'Go Heels!', 'Charge On!', 'C', 7);

-- ============================================================
-- To make yourself admin: go to Table Editor → profiles →
-- set is_admin to true for your row
-- ============================================================
