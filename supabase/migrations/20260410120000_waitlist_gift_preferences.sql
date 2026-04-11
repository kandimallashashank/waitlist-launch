-- Gift finder runs: separate from personal scent quiz (``waitlist_quiz_preferences``).
-- One row per waitlist email (latest run overwrites), plus optional one-time pilot survey.

create table if not exists public.waitlist_gift_preferences (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  gift_answers jsonb not null default '{}'::jsonb,
  derived_quiz_answers jsonb not null default '{}'::jsonb,
  recommendation_snapshot jsonb,
  scent_profile jsonb,
  preference_analytics jsonb,
  gift_completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists waitlist_gift_preferences_email_uidx
  on public.waitlist_gift_preferences (lower(email));

create index if not exists waitlist_gift_preferences_completed_idx
  on public.waitlist_gift_preferences (gift_completed_at desc);

create table if not exists public.waitlist_gift_survey (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  too_long_rating int,
  irrelevant_tags text[] default '{}',
  free_text text,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_gift_survey_email_idx
  on public.waitlist_gift_survey (lower(email), created_at desc);

alter table public.waitlist_gift_preferences enable row level security;
alter table public.waitlist_gift_survey enable row level security;
