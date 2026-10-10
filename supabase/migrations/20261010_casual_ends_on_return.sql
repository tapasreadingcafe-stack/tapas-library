-- Casual Borrowing is ₹70 per book: returning the book ends the fortnight
-- =====================================================================
-- A casual borrower pays ₹70 for ONE book for up to 14 days. Without this, a
-- customer who returned early could take another book free until their 14
-- days ran out. Now, when a casual member's book comes back (from any screen),
-- their plan ends that day, so the next book needs a new ₹70 — which starts a
-- fresh 14 days from the day they pay.
-- Safe to run more than once.

create or replace function public.end_casual_plan_on_return()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.return_date is not null and old.return_date is null then
    update public.members m
    set    subscription_end = least(m.subscription_end, new.return_date::date)
    where  m.id = new.member_id
    and    m.plan = 'casual'
    -- Only once nothing else is still out with them.
    and    not exists (
             select 1 from public.circulation c
             where  c.member_id = new.member_id
             and    c.return_date is null
             and    c.id <> new.id
           );
  end if;
  return new;
end;
$$;

drop trigger if exists circulation_end_casual_on_return on public.circulation;
create trigger circulation_end_casual_on_return
  after update of return_date on public.circulation
  for each row execute function public.end_casual_plan_on_return();

-- Check: should list the trigger.
select tgname from pg_trigger
where  tgrelid = 'public.circulation'::regclass and tgname = 'circulation_end_casual_on_return';
