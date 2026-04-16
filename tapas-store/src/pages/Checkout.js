import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// /checkout — Phase 9 upgrade
//
// Adds:
//   - fulfillment toggle (pickup / delivery) with address form
//   - saved addresses dropdown + "save for next time"
//   - promo code input with client-side preview, validated server-side
//   - loyalty points redemption slider (1 pt = ₹1)
//   - cart abandonment snapshot so the insights hub can recover it
//
// The server is the source of truth: create-razorpay-order /
// place-pickup-order re-validate the promo code and address. This file
// just shows the preview + wires the payloads.
// =====================================================================

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const { member, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [fulfillment, setFulfillment] = useState('pickup');

  // Delivery address state
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressForm, setAddressForm] = useState({
    label: 'Home', recipient_name: '', phone: '',
    line1: '', line2: '', city: '', state: '', pincode: '', save: true,
  });

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);

  // Points state
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // Abandonment tracking
  const [snapshotId, setSnapshotId] = useState(null);

  useEffect(() => {
    if (!authLoading && !member) navigate('/login?next=/checkout');
  }, [authLoading, member, navigate]);

  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, [items.length, navigate]);

  // Load addresses + points + prefill form
  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    (async () => {
      const [addrRes, pointsRes] = await Promise.all([
        supabase.from('customer_addresses').select('*').eq('member_id', member.id).order('is_default', { ascending: false }).order('updated_at', { ascending: false }),
        supabase.from('loyalty_balances').select('balance').eq('member_id', member.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const list = addrRes.data || [];
      setAddresses(list);
      const def = list.find(a => a.is_default) || list[0];
      if (def) {
        setSelectedAddressId(def.id);
      }
      setAddressForm(prev => ({
        ...prev,
        recipient_name: member.name || '',
        phone: member.phone || '',
      }));
      setPointsBalance(pointsRes.data?.balance || 0);
    })();
    return () => { cancelled = true; };
  }, [member]);

  const buildPayloadItems = useCallback(() => items.map(i => {
    if (i.type === 'book') return { type: 'book', book_id: i.book_id, quantity: i.quantity };
    return { type: 'membership', membership_plan: i.membership_plan, membership_days: i.membership_days, quantity: 1 };
  }), [items]);

  // ------------------------------------------------------------------
  // Cart abandonment: write a snapshot when the checkout opens; mark it
  // completed when the order is placed. Fire-and-forget.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!member || items.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('cart_snapshots')
        .insert({
          member_id: member.id,
          items_json: items.map(i => ({
            type: i.type,
            book_id: i.book_id || null,
            title: i.title,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
          total: subtotal,
        })
        .select('id')
        .single();
      if (!cancelled && data) setSnapshotId(data.id);
    })();
    return () => { cancelled = true; };
  }, [member]); // eslint-disable-line

  const markSnapshotCompleted = async (orderId) => {
    if (!snapshotId) return;
    try {
      await supabase.from('cart_snapshots')
        .update({ completed_order_id: orderId })
        .eq('id', snapshotId);
    } catch {}
  };

  // ------------------------------------------------------------------
  // Promo code: preview discount client-side. Server re-validates.
  // ------------------------------------------------------------------
  const computePromoDiscount = (promo, net) => {
    if (!promo) return 0;
    const minOK = !promo.min_total || net >= Number(promo.min_total);
    if (!minOK) return 0;
    let d = promo.kind === 'percent'
      ? (net * Number(promo.value)) / 100
      : Number(promo.value);
    if (promo.max_discount) d = Math.min(d, Number(promo.max_discount));
    return Math.min(d, net);
  };

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    setPromoError('');
    if (!code) return;
    setPromoBusy(true);
    try {
      const nowIso = new Date().toISOString();
      const { data, error: err } = await supabase
        .from('store_promo_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();
      if (err) throw err;
      if (!data) { setPromoError('That code doesn\'t look right.'); setAppliedPromo(null); return; }
      if (data.starts_at && data.starts_at > nowIso) { setPromoError('This code isn\'t active yet.'); setAppliedPromo(null); return; }
      if (data.expires_at && data.expires_at < nowIso) { setPromoError('This code has expired.'); setAppliedPromo(null); return; }
      if (data.min_total && subtotal < Number(data.min_total)) {
        setPromoError(`Requires a cart total of at least ₹${Number(data.min_total).toFixed(0)}.`);
        setAppliedPromo(null); return;
      }
      setAppliedPromo(data);
    } catch (e) {
      setPromoError(e.message || 'Could not check that code.');
    } finally {
      setPromoBusy(false);
    }
  };

  const clearPromo = () => { setAppliedPromo(null); setPromoInput(''); setPromoError(''); };

  // ------------------------------------------------------------------
  // Totals
  // ------------------------------------------------------------------
  const promoDiscount = computePromoDiscount(appliedPromo, subtotal);
  const afterPromo = Math.max(0, subtotal - promoDiscount);
  const maxPoints = Math.min(pointsBalance, Math.floor(afterPromo));
  const effectivePoints = Math.min(pointsToRedeem, maxPoints);
  const total = Math.max(0, afterPromo - effectivePoints);

  if (authLoading || !member) return null;
  if (items.length === 0) return null;

  // ------------------------------------------------------------------
  // Address persistence — returns an address id suitable for the order.
  // ------------------------------------------------------------------
  const ensureShippingAddressId = async () => {
    if (fulfillment !== 'delivery') return null;
    if (selectedAddressId && selectedAddressId !== '__new__') return selectedAddressId;

    const { recipient_name, phone, line1, city, pincode } = addressForm;
    if (!recipient_name || !phone || !line1 || !city || !pincode) {
      throw new Error('Please fill in the full delivery address.');
    }
    const payload = {
      member_id: member.id,
      label: addressForm.label || null,
      recipient_name, phone,
      line1, line2: addressForm.line2 || null,
      city, state: addressForm.state || null,
      pincode,
      is_default: addresses.length === 0,
    };
    const { data, error: err } = await supabase
      .from('customer_addresses')
      .insert(payload)
      .select('id')
      .single();
    if (err) throw err;
    return data.id;
  };

  const commonOrderExtras = async () => ({
    fulfillment_type: fulfillment,
    shipping_address_id: await ensureShippingAddressId(),
    promo_code: appliedPromo?.code || null,
    points_to_redeem: effectivePoints,
    snapshot_id: snapshotId,
  });

  // ------------------------------------------------------------------
  // Place pickup order (server adjusts totals).
  // ------------------------------------------------------------------
  const handlePlacePickupOrder = async () => {
    setError('');
    setProcessing(true);
    try {
      const extras = await commonOrderExtras();
      const { data, error: fnErr } = await supabase.functions.invoke('place-pickup-order', {
        body: { items: buildPayloadItems(), ...extras },
      });
      if (fnErr || !data?.ok) {
        if (data?.error === 'insufficient_stock') {
          throw new Error('Sorry, one of the books in your cart just went out of stock. Please remove it and try again.');
        }
        throw new Error(fnErr?.message || data?.error || 'Failed to place order');
      }
      await markSnapshotCompleted(data.customer_order_id);
      clear();
      navigate(`/order/${data.customer_order_id}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  const razorpayEnabled = !!process.env.REACT_APP_RAZORPAY_KEY_ID;

  const handleRazorpayPay = async () => {
    setError('');
    setProcessing(true);
    try {
      if (!window.Razorpay) throw new Error('Payment system not loaded. Please refresh and try again.');
      const extras = await commonOrderExtras();
      const { data: createData, error: createErr } = await supabase.functions.invoke('create-razorpay-order', {
        body: { items: buildPayloadItems(), ...extras },
      });
      if (createErr || !createData?.razorpay_order_id) {
        throw new Error(createErr?.message || createData?.error || 'Failed to create order');
      }
      const rzp = new window.Razorpay({
        key: createData.key_id,
        amount: createData.amount,
        currency: createData.currency || 'INR',
        order_id: createData.razorpay_order_id,
        name: 'Tapas Reading Cafe',
        description: `Order #${createData.order_number}`,
        prefill: {
          name: createData.member?.name || member.name || '',
          email: createData.member?.email || member.email || '',
          contact: createData.member?.phone || member.phone || '',
        },
        theme: { color: '#006a6a' },
        handler: async (response) => {
          try {
            await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
          } catch (err) {
            console.error('[Checkout] verify handler error', err);
          }
          await markSnapshotCompleted(createData.customer_order_id);
          clear();
          navigate(`/order/${createData.customer_order_id}`);
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      rzp.open();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  const labelStyle = {
    fontFamily: 'var(--font-display, Newsreader, serif)',
    fontSize: '13px', fontWeight: 500,
    color: 'var(--text-subtle, #8b7355)',
    marginBottom: '4px',
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    fontSize: '14px', fontFamily: 'var(--font-body)',
    border: '1.5px solid var(--bg-inset)',
    background: 'white', borderRadius: 'var(--radius-md, 10px)',
    color: 'var(--text)', outline: 'none',
  };

  const fulfillmentDeliverable = true; // delivery is live in Phase 9

  return (
    <div style={{
      maxWidth: '1080px', margin: '0 auto',
      padding: '56px 20px 80px',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <p style={{
          fontSize: '13px', fontWeight: 600,
          color: 'var(--text-subtle, #8b7355)', textTransform: 'uppercase',
          letterSpacing: '1.5px', marginBottom: '8px',
        }}>Almost there</p>
        <h1 style={{
          fontFamily: 'var(--font-display, Newsreader, serif)',
          fontSize: '36px', fontWeight: 500, color: 'var(--text, #26170c)',
          lineHeight: 1.2, margin: 0,
        }}>Checkout</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted, #5c4a3a)', marginTop: '8px' }}>
          Review your order, apply offers, and confirm your fulfillment.
        </p>
      </div>

      <div className="checkout-grid" style={{
        display: 'grid', gridTemplateColumns: '1fr 380px', gap: '28px',
      }}>

        {/* ============ Left column ============ */}
        <div>
          {/* Fulfillment card */}
          <section className="tps-card" style={{
            background: 'var(--bg-card, #ede8d0)',
            borderRadius: 'var(--radius-xl, 16px)',
            boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
            padding: '28px', marginBottom: '20px', border: 'none',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display, Newsreader, serif)',
              fontSize: '20px', fontWeight: 500, color: 'var(--text, #26170c)',
              marginBottom: '18px', marginTop: 0,
            }}>Fulfillment</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Pickup */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '18px',
                borderRadius: 'var(--radius-md, 10px)',
                border: `2px solid ${fulfillment === 'pickup' ? 'var(--secondary, #006a6a)' : 'transparent'}`,
                background: fulfillment === 'pickup' ? 'rgba(0,106,106,0.06)' : 'var(--bg-section, #f5f5dc)',
                cursor: 'pointer',
              }}>
                <input type="radio" checked={fulfillment === 'pickup'} onChange={() => setFulfillment('pickup')}
                  style={{ accentColor: 'var(--secondary, #006a6a)', width: '18px', height: '18px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text, #26170c)', marginBottom: '2px', fontSize: '15px' }}>
                    In-store Pickup
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted, #5c4a3a)' }}>
                    Collect your order at Tapas Reading Cafe. We'll notify you when it's ready.
                  </div>
                </div>
              </label>

              {/* Delivery */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '18px',
                borderRadius: 'var(--radius-md, 10px)',
                border: `2px solid ${fulfillment === 'delivery' ? 'var(--secondary, #006a6a)' : 'transparent'}`,
                background: fulfillment === 'delivery' ? 'rgba(0,106,106,0.06)' : 'var(--bg-section, #f5f5dc)',
                cursor: fulfillmentDeliverable ? 'pointer' : 'not-allowed',
                opacity: fulfillmentDeliverable ? 1 : 0.55,
              }}>
                <input type="radio" disabled={!fulfillmentDeliverable} checked={fulfillment === 'delivery'}
                  onChange={() => setFulfillment('delivery')}
                  style={{ accentColor: 'var(--secondary, #006a6a)', width: '18px', height: '18px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text, #26170c)', marginBottom: '2px', fontSize: '15px' }}>
                    Home Delivery
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted, #5c4a3a)' }}>
                    Ships to your address. Tracking and ETA shown after we dispatch.
                  </div>
                </div>
              </label>
            </div>

            {/* Delivery address */}
            {fulfillment === 'delivery' && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--bg-inset)' }}>
                {addresses.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={labelStyle}>Use a saved address</div>
                    <select
                      value={selectedAddressId}
                      onChange={e => setSelectedAddressId(e.target.value)}
                      style={inputStyle}
                    >
                      {addresses.map(a => (
                        <option key={a.id} value={a.id}>
                          {(a.label ? a.label + ' — ' : '') + a.line1 + ', ' + a.city + ' ' + a.pincode}
                        </option>
                      ))}
                      <option value="__new__">+ Add a new address</option>
                    </select>
                  </div>
                )}

                {(addresses.length === 0 || selectedAddressId === '__new__') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={labelStyle}>Label (optional)</div>
                      <input style={inputStyle} value={addressForm.label}
                        onChange={e => setAddressForm(f => ({ ...f, label: e.target.value }))} placeholder="Home" />
                    </div>
                    <div>
                      <div style={labelStyle}>Recipient name *</div>
                      <input style={inputStyle} value={addressForm.recipient_name}
                        onChange={e => setAddressForm(f => ({ ...f, recipient_name: e.target.value }))} />
                    </div>
                    <div>
                      <div style={labelStyle}>Phone *</div>
                      <input style={inputStyle} value={addressForm.phone}
                        onChange={e => setAddressForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={labelStyle}>Address line 1 *</div>
                      <input style={inputStyle} value={addressForm.line1}
                        onChange={e => setAddressForm(f => ({ ...f, line1: e.target.value }))} placeholder="Flat / building / street" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={labelStyle}>Address line 2</div>
                      <input style={inputStyle} value={addressForm.line2}
                        onChange={e => setAddressForm(f => ({ ...f, line2: e.target.value }))} placeholder="Landmark / locality" />
                    </div>
                    <div>
                      <div style={labelStyle}>City *</div>
                      <input style={inputStyle} value={addressForm.city}
                        onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div>
                      <div style={labelStyle}>State</div>
                      <input style={inputStyle} value={addressForm.state}
                        onChange={e => setAddressForm(f => ({ ...f, state: e.target.value }))} />
                    </div>
                    <div>
                      <div style={labelStyle}>Pincode *</div>
                      <input style={inputStyle} value={addressForm.pincode}
                        onChange={e => setAddressForm(f => ({ ...f, pincode: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Offers card: promo code + points */}
          <section className="tps-card" style={{
            background: 'var(--bg-card, #ede8d0)',
            borderRadius: 'var(--radius-xl, 16px)',
            boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
            padding: '28px', marginBottom: '20px', border: 'none',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display, Newsreader, serif)',
              fontSize: '20px', fontWeight: 500, color: 'var(--text, #26170c)',
              marginBottom: '18px', marginTop: 0,
            }}>Offers & Rewards</h2>

            {/* Promo */}
            <div style={{ marginBottom: '16px' }}>
              <div style={labelStyle}>Promo code</div>
              {appliedPromo ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(0,106,106,0.08)',
                  borderRadius: 'var(--radius-md, 10px)',
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>✓ {appliedPromo.code}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {appliedPromo.kind === 'percent'
                      ? `-${appliedPromo.value}%`
                      : `-₹${Number(appliedPromo.value).toFixed(0)}`}
                    {' · '}−₹{promoDiscount.toFixed(2)}
                  </span>
                  <button onClick={clearPromo} style={{
                    marginLeft: 'auto',
                    background: 'transparent', border: 'none',
                    color: 'var(--text-subtle)', fontSize: '13px', cursor: 'pointer',
                  }}>Remove</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    style={{ ...inputStyle, flex: 1, textTransform: 'uppercase' }}
                  />
                  <button onClick={applyPromo} disabled={promoBusy || !promoInput.trim()}
                    className="tps-btn tps-btn-teal">
                    {promoBusy ? '…' : 'Apply'}
                  </button>
                </div>
              )}
              {promoError && (
                <div style={{ color: '#a63d3d', fontSize: '13px', marginTop: '8px', fontWeight: 600 }}>
                  {promoError}
                </div>
              )}
            </div>

            {/* Points */}
            {pointsBalance > 0 && (
              <div style={{
                paddingTop: '16px',
                borderTop: '1px dashed var(--bg-inset)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={labelStyle}>Redeem loyalty points (1 pt = ₹1)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                    Balance: <strong style={{ color: 'var(--text)' }}>{pointsBalance}</strong>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxPoints}
                  value={Math.min(pointsToRedeem, maxPoints)}
                  onChange={e => setPointsToRedeem(parseInt(e.target.value, 10) || 0)}
                  style={{ width: '100%', accentColor: 'var(--secondary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>{effectivePoints} pts</span>
                  <span>−₹{effectivePoints.toFixed(2)}</span>
                </div>
              </div>
            )}
          </section>

          {/* Customer details card */}
          <section className="tps-card" style={{
            background: 'var(--bg-card, #ede8d0)',
            borderRadius: 'var(--radius-xl, 16px)',
            boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
            padding: '28px', border: 'none',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display, Newsreader, serif)',
              fontSize: '20px', fontWeight: 500, color: 'var(--text, #26170c)',
              marginBottom: '18px', marginTop: 0,
            }}>Customer Details</h2>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px',
              fontSize: '14px', color: 'var(--text-muted, #5c4a3a)',
            }}>
              <div>
                <div style={labelStyle}>Name</div>
                <div style={{ fontWeight: 600, color: 'var(--text, #26170c)' }}>{member.name || '(not set)'}</div>
              </div>
              <div>
                <div style={labelStyle}>Email</div>
                <div style={{ fontWeight: 600, color: 'var(--text, #26170c)' }}>{member.email}</div>
              </div>
              <div>
                <div style={labelStyle}>Phone</div>
                <div style={{ fontWeight: 600, color: 'var(--text, #26170c)' }}>{member.phone || '(not set)'}</div>
              </div>
            </div>
            <Link to="/profile" style={{
              display: 'inline-block', marginTop: '16px',
              color: 'var(--secondary, #006a6a)', fontSize: '13px',
              fontWeight: 700, textDecoration: 'none',
            }}>
              Edit in profile
            </Link>
          </section>
        </div>

        {/* ============ Right column: sticky order summary ============ */}
        <div>
          <div style={{
            position: 'sticky', top: '90px',
            background: 'var(--bg-card, #ede8d0)',
            borderRadius: 'var(--radius-xl, 16px)',
            boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
            padding: '28px',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display, Newsreader, serif)',
              fontSize: '20px', fontWeight: 500, color: 'var(--text, #26170c)',
              marginBottom: '18px', marginTop: 0,
            }}>Order Summary</h2>

            {/* Line items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {items.map(item => (
                <div key={item.key} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '13px', color: 'var(--text-muted, #5c4a3a)',
                }}>
                  <span style={{
                    flex: 1, marginRight: '8px', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.title} x {item.quantity}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text, #26170c)' }}>
                    ₹{(item.unit_price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{
              background: 'var(--bg-inset, #e6e1c8)',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '16px', marginTop: '8px',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: '13px', color: 'var(--text-subtle, #8b7355)', marginBottom: '6px' }}>
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {appliedPromo && promoDiscount > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize: '13px', color: 'var(--secondary)', marginBottom: '6px' }}>
                  <span>Promo ({appliedPromo.code})</span>
                  <span>−₹{promoDiscount.toFixed(2)}</span>
                </div>
              )}
              {effectivePoints > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize: '13px', color: 'var(--secondary)', marginBottom: '6px' }}>
                  <span>Points redeemed</span>
                  <span>−₹{effectivePoints.toFixed(2)}</span>
                </div>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.08)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display, Newsreader, serif)',
                  fontSize: '16px', fontWeight: 500, color: 'var(--text, #26170c)',
                }}>Total</span>
                <span style={{
                  fontFamily: 'var(--font-display, Newsreader, serif)',
                  fontSize: '26px', fontWeight: 500, color: 'var(--accent, #c49040)',
                }}>₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: '16px', padding: '12px 16px',
                background: 'rgba(180,60,60,0.08)',
                borderRadius: 'var(--radius-md, 10px)',
                color: '#a63d3d', fontSize: '13px', lineHeight: 1.5,
                textAlign: 'center', fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            {/* Primary CTA */}
            <button
              onClick={handlePlacePickupOrder}
              disabled={processing}
              className="tps-btn tps-btn-teal tps-btn-lg tps-btn-block"
              style={{ marginTop: '22px', width: '100%' }}
            >
              {processing ? 'Reserving...' : fulfillment === 'delivery' ? 'Place delivery order' : 'Reserve & Pay on Pickup'}
            </button>
            <p style={{
              marginTop: '12px', textAlign: 'center', fontSize: '12px',
              lineHeight: 1.6, color: 'var(--text-subtle, #8b7355)',
            }}>
              {fulfillment === 'delivery'
                ? 'We\'ll ship your order and send a tracking link.'
                : <>We'll hold your books at Tapas Reading Cafe.<br />Pay cash or UPI when you collect them.</>
              }
            </p>

            {/* Razorpay */}
            {razorpayEnabled ? (
              <button
                onClick={handleRazorpayPay}
                disabled={processing}
                className="tps-btn tps-btn-primary tps-btn-block"
                style={{ marginTop: '12px', width: '100%' }}
              >
                Or pay online with Razorpay
              </button>
            ) : (
              <div style={{
                marginTop: '14px', padding: '14px',
                borderRadius: 'var(--radius-md, 10px)',
                border: '1.5px dashed var(--secondary, #006a6a)',
                background: 'rgba(0,106,106,0.04)',
                textAlign: 'center', color: 'var(--secondary, #006a6a)',
                fontSize: '12px', fontWeight: 600,
              }}>
                Online payment (Razorpay) coming soon
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
