import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useReactToPrint } from 'react-to-print';
import { useToast } from '../components/Toast';
import { logActivity, ACTIONS } from '../utils/activityLog';

const SETUP_SQL = `
-- Run this SQL in your Supabase SQL Editor to create cafe tables:

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

CREATE TABLE IF NOT EXISTS cafe_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES cafe_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES cafe_menu_items(id),
  item_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_price NUMERIC NOT NULL
);

ALTER TABLE cafe_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON cafe_menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON cafe_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON cafe_order_items FOR ALL USING (true) WITH CHECK (true);
`;

const CATEGORIES = ['All', 'Tea', 'Coffee', 'Juice', 'Bakery', 'Snacks', 'Other'];

export default function CafePOS() {
  const toast = useToast();
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [todayStats, setTodayStats] = useState({ orders: 0, revenue: 0 });
  const receiptRef = useRef();

  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  useEffect(() => {
    checkTable();
  }, []);

  const checkTable = async () => {
    try {
      const { error } = await supabase.from('cafe_menu_items').select('id').limit(0);
      if (error) { setTableReady(false); setLoading(false); return; }
      setTableReady(true);
      fetchData();
    } catch { setTableReady(false); setLoading(false); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [{ data: items }, { data: orders }] = await Promise.all([
        supabase.from('cafe_menu_items').select('*').eq('is_available', true).order('display_order'),
        supabase.from('cafe_orders').select('total_amount').gte('created_at', today + 'T00:00:00').eq('status', 'completed'),
      ]);
      setMenuItems(items || []);
      setTodayStats({
        orders: (orders || []).length,
        revenue: (orders || []).reduce((s, o) => s + (o.total_amount || 0), 0),
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const filteredItems = menuItems.filter(item => {
    if (activeCategory !== 'All' && item.category?.toLowerCase() !== activeCategory.toLowerCase()) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(c => c.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const change = paymentMethod === 'cash' && cashReceived ? Math.max(0, parseFloat(cashReceived) - total) : 0;

  const searchMembers = async (q) => {
    setMemberSearch(q);
    if (q.length < 2) { setMemberResults([]); return; }
    const { data } = await supabase.from('members').select('id, name, phone').or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(5);
    setMemberResults(data || []);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const orderData = {
        member_id: selectedMember?.id || null,
        customer_name: selectedMember?.name || customerName || 'Walk-in',
        total_amount: total,
        discount_amount: discount,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) || total : null,
        change_given: paymentMethod === 'cash' ? change : 0,
        status: 'completed',
      };
      const { data: order, error } = await supabase.from('cafe_orders').insert([orderData]).select().single();
      if (error) throw error;

      const items = cart.map(c => ({
        order_id: order.id,
        menu_item_id: c.id,
        item_name: c.name,
        unit_price: c.price,
        quantity: c.qty,
        total_price: c.price * c.qty,
      }));
      await supabase.from('cafe_order_items').insert(items);

      setLastOrder({ ...order, items: cart, customerName: orderData.customer_name });
      toast.success(`Order placed - ₹${total.toLocaleString('en-IN')}`);
      logActivity(ACTIONS.ORDER_PLACED, `Cafe order: ₹${total} for ${orderData.customer_name}`, { amount: total, customer: orderData.customer_name, items: cart.length });
      setShowReceipt(true);
      setCart([]);
      setCustomerName('');
      setSelectedMember(null);
      setMemberSearch('');
      setCashReceived('');
      setDiscount(0);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Error placing order: ' + err.message);
    }
    setProcessing(false);
  };

  if (!tableReady) {
    return (
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>☕ Cafe POS</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '8px' }}>Setup Required</h3>
          <p style={{ marginBottom: '12px', fontSize: '14px' }}>Run the following SQL in your Supabase SQL Editor:</p>
          <pre style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', maxHeight: '300px', whiteSpace: 'pre-wrap' }}>{SETUP_SQL}</pre>
          <button onClick={checkTable} style={{ marginTop: '12px', padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cafe-pos-page">
      <style>{`
        .cafe-pos-page { padding: 20px; }
        .cafe-pos-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .cafe-pos-header h1 { font-size: 28px; margin: 0; }
        .cafe-pos-stats { display: flex; gap: 16px; }
        .cafe-pos-stat { background: white; padding: 8px 16px; border-radius: 8px; text-align: center; }
        .cafe-pos-stat .val { font-size: 18px; font-weight: 700; color: #667eea; }
        .cafe-pos-stat .lbl { font-size: 11px; color: #999; }
        .cafe-pos-grid { display: grid; grid-template-columns: 1fr 380px; gap: 16px; }
        .cafe-menu-panel { background: white; border-radius: 8px; padding: 16px; }
        .cafe-cart-panel { background: white; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; }
        .cafe-cats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .cafe-cat-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid #e0e0e0; background: white; cursor: pointer; font-size: 13px; transition: all 0.2s; }
        .cafe-cat-btn.active { background: #667eea; color: white; border-color: #667eea; }
        .cafe-item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; overflow-y: auto; max-height: calc(100vh - 300px); }
        .cafe-item-card { border: 1px solid #eee; border-radius: 8px; padding: 12px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .cafe-item-card:hover { border-color: #667eea; box-shadow: 0 2px 8px rgba(102,126,234,0.15); transform: translateY(-1px); }
        .cafe-item-card .item-img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; margin-bottom: 6px; }
        .cafe-item-card .item-name { font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #333; }
        .cafe-item-card .item-price { font-size: 14px; font-weight: 700; color: #667eea; }
        .cafe-item-placeholder { width: 60px; height: 60px; border-radius: 8px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 6px; }
        .cafe-search { width: 100%; padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; margin-bottom: 12px; }
        .cafe-cart-items { flex: 1; overflow-y: auto; margin-bottom: 12px; }
        .cafe-cart-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .cafe-cart-item .name { flex: 1; font-size: 13px; font-weight: 500; }
        .cafe-cart-item .price { font-size: 13px; color: #667eea; font-weight: 600; min-width: 60px; text-align: right; }
        .cafe-qty-controls { display: flex; align-items: center; gap: 4px; }
        .cafe-qty-btn { width: 24px; height: 24px; border-radius: 50%; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
        .cafe-qty-btn:hover { background: #667eea; color: white; border-color: #667eea; }
        .cafe-cart-remove { background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 16px; padding: 2px; }
        .cafe-cart-summary { border-top: 2px solid #eee; padding-top: 12px; }
        .cafe-cart-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
        .cafe-cart-row.total { font-weight: 700; font-size: 18px; color: #667eea; border-top: 1px solid #eee; padding-top: 8px; margin-top: 4px; }
        .cafe-customer { margin-bottom: 12px; }
        .cafe-customer input { width: 100%; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; margin-top: 4px; }
        .cafe-member-results { background: white; border: 1px solid #e0e0e0; border-radius: 6px; max-height: 120px; overflow-y: auto; }
        .cafe-member-result { padding: 8px 10px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
        .cafe-member-result:hover { background: #f0f3ff; }
        .cafe-payment-methods { display: flex; gap: 6px; margin: 8px 0; }
        .cafe-pay-btn { flex: 1; padding: 8px; border: 2px solid #e0e0e0; border-radius: 6px; background: white; cursor: pointer; font-size: 13px; font-weight: 600; text-align: center; transition: all 0.2s; }
        .cafe-pay-btn.active { border-color: #667eea; background: rgba(102,126,234,0.1); color: #667eea; }
        .cafe-place-order { width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; transition: background 0.2s; }
        .cafe-place-order:hover:not(:disabled) { background: #5568d3; }
        .cafe-place-order:disabled { opacity: 0.5; cursor: not-allowed; }
        .cafe-receipt-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .cafe-receipt-modal { background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; max-height: 90vh; overflow-y: auto; }
        .cafe-receipt { font-family: monospace; font-size: 12px; }
        .cafe-receipt h3 { text-align: center; margin-bottom: 8px; font-family: inherit; }
        .cafe-receipt hr { border: none; border-top: 1px dashed #ccc; margin: 8px 0; }
        .cafe-receipt-actions { display: flex; gap: 8px; margin-top: 16px; }
        .cafe-receipt-actions button { flex: 1; padding: 8px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; }

        @media (max-width: 900px) {
          .cafe-pos-grid { grid-template-columns: 1fr; }
          .cafe-item-grid { max-height: 40vh; }
        }
        @media (max-width: 480px) {
          .cafe-pos-page { padding: 8px; }
          .cafe-pos-header h1 { font-size: 22px; }
          .cafe-pos-stats { flex-wrap: wrap; gap: 8px; }
          .cafe-item-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
          .cafe-item-card { padding: 8px; }
          .cafe-item-placeholder { width: 44px; height: 44px; font-size: 22px; }
        }
      `}</style>

      <div className="cafe-pos-header">
        <h1>☕ Cafe POS</h1>
        <div className="cafe-pos-stats">
          <div className="cafe-pos-stat">
            <div className="val">{todayStats.orders}</div>
            <div className="lbl">TODAY'S ORDERS</div>
          </div>
          <div className="cafe-pos-stat">
            <div className="val">₹{todayStats.revenue.toLocaleString('en-IN')}</div>
            <div className="lbl">TODAY'S REVENUE</div>
          </div>
        </div>
      </div>

      <div className="cafe-pos-grid">
        {/* LEFT: Menu */}
        <div className="cafe-menu-panel">
          <input className="cafe-search" placeholder="Search menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <div className="cafe-cats">
            {CATEGORIES.map(cat => (
              <button key={cat} className={`cafe-cat-btn ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
          {loading ? (
            <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>Loading menu...</p>
          ) : filteredItems.length === 0 ? (
            <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>No items found. Add items from "Manage Menu".</p>
          ) : (
            <div className="cafe-item-grid">
              {filteredItems.map(item => (
                <div key={item.id} className="cafe-item-card" onClick={() => addToCart(item)}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="item-img" />
                  ) : (
                    <div className="cafe-item-placeholder">
                      {item.category === 'tea' ? '🍵' : item.category === 'coffee' ? '☕' : item.category === 'juice' ? '🧃' : item.category === 'bakery' ? '🍰' : '🍽️'}
                    </div>
                  )}
                  <div className="item-name">{item.name}</div>
                  <div className="item-price">₹{item.price}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Cart */}
        <div className="cafe-cart-panel">
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '700' }}>🛒 Order</h3>

          {/* Customer */}
          <div className="cafe-customer">
            <label style={{ fontSize: '12px', color: '#999', fontWeight: '600' }}>CUSTOMER (optional)</label>
            {selectedMember ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f0f3ff', borderRadius: '6px', marginTop: '4px' }}>
                <span style={{ flex: 1, fontSize: '13px' }}>👤 {selectedMember.name}</span>
                <button onClick={() => { setSelectedMember(null); setMemberSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c' }}>✕</button>
              </div>
            ) : (
              <>
                <input placeholder="Search member or type name..." value={memberSearch || customerName} onChange={e => { const v = e.target.value; setCustomerName(v); searchMembers(v); }} />
                {memberResults.length > 0 && (
                  <div className="cafe-member-results">
                    {memberResults.map(m => (
                      <div key={m.id} className="cafe-member-result" onClick={() => { setSelectedMember(m); setMemberResults([]); setMemberSearch(m.name); }}>
                        {m.name} - {m.phone}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Cart items */}
          <div className="cafe-cart-items">
            {cart.length === 0 ? (
              <p style={{ color: '#ccc', textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>Tap items to add to order</p>
            ) : cart.map(item => (
              <div key={item.id} className="cafe-cart-item">
                <span className="name">{item.name}</span>
                <div className="cafe-qty-controls">
                  <button className="cafe-qty-btn" onClick={() => updateQty(item.id, -1)}>-</button>
                  <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                  <button className="cafe-qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                </div>
                <span className="price">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                <button className="cafe-cart-remove" onClick={() => removeFromCart(item.id)}>✕</button>
              </div>
            ))}
          </div>

          {/* Summary */}
          {cart.length > 0 && (
            <div className="cafe-cart-summary">
              <div className="cafe-cart-row"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
              <div className="cafe-cart-row">
                <span>Discount</span>
                <input type="number" value={discount || ''} onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: '80px', textAlign: 'right', padding: '2px 6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                  placeholder="₹0" />
              </div>
              <div className="cafe-cart-row total"><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>

              {/* Payment */}
              <label style={{ fontSize: '12px', color: '#999', fontWeight: '600', marginTop: '8px', display: 'block' }}>PAYMENT METHOD</label>
              <div className="cafe-payment-methods">
                {['cash', 'upi', 'card'].map(m => (
                  <button key={m} className={`cafe-pay-btn ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>
                    {m === 'cash' ? '💵 Cash' : m === 'upi' ? '📱 UPI' : '💳 Card'}
                  </button>
                ))}
              </div>

              {paymentMethod === 'cash' && (
                <div style={{ marginTop: '6px' }}>
                  <input type="number" placeholder="Cash received" value={cashReceived} onChange={e => setCashReceived(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }} />
                  {cashReceived && <div style={{ fontSize: '13px', color: '#27ae60', fontWeight: '600', marginTop: '4px' }}>Change: ₹{change.toLocaleString('en-IN')}</div>}
                </div>
              )}

              <button className="cafe-place-order" onClick={placeOrder} disabled={processing || cart.length === 0}>
                {processing ? 'Processing...' : `Place Order - ₹${total.toLocaleString('en-IN')}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <div className="cafe-receipt-overlay" onClick={() => setShowReceipt(false)}>
          <div className="cafe-receipt-modal" onClick={e => e.stopPropagation()}>
            <div ref={receiptRef} className="cafe-receipt" style={{ padding: '16px' }}>
              <h3>☕ Tapas Reading Cafe</h3>
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#999' }}>Order #{lastOrder.order_number || ''}</p>
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#999' }}>{new Date(lastOrder.created_at).toLocaleString('en-IN')}</p>
              <hr />
              <p>Customer: {lastOrder.customerName}</p>
              <hr />
              {lastOrder.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>{item.qty}x {item.name}</span>
                  <span>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <hr />
              {lastOrder.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><span>-₹{lastOrder.discount_amount}</span></div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '14px' }}>
                <span>Total</span><span>₹{lastOrder.total_amount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                <span>Payment</span><span>{lastOrder.payment_method?.toUpperCase()}</span>
              </div>
              {lastOrder.cash_received && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}><span>Received</span><span>₹{lastOrder.cash_received}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}><span>Change</span><span>₹{lastOrder.change_given}</span></div>
                </>
              )}
              <hr />
              <p style={{ textAlign: 'center', fontSize: '11px' }}>Thank you! Visit again.</p>
            </div>
            <div className="cafe-receipt-actions">
              <button onClick={handlePrint} style={{ background: '#667eea', color: 'white', border: 'none' }}>🖨️ Print</button>
              <button onClick={() => setShowReceipt(false)} style={{ background: '#e0e0e0', color: '#333', border: 'none' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
