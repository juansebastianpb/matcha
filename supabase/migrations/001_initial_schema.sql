-- Profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'player_' || left(new.id::text, 8)), coalesce(new.raw_user_meta_data->>'username', 'Player'));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Scores table
create table if not exists scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  score integer not null,
  mode text not null default 'free' check (mode in ('free', 'competitive')),
  blocks_cleared integer default 0,
  max_chain integer default 0,
  max_combo integer default 0,
  challenge_match_id text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_scores_user_id on scores(user_id);
create index if not exists idx_scores_score on scores(score desc);
create index if not exists idx_scores_created_at on scores(created_at desc);

-- Leaderboard view
create or replace view leaderboard as
select
  s.id,
  s.user_id,
  p.username,
  p.display_name,
  s.score,
  s.mode,
  s.blocks_cleared,
  s.max_chain,
  s.max_combo,
  s.created_at,
  row_number() over (order by s.score desc) as rank
from scores s
join profiles p on s.user_id = p.id
where s.mode = 'free';

-- RLS
alter table profiles enable row level security;
alter table scores enable row level security;

-- Profiles: public read, authenticated update own
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Scores: public read, authenticated insert own
create policy "Scores are viewable by everyone"
  on scores for select using (true);

create policy "Authenticated users can insert own scores"
  on scores for insert with check (auth.uid() = user_id);
