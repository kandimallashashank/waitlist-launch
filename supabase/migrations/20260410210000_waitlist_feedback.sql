-- Pilot / waitlist landing feedback (Next.js POST /api/waitlist-feedback → service role insert).

create table if not exists public.waitlist_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text,
  message text not null,
  category text not null default 'general',
  page_url text,
  user_agent text,
  source text not null default 'waitlist_landing',
  constraint waitlist_feedback_message_len check (
    char_length(message) >= 3 and char_length(message) <= 5000
  ),
  constraint waitlist_feedback_email_len check (email is null or char_length(email) <= 254),
  constraint waitlist_feedback_category_check check (
    category in ('general', 'bug', 'idea', 'other')
  ),
  constraint waitlist_feedback_source_len check (char_length(source) <= 64)
);

create index if not exists waitlist_feedback_created_idx
  on public.waitlist_feedback (created_at desc);

comment on table public.waitlist_feedback is
  'Anonymous or identified feedback from waitlist pilot; written by waitlist-launch API with service role.';

alter table public.waitlist_feedback enable row level security;
