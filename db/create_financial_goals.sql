-- Financial goals: save money or reduce spending
create type goal_type as enum ('save', 'reduce');

create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type goal_type not null,
  target_amount numeric(12,2),
  target_date date,
  description text,
  created_at timestamp with time zone default now()
);

create index if not exists financial_goals_user_idx on public.financial_goals(user_id);

alter table public.financial_goals enable row level security;
create policy "select own goals" on public.financial_goals for select using (auth.uid() = user_id);
create policy "insert own goals" on public.financial_goals for insert with check (auth.uid() = user_id);
create policy "update own goals" on public.financial_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
