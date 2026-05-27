-- =================================================================
-- FOCUSDEN DATABASE SCHEMA
-- Copy and paste this script directly into the Supabase SQL Editor
-- =================================================================

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (Linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null,
  avatar_color text not null default '#a855f7',
  xp integer not null default 320,
  streak_days integer not null default 3,
  total_minutes integer not null default 145,
  completed_sessions integer not null default 5,
  updated_at timestamp with time zone default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Allow public read access to profiles" 
  on public.profiles for select 
  using (true);

create policy "Allow authenticated users to update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Allow authenticated users to insert their own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- 2. AUTOMATIC PROFILE CREATION TRIGGER
-- When a user registers, automatically create their profile row
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', substring(new.email from '([^@]+)')),
    coalesce(new.raw_user_meta_data->>'avatar_color', '#a855f7')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. ROOMS TABLE
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  category text not null default 'Lofi',
  tags text[] not null default '{}',
  creator_id uuid references public.profiles(id) on delete set null,
  timer_mode text not null default 'pomodoro',
  timer_duration integer not null default 1500,
  timer_is_running boolean not null default false,
  timer_started_at timestamp with time zone,
  timer_paused_seconds_left integer not null default 1500,
  timer_current_mode text not null default 'focus',
  bg_image text not null default 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=600&auto=format&fit=crop',
  created_at timestamp with time zone default now()
);

-- Enable RLS on rooms
alter table public.rooms enable row level security;

-- Policies for rooms
create policy "Allow public read access to rooms" 
  on public.rooms for select 
  using (true);

create policy "Allow authenticated users to insert rooms" 
  on public.rooms for insert 
  with check (auth.role() = 'authenticated');

create policy "Allow authenticated users to update rooms" 
  on public.rooms for update 
  using (auth.role() = 'authenticated');

-- 4. MESSAGES TABLE
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade,
  sender_name text not null,
  text text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS on messages
alter table public.messages enable row level security;

-- Policies for messages
create policy "Allow public read access to messages" 
  on public.messages for select 
  using (true);

create policy "Allow authenticated users to insert messages" 
  on public.messages for insert 
  with check (auth.role() = 'authenticated');

-- 5. TASKS TABLE
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade,
  user_name text not null,
  text text not null,
  completed boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS on tasks
alter table public.tasks enable row level security;

-- Policies for tasks
create policy "Allow public read access to tasks" 
  on public.tasks for select 
  using (true);

create policy "Allow authenticated users to insert tasks" 
  on public.tasks for insert 
  with check (auth.role() = 'authenticated');

create policy "Allow authenticated users to update tasks" 
  on public.tasks for update 
  using (auth.role() = 'authenticated');

create policy "Allow authenticated users to delete tasks" 
  on public.tasks for delete 
  using (auth.role() = 'authenticated');

-- 6. WHITEBOARDS TABLE
create table public.whiteboards (
  room_id uuid references public.rooms(id) on delete cascade primary key,
  data_url text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS on whiteboards
alter table public.whiteboards enable row level security;

-- Policies for whiteboards
create policy "Allow public read access to whiteboards" 
  on public.whiteboards for select 
  using (true);

create policy "Allow authenticated users to insert whiteboards" 
  on public.whiteboards for insert 
  with check (auth.role() = 'authenticated');

create policy "Allow authenticated users to update whiteboards" 
  on public.whiteboards for update 
  using (auth.role() = 'authenticated');

-- 7. SESSION HISTORY TABLE
create table public.session_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  room_name text not null,
  minutes integer not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS on session_history
alter table public.session_history enable row level security;

-- Policies for session_history
create policy "Allow authenticated users to read their own history" 
  on public.session_history for select 
  using (auth.uid() = user_id);

create policy "Allow authenticated users to insert their own history" 
  on public.session_history for insert 
  with check (auth.uid() = user_id);

-- =================================================================
-- SEED INITIAL STUDY ROOM DATA
-- =================================================================
insert into public.rooms (id, name, description, category, tags, bg_image)
values 
  (
    '00000000-0000-0000-0000-000000000001',
    '🎧 Lofi Beats & Focus',
    'Chill study space with background music. Quiet Pomodoro environment.',
    'Lofi',
    array['Pomodoro', 'Lofi', 'Quiet'],
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=600&auto=format&fit=crop'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '💻 LeetCode Grind & Coding',
    'Solving algorithm problems. Share screen, whiteboard ideas, and ask questions.',
    'Coding',
    array['Coding', 'LeetCode', 'Interview'],
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '🌧️ Cozy Rainy Library',
    'Grab a hot beverage, listen to the rain, and study in absolute peace.',
    'Quiet',
    array['Quiet', 'Rain', 'Silent'],
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=600&auto=format&fit=crop'
  )
on conflict (id) do nothing;
