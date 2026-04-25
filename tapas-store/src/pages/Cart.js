import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CartHero from './cart/CartHero';
import CartItemCard from './cart/CartItemCard';
import EmptyCart from './cart/EmptyCart';
import PairedWith from './cart/PairedWith';
import OrderSummary from './cart/OrderSummary';
import { PickupCard, GiftWrapCard, NoteCard } from './cart/SideCards';
import RemoveToast from './cart/RemoveToast';
import CART_CSS from './cart/cartStyles';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { rupees, pluralItems, pluralTitles } from './cart/cartFormat';

const UNDO_MS = 5000;

export default function Cart() {
  const {
    items, itemCount, subtotal,
    updateQty, removeItem, insertItemAt, clear,
    giftWrap, pickup, promoCode,
  } = useCart();
  const { member } = useAuth();
  const navigate = useNavigate();

  // Member discount auto-applies to signed-in members. The promo
  // resolver rejects MEMBER when this is true so they can't stack.
  const memberDiscountApplied = !!member;

  // Totals pipeline.
  const memberDiscount = memberDiscountApplied ? Math.round(subtotal * 0.10) : 0;
  const promoDiscount  = promoCode?.amount || 0;
  const giftWrapFee    = giftWrap ? 50 : 0;
  const shippingFee    = pickup ? 0 : (subtotal >= 999 ? 0 : 80);
  const taxBase        = Math.max(0, subtotal - memberDiscount - promoDiscount + giftWrapFee);
  const gst            = Math.round(taxBase * 0.05);
  const total          = taxBase + shippingFee + gst;

  // One-time view-cart analytics stub.
  useEffect(() => {
    // TODO: route this through Plausible / PostHog when analytics
    // are wired up. Kept as a console.log so we don't ship a
    // provider-specific call yet.
    // eslint-disable-next-line no-console
    console.log('[cart] trackViewCart', { items: items.length, subtotal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Remove with 5s undo ---------------------------------------
  //
  // The click removes the item from the cart immediately (so the
  // visible list updates); we stash the full snapshot + original
  // index + a timeout id. Undo re-inserts the snapshot at its old
  // index. On timeout the snapshot is dropped.
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const pendingRef = useRef(null);

  const startRemoval = (item) => {
    const index = items.findIndex((i) => i.key === item.key);
    removeItem(item.key);
    const timer = setTimeout(() => {
      pendingRef.current = null;
      setPendingRemoval(null);
    }, UNDO_MS);
    const snapshot = { item: { ...item }, index, timer };
    pendingRef.current = snapshot;
    setPendingRemoval(snapshot);
  };

  const undoRemoval = () => {
    const snap = pendingRef.current;
    if (!snap) return;
    clearTimeout(snap.timer);
    insertItemAt(snap.item, snap.index);
    pendingRef.current = null;
    setPendingRemoval(null);
  };

  useEffect(() => () => {
    if (pendingRef.current?.timer) clearTimeout(pendingRef.current.timer);
  }, []);

  // --- Clear-cart confirmation ---
  const [confirmClear, setConfirmClear] = useState(false);

  // --- Mobile bar visibility ---
  // Show a fixed-bottom checkout bar on phones once the order
  // summary scrolls out of view. IntersectionObserver is the cheap
  // reliable way to do this with a scroll-linked condition.
  const summarySentinelRef = useRef(null);
  const [mobileBarVisible, setMobileBarVisible] = useState(false);
  useEffect(() => {
    const target = summarySentinelRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setMobileBarVisible(!entry.isIntersecting),
      { rootMargin: '0px 0px -40% 0px', threshold: 0 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [itemCount]);

  const titleCount = useMemo(() => items.length, [items]);

  return (
    <div className="ct-root">
      <style>{CART_CSS}</style>
      <CartHero />

      <div className="ct-wrap">
        <div className="ct-layout">
          {/* LEFT */}
          <div>
            <div className="ct-toolbar">
              <div className="ct-toolbar-count">
                {itemCount} {pluralItems(itemCount)} · {titleCount} {pluralTitles(titleCount)}
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  className="ct-toolbar-clear"
                  onClick={() => setConfirmClear(true)}
                >
                  Clear cart
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <EmptyCart />
            ) : (
              <div className="ct-items">
                {items.map((item) => (
                  <CartItemCard
                    key={item.key}
                    item={item}
                    memberDiscountApplied={memberDiscountApplied}
                    onQty={(next) => {
                      if (next <= 0) startRemoval(item);
                      else updateQty(item.key, next);
                    }}
                    onRemove={() => startRemoval(item)}
                  />
                ))}
              </div>
            )}

            <PairedWith />
          </div>

          {/* RIGHT */}
          <aside className="ct-side">
            <span ref={summarySentinelRef} aria-hidden="true" />
            <OrderSummary
              subtotal={subtotal}
              memberDiscount={memberDiscount}
              promoDiscount={promoDiscount}
              giftWrapFee={giftWrapFee}
              shippingFee={shippingFee}
              gst={gst}
              total={total}
              itemCount={itemCount}
              memberDiscountApplied={memberDiscountApplied}
            />
            <PickupCard />
            <GiftWrapCard />
            <NoteCard />
          </aside>
        </div>
      </div>

      <RemoveToast pending={pendingRemoval?.item} onUndo={undoRemoval} />

      {confirmClear && (
        <div className="ct-modal-root" role="dialog" aria-modal="true" aria-labelledby="ct-clear-h">
          <div className="ct-modal">
            <h3 id="ct-clear-h">Clear everything?</h3>
            <p>
              This empties the basket and resets any notes or promos
              you’ve added. You can’t undo this.
            </p>
            <div className="ct-modal-actions">
              <button
                type="button"
                className="ct-btn-outline"
                autoFocus
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ct-btn-dark"
                onClick={() => { clear(); setConfirmClear(false); }}
              >
                Clear everything
              </button>
            </div>
          </div>
        </div>
      )}

      {mobileBarVisible && items.length > 0 && (
        <div className="ct-mobile-bar" role="region" aria-label="Checkout">
          <button type="button" onClick={() => navigate('/checkout')}>
            Checkout · {rupees(total)}
            <span className="ct-mobile-bar-arrow" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
