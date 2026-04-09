-- Post-quiz pilot feedback: one row per waitlist email (matches POST /api/waitlist-preview/quiz/survey).
-- Run via Supabase CLI (`supabase db push`) or paste into SQL Editor in the dashboard.

create table if not exists public.waitlist_quiz_survey (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  too_long_rating integer
    constraint waitlist_quiz_survey_rating_range
    check (too_long_rating is null or (too_long_rating >= 1 and too_long_rating <= 5)),
  irrelevant_tags text[] not null default '{}',
  free_text text,
  created_at timestamptz not null default now(),
  constraint waitlist_quiz_survey_email_key unique (email)
);

create index if not exists waitlist_quiz_survey_email_idx
  on public.waitlist_quiz_survey (email);

comment on table public.waitlist_quiz_survey is
  'Pilot survey after scent quiz; skipped submissions use irrelevant_tags containing pilot_survey_dismissed.';

alter table public.waitlist_quiz_survey enable row level security;

-- API uses the service role only; no anon/authenticated policies needed.
