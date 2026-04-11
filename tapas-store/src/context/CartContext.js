import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// =====================================================================
// CartContext — localStorage-backed cart for tapas-store.
//
// Items are books or memberships. Each has a stable `key`:
//   book       → `book:${book.id}`
//   membership → `membership:${plan}`
//
// Guest and logged-in users share the same localStorage cart. DB sync
// is deferred to the Phase 6 hardening pass.
// =====================================================================

const CartContext = createContext(null);

const STORAGE_KEY = 'tapas_cart_v1';

const readInitial = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(readInitial);

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn('[Cart] persist failed', err);
    }
  }, [items]);

  const addBook = useCallback((book, qty = 1) => {
    const key = `book:${book.id}`;
    setItems(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, {
        key,
        type: 'book',
        book_id: book.id,
        title: book.title,
        author: book.author,
        cover_image: book.cover_image || null,
        unit_price: Number(book.sales_price || 0),
        quantity: qty,
      }];
    });
  }, []);

  const addMembership = useCallback((plan) => {
    // Only one membership at a time — replace any existing.
    const key = `membership:${plan.id}`;
    setItems(prev => {
      const withoutMemberships = prev.filter(i => i.type !== 'membership');
      return [...withoutMemberships, {
        key,
        type: 'membership',
        membership_plan: plan.id,
        membership_days: plan.days,
        title: plan.name,
        unit_price: Number(plan.price),
        quantity: 1,
      }];
    });
  }, []);

  const updateQty = useCallback((key, quantity) => {
    setItems(prev => {
      if (quantity <= 0) return prev.filter(i => i.key !== key);
      return prev.map(i => i.key === key ? { ...i, quantity } : i);
    });
  }, []);

  const removeItem = useCallback((key) => {
    setItems(prev => prev.filter(i => i.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal  = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      subtotal,
      addBook,
      addMembership,
      updateQty,
      removeItem,
      clear,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
