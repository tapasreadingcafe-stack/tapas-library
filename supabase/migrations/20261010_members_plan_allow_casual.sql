-- Allow the 'casual' plan on members
-- =====================================================================
-- The Casual Borrowing plan (₹70 / 14 days / 1 book) writes plan = 'casual',
-- but members_plan_check only listed the older plans, so every casual sale
-- was refused: the bill saved, the plan silently didn't start, and Borrow
-- treated the customer as having no plan.
--
-- The existing rule wasn't saved in this repo, so rather than guess its list
-- this adds 'casual' to whatever list it already has. Safe to run more than
-- once.

do $$
declare
  old_def text;
  new_def text;
begin
  select pg_get_constraintdef(oid) into old_def
  from   pg_constraint
  where  conrelid = 'public.members'::regclass and conname = 'members_plan_check';

  if old_def is null then
    raise notice 'members_plan_check does not exist — nothing to change';
    return;
  end if;

  if old_def ilike '%''casual''%' then
    raise notice 'members_plan_check already allows casual: %', old_def;
    return;
  end if;

  if position('ARRAY[' in old_def) = 0 then
    raise exception 'Unexpected shape for members_plan_check, change it by hand: %', old_def;
  end if;

  -- CHECK ((plan = ANY (ARRAY['a'::text, ...]))) → put 'casual' first in the list.
  new_def := replace(old_def, 'ARRAY[', 'ARRAY[''casual''::text, ');

  execute 'alter table public.members drop constraint members_plan_check';
  execute 'alter table public.members add constraint members_plan_check ' || new_def;
  raise notice 'members_plan_check is now: %', new_def;
end $$;

-- Check: the rule should now list 'casual'.
select pg_get_constraintdef(oid) as members_plan_check
from   pg_constraint
where  conrelid = 'public.members'::regclass and conname = 'members_plan_check';
