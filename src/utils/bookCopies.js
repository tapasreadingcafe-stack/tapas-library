import { supabase } from './supabase';

// Category → 3-letter prefix mapping
const CAT_PREFIX = {
  // Main genres
  'fiction': 'FIC', 'non-fiction': 'NFI', 'classic': 'CLS', 'literature': 'LIT',
  'mystery': 'MYS', 'thriller': 'THR', 'fantasy': 'FAN', 'romance': 'ROM',
  'horror': 'HOR', 'adventure': 'ADV', 'action': 'ACT', 'drama': 'DRA',
  'comedy': 'CMD', 'satire': 'SAT', 'gothic': 'GOT', 'dystopian': 'DYS',
  'crime': 'CRM', 'detective': 'DET', 'spy': 'SPY', 'war': 'WAR',
  'western': 'WST', 'mythology': 'MTH', 'fairy tale': 'FTL', 'fable': 'FAB',
  'folklore': 'FLK', 'legend': 'LGD',

  // Non-fiction & knowledge
  'science': 'SCI', 'history': 'HIS', 'biography': 'BIO', 'autobiography': 'AUB',
  'memoir': 'MEM', 'philosophy': 'PHI', 'psychology': 'PSY', 'sociology': 'SOC',
  'politics': 'POL', 'economics': 'ECO', 'business': 'BIZ', 'finance': 'FIN',
  'marketing': 'MKT', 'management': 'MGT', 'entrepreneurship': 'ENT',
  'self-help': 'SLF', 'motivation': 'MOT', 'spirituality': 'SPR',
  'religion': 'REL', 'health': 'HLT', 'fitness': 'FIT', 'yoga': 'YOG',
  'meditation': 'MED', 'nutrition': 'NUT', 'wellness': 'WEL',

  // Science & technology
  'technology': 'TEC', 'computer': 'CMP', 'programming': 'PRG', 'engineering': 'ENG',
  'mathematics': 'MAT', 'physics': 'PHY', 'chemistry': 'CHM', 'biology': 'BLG',
  'astronomy': 'AST', 'environment': 'ENV', 'geography': 'GEO', 'medicine': 'MDC',
  'artificial intelligence': 'AIL', 'data science': 'DTS', 'robotics': 'ROB',

  // Arts & lifestyle
  'art': 'ART', 'music': 'MUS', 'photography': 'PHO', 'design': 'DES',
  'architecture': 'ARC', 'fashion': 'FSH', 'cooking': 'COK', 'food': 'FOD',
  'travel': 'TRV', 'sports': 'SPO', 'cricket': 'CRK', 'gardening': 'GRD',
  'craft': 'CRF', 'diy': 'DIY', 'film': 'FLM', 'theater': 'THT',

  // Age groups
  'children': 'CHI', 'kids': 'KID', 'young adult': 'YAD', 'teen': 'TEE',
  'baby': 'BBY', 'toddler': 'TDL', 'picture book': 'PIC',

  // Education & exam
  'education': 'EDU', 'academic': 'ACD', 'textbook': 'TXB', 'reference': 'REF',
  'dictionary': 'DIC', 'encyclopedia': 'ENC', 'study guide': 'STG',
  'exam prep': 'EXP', 'competitive': 'CET', 'upsc': 'UPS', 'ssc': 'SSC',
  'gate': 'GAT', 'neet': 'NET', 'jee': 'JEE', 'cat': 'CAT',
  'banking': 'BNK', 'railway': 'RLY',

  // Literature formats
  'poetry': 'POE', 'essay': 'ESY', 'short story': 'SHS', 'anthology': 'ANT',
  'journal': 'JRN', 'magazine': 'MAG', 'newspaper': 'NWS', 'comic': 'COM',
  'manga': 'MNG', 'graphic novel': 'GRN', 'novel': 'NOV', 'novella': 'NVL',

  // Indian languages
  'hindi': 'HIN', 'marathi': 'MAR', 'gujarati': 'GUJ', 'tamil': 'TAM',
  'telugu': 'TEL', 'kannada': 'KAN', 'malayalam': 'MAL', 'bengali': 'BEN',
  'punjabi': 'PUN', 'urdu': 'URD', 'sanskrit': 'SAN', 'odia': 'ODI',
  'assamese': 'ASM', 'konkani': 'KON',

  // Special
  'law': 'LAW', 'journalism': 'JRM', 'mass communication': 'MCM',
  'social work': 'SWK', 'agriculture': 'AGR', 'veterinary': 'VET',
  'general knowledge': 'GNK', 'current affairs': 'CUR', 'quiz': 'QUZ',
  'puzzle': 'PZL', 'activity': 'ATV', 'coloring': 'CLR', 'sticker': 'STK',
  'stationery': 'STN', 'map': 'MAP', 'atlas': 'ATL', 'globe': 'GLB',
  'other': 'OTH', 'uncategorized': 'UNC', 'general': 'GEN', 'misc': 'MSC',
};

export function getCategoryPrefix(category) {
  if (!category) return 'GEN';
  const lower = category.toLowerCase().trim();
  if (CAT_PREFIX[lower]) return CAT_PREFIX[lower];
  // Generate from first 3 letters
  return category.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GEN';
}

// Copy kind → barcode letter. Library/borrow copies print B-, sale copies S-.
const KIND_LETTER = { library: 'B', sale: 'S' };

// Full copy-code prefix, e.g. "B-FIC" (borrow) or "S-FIC" (sale).
export function getCopyPrefix(category, kind = 'library') {
  const letter = KIND_LETTER[kind] || 'B';
  return `${letter}-${getCategoryPrefix(category)}`;
}

// Generate next copy IDs: B-FIC-0001 (library) or S-FIC-0001 (sale).
// Sale and library copies number independently per category prefix.
export async function generateCopyIds(bookId, category, count, kind = 'library') {
  const copyKind = kind === 'sale' ? 'sale' : 'library';
  const fullPrefix = getCopyPrefix(category, copyKind);

  // Get the highest existing number for this prefix
  const { data: existing } = await supabase
    .from('book_copies')
    .select('copy_code')
    .like('copy_code', `${fullPrefix}-%`)
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
      copy_code: `${fullPrefix}-${num}`,
      status: 'available',
      condition: 'New',
      copy_kind: copyKind,
    });
  }

  return copies;
}

// Create copies in DB
export async function createBookCopies(bookId, category, count, kind = 'library') {
  const copies = await generateCopyIds(bookId, category, count, kind);
  if (copies.length === 0) return [];

  let { data, error } = await supabase.from('book_copies').insert(copies).select();
  // Older DBs may not have the copy_kind column yet — retry without it so
  // copy creation never hard-fails before the migration is applied.
  if (error && /copy_kind/i.test(error.message || '')) {
    const stripped = copies.map(({ copy_kind, ...rest }) => rest);
    ({ data, error } = await supabase.from('book_copies').insert(stripped).select());
  }
  if (error) throw error;
  return data || [];
}

// Change a book's category: persist books.category, then rename every copy's
// copy_code (and the book's book_id) to the new category prefix so
// B-GEN-0016 becomes B-CHI-####. Numbers are preserved unless the target code
// is already taken, in which case the next free number for the new prefix is
// used. Mirrors the rename logic on the Books edit page.
// Returns { renamed: [{ id, from, to }] }.
export async function changeBookCategory(bookId, oldCategory, newCategory) {
  await supabase.from('books').update({ category: newCategory }).eq('id', bookId);

  const oldPrefix = getCategoryPrefix(oldCategory);
  const newPrefix = getCategoryPrefix(newCategory);
  const renamed = [];
  if (oldPrefix === newPrefix) return { renamed };

  const { data: copies } = await supabase
    .from('book_copies').select('id, copy_code').eq('book_id', bookId);

  for (const copy of copies || []) {
    const m = copy.copy_code.match(/^([BS])-([A-Z]+)-(\d+)$/);
    if (!m || m[2] !== oldPrefix) continue;
    const [, letter, , num] = m;
    let newCode = `${letter}-${newPrefix}-${num}`;

    // If another copy already holds that code, take the next free number.
    const { data: conflict } = await supabase
      .from('book_copies').select('id').eq('copy_code', newCode).neq('id', copy.id).limit(1);
    if (conflict?.length) {
      const { data: highest } = await supabase
        .from('book_copies').select('copy_code')
        .like('copy_code', `${letter}-${newPrefix}-%`)
        .order('copy_code', { ascending: false }).limit(1);
      const lastNum = parseInt(highest?.[0]?.copy_code.match(/-(\d+)$/)?.[1] || '0');
      newCode = `${letter}-${newPrefix}-${String(lastNum + 1).padStart(4, '0')}`;
    }
    await supabase.from('book_copies').update({ copy_code: newCode }).eq('id', copy.id);
    renamed.push({ id: copy.id, from: copy.copy_code, to: newCode });
  }

  // Rename the book's own book_id prefix too (e.g. B-GEN-0016 → B-CHI-0016).
  const { data: bk } = await supabase.from('books').select('book_id').eq('id', bookId).single();
  if (bk?.book_id) {
    const bm = bk.book_id.match(/^([BS])-([A-Z]+)-(\d+)$/);
    if (bm && bm[2] === oldPrefix) {
      await supabase.from('books')
        .update({ book_id: `${bm[1]}-${newPrefix}-${bm[3]}` }).eq('id', bookId);
    }
  }

  return { renamed };
}

// Convert a book between borrow (B- / library copies) and sale (S- / sale
// copies): renames book_id + every copy code to the new letter (next free
// number on a clash), flips each copy's copy_kind, and sets the book's
// borrow/sale flags. toKind is 'borrow' or 'sale'.
export async function changeBookKind(bookId, toKind) {
  const newLetter = toKind === 'sale' ? 'S' : 'B';
  const oldLetter = toKind === 'sale' ? 'B' : 'S';
  const newCopyKind = toKind === 'sale' ? 'sale' : 'library';

  const { data: copies } = await supabase
    .from('book_copies').select('id, copy_code').eq('book_id', bookId);

  for (const copy of copies || []) {
    const m = copy.copy_code.match(/^([BS])-([A-Z]+)-(\d+)$/);
    if (!m) continue;
    const [, letter, prefix, num] = m;
    let newCode = copy.copy_code;
    if (letter === oldLetter) {
      newCode = `${newLetter}-${prefix}-${num}`;
      const { data: conflict } = await supabase
        .from('book_copies').select('id').eq('copy_code', newCode).neq('id', copy.id).limit(1);
      if (conflict?.length) {
        const { data: highest } = await supabase
          .from('book_copies').select('copy_code')
          .like('copy_code', `${newLetter}-${prefix}-%`)
          .order('copy_code', { ascending: false }).limit(1);
        const lastNum = parseInt(highest?.[0]?.copy_code.match(/-(\d+)$/)?.[1] || '0');
        newCode = `${newLetter}-${prefix}-${String(lastNum + 1).padStart(4, '0')}`;
      }
    }
    await supabase.from('book_copies')
      .update({ copy_code: newCode, copy_kind: newCopyKind }).eq('id', copy.id);
  }

  // Flip the book's own book_id letter + borrow/sale flags.
  const updates = { is_borrowable: toKind === 'borrow' };
  if (toKind === 'sale') updates.store_visible = true;
  const { data: bk } = await supabase.from('books').select('book_id').eq('id', bookId).single();
  if (bk?.book_id) {
    const bm = bk.book_id.match(/^([BS])-([A-Z]+)-(\d+)$/);
    if (bm && bm[1] === oldLetter) updates.book_id = `${newLetter}-${bm[2]}-${bm[3]}`;
  }
  await supabase.from('books').update(updates).eq('id', bookId);
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
  copy_kind TEXT DEFAULT 'library',
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
