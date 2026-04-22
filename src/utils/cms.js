// =====================================================================
// cms — Phase I1 CMS client helpers.
//
// Thin wrapper over supabase-js that the CMSPanel + the eventual
// collection_list / binding runtime both consume. Kept intentionally
// flat: no caching, no React, no hooks — every call returns a plain
// promise so the panel can drive its own SWR-ish re-fetch after edits.
// =====================================================================

import { supabase } from './supabase';

export const FIELD_TYPES = [
  { key: 'text',      label: 'Plain text' },
  { key: 'rich_text', label: 'Rich text' },
  { key: 'number',    label: 'Number' },
  { key: 'boolean',   label: 'Boolean' },
  { key: 'date',      label: 'Date' },
  { key: 'image',     label: 'Image URL' },
  { key: 'link',      label: 'Link' },
  { key: 'color',     label: 'Color' },
  { key: 'reference', label: 'Reference' },
  { key: 'option',    label: 'Option list' },
];

function slugify(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

// -------- Collections ------------------------------------------------
export async function listCollections() {
  const { data, error } = await supabase
    .from('store_collections')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function createCollection({ name, slug }) {
  const payload = {
    name: String(name || '').trim() || 'Untitled',
    slug: slug ? slugify(slug) : slugify(name),
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
    ],
  };
  const { data, error } = await supabase
    .from('store_collections')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCollection(id) {
  const { error } = await supabase.from('store_collections').delete().eq('id', id);
  if (error) throw error;
}

export async function updateCollection(id, patch) {
  const { data, error } = await supabase
    .from('store_collections')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// -------- Items ------------------------------------------------------
export async function listItems(collectionId) {
  const { data, error } = await supabase
    .from('store_collection_items')
    .select('*')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createItem(collectionId, seed = {}) {
  const slug = slugify(seed.slug || seed.title || `item-${Date.now().toString(36)}`);
  const payload = {
    collection_id: collectionId,
    slug,
    data: seed.data || {},
    status: 'draft',
  };
  const { data, error } = await supabase
    .from('store_collection_items')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItem(id, patch) {
  const next = { ...patch };
  if (next.status === 'published' && !patch.published_at) {
    next.published_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('store_collection_items')
    .update(next)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id) {
  const { error } = await supabase.from('store_collection_items').delete().eq('id', id);
  if (error) throw error;
}

// Field helpers — shared between the schema editor and the item editor.
export function makeField({ label = 'New field', type = 'text' } = {}) {
  const key = slugify(label).replace(/-/g, '_');
  return { key, label, type };
}

export function coerceFieldValue(type, raw) {
  switch (type) {
    case 'number':  return raw === '' || raw == null ? null : Number(raw);
    case 'boolean': return !!raw;
    default:        return raw ?? '';
  }
}
