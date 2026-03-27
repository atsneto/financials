-- Recurring fixed monthly expenses
create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  category text,
  day_of_month int,
  active boolean default true,
  created_at timestamp with time zone default now()
);

create index if not exists recurring_expenses_user_idx on public.recurring_expenses(user_id);

alter table public.recurring_expenses enable row level security;
create policy "select own recurring" on public.recurring_expenses for select using (auth.uid() = user_id);
create policy "insert own recurring" on public.recurring_expenses for insert with check (auth.uid() = user_id);
create policy "update own recurring" on public.recurring_expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own recurring" on public.recurring_expenses for delete using (auth.uid() = user_id);
