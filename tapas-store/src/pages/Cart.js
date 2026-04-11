import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// /cart — 2025-2026 redesign
// Rounded card layout, modern quantity steppers, dark-mode aware.
// =====================================================================

export default function Cart() {
  const navigate = useNavigate();
  const { items, itemCount, subtotal, updateQty, removeItem, clear } = useCart();
  const { member } = useAuth();

  const handleCheckout = () => {
    if (!member) {
      navigate('/login?next=/checkout');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="tps-container-narrow" style={{ padding:'56px 20px 80px', fontFamily:'var(--font-body)' }}>
      <div style={{ marginBottom:'36px' }}>
        <div className="tps-eyebrow" style={{ marginBottom:'10px' }}>Your order</div>
        <h1 className="tps-h1" style={{ marginBottom:'8px' }}>🛒 Cart</h1>
        <p className="tps-subtle" style={{ fontSize:'15px' }}>
          {itemCount === 0 ? 'Your cart is empty.' : `${itemCount} item${itemCount === 1 ? '' : 's'} ready for checkout`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="tps-card" style={{ padding:'72px 20px', textAlign:'center' }}>
          <div style={{ fontSize:'72px', marginBottom:'20px' }}>🛒</div>
          <h3 className="tps-h4" style={{ marginBottom:'8px' }}>Nothing in your cart yet</h3>
          <p className="tps-subtle" style={{ fontSize:'15px', marginBottom:'28px' }}>
            Browse our shelves and add something wonderful.
          </p>
          <Link to="/books" className="tps-btn tps-btn-primary tps-btn-lg">
            Browse Books →
          </Link>
        </div>
      ) : (
        <>
          <div className="tps-card">
            {items.map((item, idx) => (
              <div key={item.key} style={{
                display:'flex', gap:'18px', padding:'22px',
                borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--border)',
                alignItems:'center', flexWrap:'wrap',
              }}>
                <div style={{
                  width:'74px', height:'100px', flexShrink:0,
                  background:'linear-gradient(145deg, #F5DEB3, #D4A853)',
                  borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', justifyContent:'center',
                  overflow:'hidden', boxShadow:'var(--shadow-sm)',
                }}>
                  {item.type === 'book' && item.cover_image ? (
                    <img src={item.cover_image} alt={item.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <span style={{ fontSize:'34px' }}>{item.type === 'membership' ? '🎫' : '📖'}</span>
                  )}
                </div>

                <div style={{ flex:1, minWidth:'200px' }}>
                  <div style={{ fontFamily:'var(--font-heading)', fontWeight:'700', color:'var(--text)', fontSize:'16px', marginBottom:'4px' }}>
                    {item.title}
                  </div>
                  {item.author && (
                    <div className="tps-subtle" style={{ fontSize:'13px', marginBottom:'6px', fontStyle:'italic' }}>
                      by {item.author}
                    </div>
                  )}
                  <div style={{ color:'var(--brand-accent)', fontWeight:'700', fontSize:'15px', fontFamily:'var(--font-heading)' }}>
                    ₹{item.unit_price.toFixed(2)}
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  {item.type === 'book' ? (
                    <div style={{
                      display:'flex', alignItems:'center',
                      background:'var(--bg-muted)',
                      borderRadius:'var(--radius-pill)',
                      padding:'4px',
                      border:'1px solid var(--border)',
                    }}>
                      <button
                        onClick={() => updateQty(item.key, item.quantity - 1)}
                        style={{
                          width:'30px', height:'30px', borderRadius:'50%',
                          border:'none', background:'var(--surface)',
                          cursor:'pointer', fontSize:'16px', color:'var(--text)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          transition:'transform 150ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >−</button>
                      <span style={{ minWidth:'34px', textAlign:'center', fontWeight:'800', color:'var(--text)', fontSize:'14px' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.key, item.quantity + 1)}
                        style={{
                          width:'30px', height:'30px', borderRadius:'50%',
                          border:'none', background:'var(--surface)',
                          cursor:'pointer', fontSize:'16px', color:'var(--text)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          transition:'transform 150ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >+</button>
                    </div>
                  ) : (
                    <span className="tps-subtle" style={{ fontSize:'13px' }}>Qty: 1</span>
                  )}
                </div>

                <div style={{ minWidth:'110px', textAlign:'right' }}>
                  <div style={{ fontWeight:'800', color:'var(--text)', fontSize:'18px', fontFamily:'var(--font-heading)' }}>
                    ₹{(item.unit_price * item.quantity).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeItem(item.key)}
                    style={{
                      marginTop:'4px', background:'none', border:'none',
                      color:'var(--danger)', fontSize:'12px', cursor:'pointer',
                      fontWeight:'600',
                    }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div style={{
              padding:'24px',
              background:'var(--bg-subtle)',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              flexWrap:'wrap', gap:'16px',
              borderTop:'1px solid var(--border)',
            }}>
              <button
                onClick={clear}
                className="tps-btn tps-btn-ghost tps-btn-sm"
                style={{ color:'var(--danger)' }}
              >
                Clear Cart
              </button>
              <div style={{ textAlign:'right' }}>
                <div className="tps-subtle" style={{ fontSize:'12px', textTransform:'uppercase', letterSpacing:'1px', fontWeight:'700' }}>Subtotal</div>
                <div style={{ fontFamily:'var(--font-heading)', fontSize:'32px', fontWeight:'800', color:'var(--text)', letterSpacing:'-0.02em' }}>
                  ₹{subtotal.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop:'28px', display:'flex', gap:'12px', justifyContent:'flex-end', flexWrap:'wrap' }}>
            <Link to="/books" className="tps-btn tps-btn-secondary">
              ← Continue Shopping
            </Link>
            <button onClick={handleCheckout} className="tps-btn tps-btn-primary tps-btn-lg">
              Proceed to Checkout →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
