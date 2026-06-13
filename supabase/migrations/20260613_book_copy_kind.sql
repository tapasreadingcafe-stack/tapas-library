-- Distinguish sale copies (S- barcodes) from library/borrow copies (B- barcodes).
-- Each physical copy is one row; copy_kind is the source of truth, the S-/B-
-- prefix on copy_code is just the printed label.

ALTER TABLE book_copies ADD COLUMN IF NOT EXISTS copy_kind TEXT DEFAULT 'library';

-- Backfill: any copy already labelled with an S- code is a sale copy.
UPDATE book_copies
SET copy_kind = 'sale'
WHERE copy_code LIKE 'S-%'
  AND copy_kind IS DISTINCT FROM 'sale';

CREATE INDEX IF NOT EXISTS idx_book_copies_kind ON book_copies(copy_kind);
