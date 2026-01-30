create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar text,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  time_ago text,
  tags text[] not null default '{}',
  description text,
  analysis_result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tree_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('folder', 'file')),
  parent_id uuid references tree_nodes(id) on delete cascade,
  problem_id uuid references problems(id) on delete set null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references problems(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

create table if not exists practice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references problems(id) on delete cascade,
  model text,
  question text not null,
  user_answer text,
  feedback jsonb,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references problems(id) on delete cascade,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  model text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table problems enable row level security;
alter table tree_nodes enable row level security;
alter table favorites enable row level security;
alter table practice_items enable row level security;
alter table chat_messages enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_upsert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create policy "problems_select_own" on problems
  for select using (auth.uid() = user_id);
create policy "problems_write_own" on problems
  for insert with check (auth.uid() = user_id);
create policy "problems_update_own" on problems
  for update using (auth.uid() = user_id);
create policy "problems_delete_own" on problems
  for delete using (auth.uid() = user_id);

create policy "tree_select_own" on tree_nodes
  for select using (auth.uid() = user_id);
create policy "tree_write_own" on tree_nodes
  for insert with check (auth.uid() = user_id);
create policy "tree_update_own" on tree_nodes
  for update using (auth.uid() = user_id);
create policy "tree_delete_own" on tree_nodes
  for delete using (auth.uid() = user_id);

create policy "favorites_select_own" on favorites
  for select using (auth.uid() = user_id);
create policy "favorites_write_own" on favorites
  for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on favorites
  for delete using (auth.uid() = user_id);

create policy "practice_select_own" on practice_items
  for select using (auth.uid() = user_id);
create policy "practice_write_own" on practice_items
  for insert with check (auth.uid() = user_id);
create policy "practice_delete_own" on practice_items
  for delete using (auth.uid() = user_id);

create policy "chat_select_own" on chat_messages
  for select using (auth.uid() = user_id);
create policy "chat_write_own" on chat_messages
  for insert with check (auth.uid() = user_id);
create policy "chat_delete_own" on chat_messages
  for delete using (auth.uid() = user_id);
