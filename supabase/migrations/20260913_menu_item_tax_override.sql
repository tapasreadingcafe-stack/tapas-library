-- Per-item tax treatment for cafe menu items.
--
-- Why an item-level override exists at all: GST settings are configured per
-- revenue stream, so every cafe item shares one answer. That breaks on
-- anything sold at a printed MRP. Under the Legal Metrology Act the MRP is the
-- maximum price INCLUSIVE of all taxes, so a ₹60 can cannot be billed at ₹63 —
-- the tax has to be back-computed out of the ₹60. Meanwhile a ₹60 coffee made
-- in-house may legitimately be priced before tax. One switch cannot serve both.
--
--   tax_mode
--     NULL / 'default'  follow the stream's GST setting (unchanged behaviour)
--     'mrp'             the price already contains GST; extract it
--     'exclusive'       add GST on top of the price
--     'outside_gst'     not a GST supply at all — alcoholic liquor for human
--                       consumption is outside GST entirely (state excise and
--                       VAT instead) and must be kept out of GST turnover
--
--   gst_rate  overrides the stream's rate for this item. Packaged goods are
--             taxed at the goods rate, which is usually not the 5% restaurant
--             rate the cafe stream carries.
--
--   hsn_code  packaged goods report under their own HSN, not the service SAC.

ALTER TABLE cafe_menu_items
  ADD COLUMN IF NOT EXISTS tax_mode TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS hsn_code TEXT;

ALTER TABLE cafe_menu_items
  DROP CONSTRAINT IF EXISTS cafe_menu_items_tax_mode_check;

ALTER TABLE cafe_menu_items
  ADD CONSTRAINT cafe_menu_items_tax_mode_check
  CHECK (tax_mode IS NULL OR tax_mode IN ('default', 'mrp', 'exclusive', 'outside_gst'));

COMMENT ON COLUMN cafe_menu_items.tax_mode IS
  'How GST applies to this item: default (follow stream), mrp (price includes GST), exclusive (add GST), outside_gst (not a GST supply).';
COMMENT ON COLUMN cafe_menu_items.gst_rate IS
  'Per-item GST rate override. NULL means use the stream rate.';
COMMENT ON COLUMN cafe_menu_items.hsn_code IS
  'Per-item HSN. NULL means use the stream HSN/SAC.';
