-- Habits: user-defined daily habits
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  emoji text not null default '✦',
  accent_var text not null default '--j-brain',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per (habit, date) when completed that evening
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  logged_date date not null,
  created_at timestamptz not null default now(),
  unique(habit_id, logged_date)
);

alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "users_own_habits" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_habit_logs" on habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
