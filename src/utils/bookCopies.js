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

// Generate next copy ID: FIC-0001, FIC-0002, etc.
export async function generateCopyIds(bookId, category, count) {
  const prefix = getCategoryPrefix(category);

  const fullPrefix = `B-${prefix}`;

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
