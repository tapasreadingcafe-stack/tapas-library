-- ============================================================================
-- TAPAS READING CAFE - Complete Database Setup
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CAFE TABLES
-- ============================================================================

-- Cafe Menu Items
CREATE TABLE IF NOT EXISTS cafe_menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  description TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cafe Orders
CREATE TABLE IF NOT EXISTS cafe_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  member_id UUID REFERENCES members(id),
  customer_name TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  cash_received NUMERIC,
  change_given NUMERIC,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cafe Order Line Items
CREATE TABLE IF NOT EXISTS cafe_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES cafe_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES cafe_menu_items(id),
  item_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_price NUMERIC NOT NULL
);

-- Cafe Inventory
CREATE TABLE IF NOT EXISTS cafe_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT DEFAULT 'ingredient',
  unit TEXT DEFAULT 'kg',
  current_stock NUMERIC DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  supplier_name TEXT,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cafe Expenses
CREATE TABLE IF NOT EXISTS cafe_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. EVENTS TABLES
-- ============================================================================

-- Events
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'one_time',
  recurrence_rule TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  location TEXT DEFAULT 'Tapas Reading Cafe',
  is_paid BOOLEAN DEFAULT false,
  ticket_price NUMERIC DEFAULT 0,
  capacity INTEGER,
  waitlist_enabled BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'upcoming',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Event Registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  registration_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'registered',
  ticket_count INTEGER DEFAULT 1,
  amount_paid NUMERIC DEFAULT 0,
  payment_method TEXT,
  notes TEXT
);

-- Event Attendance
CREATE TABLE IF NOT EXISTS event_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  registration_id UUID REFERENCES event_registrations(id),
  checked_in_at TIMESTAMPTZ DEFAULT now()
);

-- Unique: one registration per member per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_member ON event_registrations(event_id, member_id);

-- ============================================================================
-- 3. VENDORS & PURCHASE ORDERS
-- ============================================================================

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  vendor_type TEXT DEFAULT 'books',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  vendor_id UUID REFERENCES vendors(id),
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  order_date DATE DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0
);

-- ============================================================================
-- 4. APP SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default settings
INSERT INTO app_settings (key, value) VALUES
  ('library_name', '"Tapas Reading Cafe"'),
  ('fine_rate_per_day', '10'),
  ('default_loan_days', '14'),
  ('max_books_basic', '5'),
  ('max_books_premium', '10'),
  ('library_open_time', '"09:00"'),
  ('library_close_time', '"21:00"'),
  ('cafe_enabled', 'true'),
  ('events_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) — Open access for all tables
-- ============================================================================

-- Cafe
ALTER TABLE cafe_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_expenses ENABLE ROW LEVEL SECURITY;

-- Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- Vendors & POs
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Open policies (allow all operations)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'cafe_menu_items', 'cafe_orders', 'cafe_order_items', 'cafe_inventory', 'cafe_expenses',
    'events', 'event_registrations', 'event_attendance',
    'vendors', 'purchase_orders', 'purchase_order_items',
    'app_settings'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON %I', tbl);
    EXECUTE format('CREATE POLICY "allow_all" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END
$$;

-- ============================================================================
-- DONE! All 12 new tables created with RLS policies.
--
-- Tables created:
--   1.  cafe_menu_items      — Menu items (bakery, tea, coffee, juice)
--   2.  cafe_orders           — Cafe order headers
--   3.  cafe_order_items      — Cafe order line items
--   4.  cafe_inventory        — Cafe ingredient/stock tracking
--   5.  cafe_expenses         — Cafe expense records
--   6.  events                — Events (one-time & recurring)
--   7.  event_registrations   — Member registrations for events
--   8.  event_attendance      — Check-in records
--   9.  vendors               — Supplier/vendor directory
--   10. purchase_orders       — Purchase order headers
--   11. purchase_order_items  — PO line items
--   12. app_settings          — App configuration (key-value)
-- ============================================================================
