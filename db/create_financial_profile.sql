-- Financial profile: monthly income and optional spending limit
create table if not exists public.financial_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  monthly_income numeric(12,2) not null default 0,
  spending_limit numeric(12,2),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists financial_profile_user_idx on public.financial_profile(user_id);

-- Row Level Security
alter table public.financial_profile enable row level security;
create policy "select own profile" on public.financial_profile for select using (auth.uid() = user_id);
create policy "insert own profile" on public.financial_profile for insert with check (auth.uid() = user_id);
create policy "update own profile" on public.financial_profile for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
