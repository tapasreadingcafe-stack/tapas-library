import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// /cart — Modern Heritage redesign
// Tonal layering, Newsreader headings, no borders, ambient shadows.
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
    <div style={{
      maxWidth: '780px', margin: '0 auto',
      padding: '56px 20px 80px',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Heritage header */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
          color: 'var(--text-subtle, #8b7355)', textTransform: 'uppercase',
          letterSpacing: '1.5px', marginBottom: '8px',
        }}>Your order</p>
        <h1 style={{
          fontFamily: 'var(--font-display, Newsreader, serif)',
          fontSize: '36px', fontWeight: 500, color: 'var(--text, #26170c)',
          lineHeight: 1.2, margin: 0,
        }}>Your Cart</h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '15px',
          color: 'var(--text-muted, #5c4a3a)', marginTop: '8px',
        }}>
          {itemCount === 0
            ? 'Your cart is empty.'
            : `${itemCount} item${itemCount === 1 ? '' : 's'} ready for checkout`}
        </p>
      </div>

      {items.length === 0 ? (
        /* -------- Empty state -------- */
        <div style={{
          background: 'var(--bg-card, #ede8d0)',
          borderRadius: 'var(--radius-xl, 16px)',
          boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
          padding: '72px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.7 }}>📚</div>
          <h3 style={{
            fontFamily: 'var(--font-display, Newsreader, serif)',
            fontSize: '24px', fontWeight: 500, color: 'var(--text, #26170c)',
            marginBottom: '10px',
          }}>Nothing in your cart yet</h3>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '15px',
            color: 'var(--text-muted, #5c4a3a)', marginBottom: '28px',
          }}>
            Browse our shelves and add something wonderful.
          </p>
          <Link to="/books" className="tps-btn tps-btn-teal" style={{ fontSize: '15px', padding: '12px 28px' }}>
            Browse Books
          </Link>
        </div>
      ) : (
        <>
          {/* -------- Line items card -------- */}
          <div style={{
            background: 'var(--bg-card, #ede8d0)',
            borderRadius: 'var(--radius-xl, 16px)',
            boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 0' }}>
              {items.map((item) => (
                <div key={item.key} style={{
                  display: 'flex', gap: '18px', padding: '20px 24px',
                  alignItems: 'center', flexWrap: 'wrap',
                }}>
                  {/* Book cover */}
                  <div style={{
                    width: '72px', height: '100px', flexShrink: 0,
                    borderRadius: 'var(--radius-md, 10px)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-ambient, 0 1px 4px rgba(0,0,0,.06))',
                    background: 'var(--bg-section, #f5f5dc)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.type === 'book' && item.cover_image ? (
                      <img src={item.cover_image} alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '32px' }}>{item.type === 'membership' ? '🎫' : '📖'}</span>
                    )}
                  </div>

                  {/* Title + author + unit price */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{
                      fontFamily: 'var(--font-display, Newsreader, serif)',
                      fontWeight: 600, color: 'var(--text, #26170c)',
                      fontSize: '16px', marginBottom: '3px',
                    }}>
                      {item.title}
                    </div>
                    {item.author && (
                      <div style={{
                        fontSize: '13px', color: 'var(--text-muted, #5c4a3a)',
                        fontStyle: 'italic', marginBottom: '6px',
                      }}>
                        by {item.author}
                      </div>
                    )}
                    <div style={{
                      fontFamily: 'var(--font-display, Newsreader, serif)',
                      color: 'var(--accent, #c49040)', fontWeight: 600,
                      fontSize: '15px',
                    }}>
                      ₹{item.unit_price.toFixed(2)}
                    </div>
                  </div>

                  {/* Quantity stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.type === 'book' ? (
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        background: 'var(--bg-section, #f5f5dc)',
                        borderRadius: 'var(--radius-pill, 999px)',
                        padding: '4px',
                      }}>
                        <button
                          onClick={() => updateQty(item.key, item.quantity - 1)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            border: 'none', background: 'var(--bg, #fbfbe2)',
                            cursor: 'pointer', fontSize: '16px', color: 'var(--secondary, #006a6a)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, transition: 'transform 150ms',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >−</button>
                        <span style={{
                          minWidth: '36px', textAlign: 'center',
                          fontWeight: 800, color: 'var(--text, #26170c)', fontSize: '14px',
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.key, item.quantity + 1)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            border: 'none', background: 'var(--bg, #fbfbe2)',
                            cursor: 'pointer', fontSize: '16px', color: 'var(--secondary, #006a6a)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, transition: 'transform 150ms',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >+</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: 'var(--text-subtle, #8b7355)' }}>Qty: 1</span>
                    )}
                  </div>

                  {/* Line total + remove */}
                  <div style={{ minWidth: '100px', textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--font-display, Newsreader, serif)',
                      fontWeight: 600, color: 'var(--accent, #c49040)',
                      fontSize: '18px',
                    }}>
                      ₹{(item.unit_price * item.quantity).toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeItem(item.key)}
                      style={{
                        marginTop: '4px', background: 'none', border: 'none',
                        color: 'var(--text-subtle, #8b7355)', fontSize: '12px',
                        cursor: 'pointer', fontWeight: 600,
                        textDecoration: 'underline', textUnderlineOffset: '2px',
                      }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal bar */}
            <div style={{
              padding: '22px 24px',
              background: 'var(--bg-inset, #e6e1c8)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '16px',
            }}>
              <button
                onClick={clear}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-subtle, #8b7355)', fontSize: '13px',
                  cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)',
                  textDecoration: 'underline', textUnderlineOffset: '2px',
                }}
              >
                Clear Cart
              </button>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px',
                  fontWeight: 700, color: 'var(--text-subtle, #8b7355)', marginBottom: '4px',
                }}>Subtotal</div>
                <div style={{
                  fontFamily: 'var(--font-display, Newsreader, serif)',
                  fontSize: '32px', fontWeight: 500, color: 'var(--accent, #c49040)',
                  letterSpacing: '-0.02em',
                }}>
                  ₹{subtotal.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div style={{
            marginTop: '28px', display: 'flex', gap: '12px',
            justifyContent: 'flex-end', flexWrap: 'wrap',
          }}>
            <Link to="/books" className="tps-btn" style={{
              background: 'transparent',
              color: 'var(--secondary, #006a6a)',
              border: '1.5px solid var(--secondary, #006a6a)',
              fontWeight: 600, fontSize: '14px',
            }}>
              Continue Shopping
            </Link>
            <button onClick={handleCheckout} className="tps-btn tps-btn-teal" style={{
              fontSize: '15px', padding: '12px 28px',
            }}>
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
