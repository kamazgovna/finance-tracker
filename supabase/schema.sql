create extension if not exists "pgcrypto";

create table if not exists public.finance_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_debts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  total_amount numeric not null default 0,
  remaining_balance numeric not null default 0,
  interest_rate numeric not null default 0,
  monthly_payment numeric not null default 0,
  start_date date,
  end_date date,
  original_term_months integer,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_income (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null default 0,
  frequency text not null,
  category text not null,
  date date,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null default 0,
  category text not null,
  date date not null,
  recurring boolean not null default false,
  frequency text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  category text not null unique,
  monthly_limit numeric not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  monthly_contribution numeric not null default 0,
  deadline date,
  color text not null default '#10b981',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.finance_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists finance_debts_touch_updated_at on public.finance_debts;
create trigger finance_debts_touch_updated_at
before update on public.finance_debts
for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_income_touch_updated_at on public.finance_income;
create trigger finance_income_touch_updated_at
before update on public.finance_income
for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_expenses_touch_updated_at on public.finance_expenses;
create trigger finance_expenses_touch_updated_at
before update on public.finance_expenses
for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_budgets_touch_updated_at on public.finance_budgets;
create trigger finance_budgets_touch_updated_at
before update on public.finance_budgets
for each row execute function public.finance_touch_updated_at();

drop trigger if exists finance_goals_touch_updated_at on public.finance_goals;
create trigger finance_goals_touch_updated_at
before update on public.finance_goals
for each row execute function public.finance_touch_updated_at();

alter table public.finance_members enable row level security;
alter table public.finance_debts enable row level security;
alter table public.finance_income enable row level security;
alter table public.finance_expenses enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_goals enable row level security;

create or replace function public.is_finance_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.finance_members
    where user_id = auth.uid()
  );
$$;

drop policy if exists "finance members can read members" on public.finance_members;
create policy "finance members can read members"
on public.finance_members for select
to authenticated
using (public.is_finance_member());

drop policy if exists "finance members can read debts" on public.finance_debts;
create policy "finance members can read debts"
on public.finance_debts for select
to authenticated
using (public.is_finance_member());

drop policy if exists "finance members can write debts" on public.finance_debts;
create policy "finance members can write debts"
on public.finance_debts for all
to authenticated
using (public.is_finance_member())
with check (public.is_finance_member());

drop policy if exists "finance members can read income" on public.finance_income;
create policy "finance members can read income"
on public.finance_income for select
to authenticated
using (public.is_finance_member());

drop policy if exists "finance members can write income" on public.finance_income;
create policy "finance members can write income"
on public.finance_income for all
to authenticated
using (public.is_finance_member())
with check (public.is_finance_member());

drop policy if exists "finance members can read expenses" on public.finance_expenses;
create policy "finance members can read expenses"
on public.finance_expenses for select
to authenticated
using (public.is_finance_member());

drop policy if exists "finance members can write expenses" on public.finance_expenses;
create policy "finance members can write expenses"
on public.finance_expenses for all
to authenticated
using (public.is_finance_member())
with check (public.is_finance_member());

drop policy if exists "finance members can read budgets" on public.finance_budgets;
create policy "finance members can read budgets"
on public.finance_budgets for select
to authenticated
using (public.is_finance_member());

drop policy if exists "finance members can write budgets" on public.finance_budgets;
create policy "finance members can write budgets"
on public.finance_budgets for all
to authenticated
using (public.is_finance_member())
with check (public.is_finance_member());

drop policy if exists "finance members can read goals" on public.finance_goals;
create policy "finance members can read goals"
on public.finance_goals for select
to authenticated
using (public.is_finance_member());

drop policy if exists "finance members can write goals" on public.finance_goals;
create policy "finance members can write goals"
on public.finance_goals for all
to authenticated
using (public.is_finance_member())
with check (public.is_finance_member());
