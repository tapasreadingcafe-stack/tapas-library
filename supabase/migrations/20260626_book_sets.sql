CREATE TABLE IF NOT EXISTS book_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  set_price NUMERIC DEFAULT 0,
  set_mrp NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE book_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage book_sets" ON book_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon read book_sets" ON book_sets FOR SELECT TO anon USING (true);

ALTER TABLE books ADD COLUMN IF NOT EXISTS set_id UUID REFERENCES book_sets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_books_set_id ON books(set_id);
