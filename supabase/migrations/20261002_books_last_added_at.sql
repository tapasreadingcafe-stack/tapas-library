-- books.last_added_at — when stock for this title last arrived
-- =====================================================================
-- The Books page lists newest first. Sorting by created_at missed a common
-- case: adding another copy of a title we already have keeps the book's
-- original created_at, so a restocked book stayed buried where it was first
-- entered. last_added_at is set when the book is created AND whenever a new
-- copy is added, and the Books page sorts by it.
-- Safe to run more than once.

alter table public.books
  add column if not exists last_added_at timestamptz not null default now();

-- Backfill: the later of the book's creation and its newest copy.
update public.books b
set    last_added_at = greatest(
         b.created_at,
         coalesce((select max(c.created_at) from public.book_copies c where c.book_id = b.id), b.created_at)
       );

create index if not exists books_last_added_at_idx on public.books (last_added_at desc);

-- Every new copy, from any screen (Add Book, Bulk Edit, Barcodes, imports),
-- bumps its book to the top.
create or replace function public.bump_book_last_added_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.books set last_added_at = now() where id = new.book_id;
  return new;
end;
$$;

drop trigger if exists book_copies_bump_last_added on public.book_copies;
create trigger book_copies_bump_last_added
  after insert on public.book_copies
  for each row execute function public.bump_book_last_added_at();

-- Check: the newest-added books, most recent first.
select title, created_at, last_added_at
from   public.books
order  by last_added_at desc
limit  5;
