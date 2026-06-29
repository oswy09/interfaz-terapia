create table if not exists public.therapy_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  partner_a text,
  partner_b text,
  main_objective text,
  conflict_level int,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.therapy_sessions enable row level security;

-- Server talks to Supabase using the secret key, which bypasses RLS.
-- This policy just blocks any direct anon/publishable-key access from the browser.
create policy "no direct client access" on public.therapy_sessions
  for all
  using (false);
