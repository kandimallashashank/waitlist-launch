-- B2B leads from waitlist corporate gifting page (Next.js inserts via service role only).

create table if not exists public.corporate_program_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_email text not null,
  contact_name text,
  company_name text not null,
  phone text,
  headcount_band text,
  occasion text,
  budget_band text,
  message text,
  source text not null default 'corporate_gifting_page',
  user_agent text,
  constraint corporate_program_inquiries_email_len check (char_length(contact_email) <= 254),
  constraint corporate_program_inquiries_company_len check (char_length(company_name) <= 200)
);

create index if not exists corporate_program_inquiries_created_idx
  on public.corporate_program_inquiries (created_at desc);

comment on table public.corporate_program_inquiries is
  'Corporate / B2B gifting program leads; written by waitlist-launch API with service role.';

alter table public.corporate_program_inquiries enable row level security;
