-- Waitlist quiz + gift preferences: canonical lowercase email + UNIQUE(email).
-- Enables Supabase/PostgREST upsert(..., onConflict: 'email') / on_conflict='email'.
--
-- Prerequisite: public.waitlist_quiz_preferences (waitlist_preview_tables migration).
-- Gift block: public.waitlist_gift_preferences (waitlist_gift_preferences migration).
--
-- Constraint names use *_email_uq (not *_email_key) so they do not collide with
-- waitlist_quiz_preferences_legacy_v1, which may still hold waitlist_quiz_preferences_email_key.

do $pre$
begin
  if to_regclass('public.waitlist_quiz_preferences') is null then
    raise exception 'waitlist_quiz_preferences missing; apply waitlist preview tables migration first';
  end if;
end $pre$;

-- Collapse duplicate rows per logical email; keep newest activity.
delete from public.waitlist_quiz_preferences
where id in (
  select id from (
    select id,
           row_number() over (
             partition by lower(trim(email))
             order by updated_at desc nulls last, created_at desc nulls last
           ) as rn
    from public.waitlist_quiz_preferences
  ) t
  where t.rn > 1
);

update public.waitlist_quiz_preferences
   set email = lower(trim(email))
 where email is not null;

drop index if exists public.waitlist_quiz_preferences_email_uidx;

alter table public.waitlist_quiz_preferences
  drop constraint if exists waitlist_quiz_preferences_email_uq;

alter table public.waitlist_quiz_preferences
  add constraint waitlist_quiz_preferences_email_uq unique (email);

-- Gift finder prefs (optional table on older DBs).
do $gift$
begin
  if to_regclass('public.waitlist_gift_preferences') is null then
    raise notice 'skip waitlist_gift_preferences: table not present';
    return;
  end if;

  delete from public.waitlist_gift_preferences
  where id in (
    select id from (
      select id,
             row_number() over (
               partition by lower(trim(email))
               order by updated_at desc nulls last, created_at desc nulls last
             ) as rn
      from public.waitlist_gift_preferences
    ) t
    where t.rn > 1
  );

  update public.waitlist_gift_preferences
     set email = lower(trim(email))
   where email is not null;

  drop index if exists public.waitlist_gift_preferences_email_uidx;

  alter table public.waitlist_gift_preferences
    drop constraint if exists waitlist_gift_preferences_email_uq;

  alter table public.waitlist_gift_preferences
    add constraint waitlist_gift_preferences_email_uq unique (email);
end $gift$;
