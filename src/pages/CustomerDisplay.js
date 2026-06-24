import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Dedicated no-auth client so Realtime connects instantly without waiting
// for session restore or token refresh that the shared client does.
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

const DISPLAY_CHANNEL = 'trc-pos-display';
const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const EMPTY = { status: 'idle', items: [], subtotal: 0, discount: 0, total: 0, customer: null, phone: null, promoCode: null, promoDiscount: 0, addlDiscount: 0, addlDiscLabel: null, txnRef: null, payMethod: null, upiQrUrl: null };

export default function CustomerDisplay() {
  const [s, setS]                = useState(EMPTY);
  const [connected, setConnected] = useState(false);
  const idleTimer                 = useRef(null);
  const listRef                  = useRef(null);

  useEffect(() => {
    const chan = supabase.channel(DISPLAY_CHANNEL, { config: { broadcast: { self: false } } });
    chan.on('broadcast', { event: 'state' }, ({ payload }) => {
      setS({ ...EMPTY, ...payload });
      clearTimeout(idleTimer.current);
      if (payload?.status === 'paid') {
        idleTimer.current = setTimeout(() => setS(EMPTY), 14000);
      }
    });
    chan.subscribe((status) => {
      const ok = status === 'SUBSCRIBED';
      setConnected(ok);
      if (ok) chan.send({ type: 'broadcast', event: 'request', payload: {} }).catch(() => {});
    });
    return () => { clearTimeout(idleTimer.current); supabase.removeChannel(chan); };
  }, []);

  // Scroll to bottom whenever items change so latest item is always visible
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [s.items?.length]);

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (s.status === 'idle' || (!s.items?.length && s.status !== 'paid')) {
    return (
      <div style={shell}>
        <Header connected={connected} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(64px,12vw,120px)' }}>☕</div>
          <div style={{ fontSize: 'clamp(28px,5vw,60px)', fontWeight: 900, color: '#0f172a' }}>Welcome!</div>
          <div style={{ fontSize: 'clamp(14px,1.8vw,22px)', color: '#64748b' }}>
            Happy reading at Tapas Reading Cafe
          </div>
        </div>
      </div>
    );
  }

  // ── PAID ──────────────────────────────────────────────────────────────────
  if (s.status === 'paid') {
    return (
      <div style={{ ...shell, background: '#f0fdf4' }}>
        <Header connected={connected} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 'clamp(10px,2vw,22px)', textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(64px,12vw,120px)' }}>✅</div>
          <div style={{ fontSize: 'clamp(24px,4vw,48px)', fontWeight: 900, color: '#0f172a' }}>
            Payment Received!
          </div>
          <div style={{ fontSize: 'clamp(40px,9vw,96px)', fontWeight: 900, color: '#16a34a', letterSpacing: -2 }}>
            {fmt(s.total)}
          </div>
          {s.txnRef && (
            <div style={{ fontSize: 'clamp(12px,1.4vw,17px)', color: '#64748b' }}>Ref: {s.txnRef}</div>
          )}
          <div style={{ fontSize: 'clamp(14px,1.8vw,22px)', color: '#64748b', marginTop: 4 }}>
            Thank you for visiting TRC!
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE CART (receipt layout) ──────────────────────────────────────────
  const itemCount = s.items.reduce((t, i) => t + i.qty, 0);

  return (
    <div style={shell}>
      <Header connected={connected} />

      {/* Customer + phone */}
      {s.customer && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'clamp(10px,1.4vw,16px) clamp(24px,3.5vw,52px)',
          background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👤</span>
            <span style={{ fontSize: 'clamp(14px,1.8vw,22px)', fontWeight: 700, color: '#1e293b' }}>
              {s.customer}
            </span>
          </div>
          {s.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7,
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 8, padding: 'clamp(5px,.8vw,9px) clamp(10px,1.4vw,18px)' }}>
              <span>📱</span>
              <span style={{ fontSize: 'clamp(14px,1.8vw,22px)', fontWeight: 700, color: '#1d4ed8' }}>
                {s.phone}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Column headers */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        padding: 'clamp(6px,1vw,12px) clamp(24px,3.5vw,52px)',
        background: '#f1f5f9', borderBottom: '2px solid #e2e8f0',
        fontSize: 'clamp(10px,1.1vw,13px)', fontWeight: 700,
        color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0 }}>
        <span>Item <span style={{ fontWeight: 500, opacity: 0.75 }}>· {itemCount} item{itemCount !== 1 ? 's' : ''}</span></span>
        <span>Amount</span>
      </div>

      {/* Items list — scrollable */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto' }}>
        {s.items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'clamp(12px,1.6vw,20px) clamp(24px,3.5vw,52px)',
            borderBottom: '1px solid #f1f5f9',
            background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              {it.qty > 1 && (
                <span style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe',
                  borderRadius: 6, padding: '2px 10px',
                  fontSize: 'clamp(11px,1.2vw,15px)', fontWeight: 700, flexShrink: 0 }}>
                  ×{it.qty}
                </span>
              )}
              <span style={{ fontSize: 'clamp(16px,2vw,26px)', fontWeight: 500, color: '#1e293b',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.name}
              </span>
            </div>
            <span style={{ fontSize: 'clamp(16px,2vw,26px)', fontWeight: 700,
              color: '#0f172a', marginLeft: 16, flexShrink: 0 }}>
              {fmt(it.price * it.qty)}
            </span>
          </div>
        ))}
      </div>

      {/* Bill summary footer */}
      <div style={{ flexShrink: 0, background: '#ffffff', borderTop: '2px solid #e2e8f0' }}>

        {/* Subtotal row */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          padding: 'clamp(8px,1vw,12px) clamp(24px,3.5vw,52px)',
          borderBottom: '1px solid #f1f5f9',
          fontSize: 'clamp(13px,1.6vw,19px)', color: '#64748b' }}>
          <span>Subtotal</span>
          <span>{fmt(s.subtotal)}</span>
        </div>

        {/* Promo code discount row */}
        {s.promoDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'clamp(8px,1vw,12px) clamp(24px,3.5vw,52px)',
            borderBottom: '1px solid #f1f5f9',
            fontSize: 'clamp(13px,1.6vw,19px)', color: '#dc2626', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              Promo
              {s.promoCode && (
                <span style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a',
                  borderRadius: 6, padding: '2px 10px', fontSize: 'clamp(11px,1.2vw,14px)',
                  fontWeight: 700, letterSpacing: '1px' }}>
                  {s.promoCode}
                </span>
              )}
            </span>
            <span>−{fmt(s.promoDiscount)}</span>
          </div>
        )}

        {/* Additional manual discount row */}
        {s.addlDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'clamp(8px,1vw,12px) clamp(24px,3.5vw,52px)',
            borderBottom: '1px solid #f1f5f9',
            fontSize: 'clamp(13px,1.6vw,19px)', color: '#dc2626', fontWeight: 600 }}>
            <span>
              {s.promoCode ? 'Extra Discount' : 'Discount'}
              {s.promoCode && s.addlDiscLabel && (
                <span style={{ marginLeft: 8, fontSize: 'clamp(11px,1.2vw,14px)',
                  fontWeight: 700, opacity: 0.75 }}>({s.addlDiscLabel})</span>
              )}
            </span>
            <span>−{fmt(s.addlDiscount)}</span>
          </div>
        )}

        {/* Fallback: single discount row when no promo breakdown available */}
        {s.discount > 0 && !s.promoDiscount && !s.addlDiscount && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'clamp(8px,1vw,12px) clamp(24px,3.5vw,52px)',
            borderBottom: '1px solid #f1f5f9',
            fontSize: 'clamp(13px,1.6vw,19px)', color: '#dc2626', fontWeight: 600 }}>
            <span>Discount</span>
            <span>−{fmt(s.discount)}</span>
          </div>
        )}

        {/* UPI QR section — shown prominently when cashier selects UPI */}
        {s.payMethod === 'upi' && s.upiQrUrl && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 'clamp(20px,4vw,52px)',
            padding: 'clamp(16px,2.5vw,32px) clamp(24px,3.5vw,52px)',
            background: '#faf5ff', borderTop: '2px solid #ddd6fe' }}>
            <img src={s.upiQrUrl} alt="UPI QR"
              style={{ width: 'clamp(110px,20vw,240px)', height: 'clamp(110px,20vw,240px)',
                borderRadius: 10, border: '3px solid #ddd6fe', objectFit: 'contain',
                background: '#fff' }} />
            <div>
              <div style={{ fontSize: 'clamp(13px,1.6vw,20px)', fontWeight: 700, color: '#7c3aed', marginBottom: 6 }}>
                📱 Scan to Pay
              </div>
              <div style={{ fontSize: 'clamp(30px,6vw,68px)', fontWeight: 900,
                color: '#4f46e5', letterSpacing: -2, lineHeight: 1 }}>
                {fmt(s.total)}
              </div>
              <div style={{ fontSize: 'clamp(11px,1.1vw,14px)', color: '#a78bfa', marginTop: 6 }}>
                GPay · PhonePe · Paytm · Any UPI
              </div>
            </div>
          </div>
        )}

        {/* TOTAL row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'clamp(14px,2vw,26px) clamp(24px,3.5vw,52px)',
          background: '#f8fafc' }}>
          <span style={{ fontSize: 'clamp(20px,3.5vw,44px)', fontWeight: 900, color: '#64748b' }}>
            TOTAL
          </span>
          <span style={{ fontSize: 'clamp(32px,6.5vw,76px)', fontWeight: 900,
            color: '#4f46e5', letterSpacing: -2 }}>
            {fmt(s.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Shared header ─────────────────────────────────────────────────────────────
function Header({ connected }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'clamp(12px,1.8vw,22px) clamp(24px,3.5vw,52px)',
      background: '#ffffff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 'clamp(24px,3vw,38px)' }}>📚</span>
        <div>
          <div style={{ fontSize: 'clamp(16px,2.2vw,28px)', fontWeight: 800, color: '#0f172a' }}>
            Tapas Reading Cafe
          </div>
          <div style={{ fontSize: 'clamp(9px,.9vw,11px)', color: '#94a3b8',
            letterSpacing: '3px', textTransform: 'uppercase', marginTop: 1 }}>
            Point of Sale
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
        fontSize: 'clamp(11px,1vw,14px)', color: connected ? '#16a34a' : '#d97706' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%',
          background: 'currentColor', display: 'inline-block' }} />
        {connected ? 'Live' : 'Connecting…'}
      </div>
    </div>
  );
}

const shell = {
  position: 'fixed', inset: 0, background: '#ffffff', color: '#0f172a',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
