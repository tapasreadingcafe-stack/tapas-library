import { supabase } from './supabase';

// Category → 3-letter prefix mapping
const CAT_PREFIX = {
  'fiction': 'FIC', 'non-fiction': 'NFI', 'science': 'SCI', 'history': 'HIS',
  'biography': 'BIO', 'mystery': 'MYS', 'fantasy': 'FAN', 'romance': 'ROM',
  'thriller': 'THR', 'self-help': 'SLF', 'business': 'BIZ', 'technology': 'TEC',
  'children': 'CHI', 'young adult': 'YAD', 'poetry': 'POE', 'drama': 'DRA',
  'philosophy': 'PHI', 'religion': 'REL', 'travel': 'TRV', 'cooking': 'COK',
  'art': 'ART', 'sports': 'SPO', 'politics': 'POL', 'economics': 'ECO',
  'health': 'HLT', 'classic': 'CLS', 'adventure': 'ADV', 'horror': 'HOR',
  'comic': 'COM', 'manga': 'MNG', 'gothic': 'GOT', 'dystopian': 'DYS',
  'education': 'EDU',
};

export function getCategoryPrefix(category) {
  if (!category) return 'GEN';
  const lower = category.toLowerCase().trim();
  if (CAT_PREFIX[lower]) return CAT_PREFIX[lower];
  // Generate from first 3 letters
  return category.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GEN';
}

// Generate next copy ID: FIC-0001, FIC-0002, etc.
export async function generateCopyIds(bookId, category, count) {
  const prefix = getCategoryPrefix(category);

  // Get the highest existing number for this prefix
  const { data: existing } = await supabase
    .from('book_copies')
    .select('copy_code')
    .like('copy_code', `${prefix}-%`)
    .order('copy_code', { ascending: false })
    .limit(1);

  let lastNum = 0;
  if (existing && existing.length > 0) {
    const match = existing[0].copy_code.match(/-(\d+)$/);
    if (match) lastNum = parseInt(match[1]);
  }

  const copies = [];
  for (let i = 1; i <= count; i++) {
    const num = String(lastNum + i).padStart(4, '0');
    copies.push({
      book_id: bookId,
      copy_code: `${prefix}-${num}`,
      status: 'available',
      condition: 'New',
    });
  }

  return copies;
}

// Create copies in DB
export async function createBookCopies(bookId, category, count) {
  const copies = await generateCopyIds(bookId, category, count);
  if (copies.length === 0) return [];

  const { data, error } = await supabase.from('book_copies').insert(copies).select();
  if (error) throw error;
  return data || [];
}

// Get all copies for a book
export async function getBookCopies(bookId) {
  const { data } = await supabase
    .from('book_copies')
    .select('*')
    .eq('book_id', bookId)
    .order('copy_code');
  return data || [];
}

// Update copy status
export async function updateCopyStatus(copyId, status, extras = {}) {
  const { error } = await supabase
    .from('book_copies')
    .update({ status, ...extras })
    .eq('id', copyId);
  if (error) throw error;
}

// SQL for setup
export const BOOK_COPIES_SQL = `
CREATE TABLE IF NOT EXISTS book_copies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  copy_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'available',
  condition TEXT DEFAULT 'New',
  notes TEXT,
  current_borrower_id UUID REFERENCES members(id),
  sold_price NUMERIC,
  sold_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE book_copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON book_copies FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_book_copies_book ON book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_code ON book_copies(copy_code);
`;
