import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// /cart — line items + subtotal + proceed-to-checkout.
//
// Cart is localStorage-backed (see CartContext). Checkout requires
// login; if not logged in, we bounce to /login with a return param.
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
    <div style={{ maxWidth:'900px', margin:'0 auto', padding:'40px 20px', fontFamily:'Lato, sans-serif' }}>
      <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', marginBottom:'8px' }}>
        🛒 Your Cart
      </h1>
      <p style={{ color:'#8B6914', marginBottom:'32px' }}>
        {itemCount === 0 ? 'Your cart is empty.' : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
      </p>

      {items.length === 0 ? (
        <div style={{ background:'white', borderRadius:'16px', padding:'60px 20px', textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize:'64px', marginBottom:'16px' }}>🛒</div>
          <p style={{ color:'#8B6914', fontSize:'16px', marginBottom:'24px' }}>
            Looks like you haven't added anything yet.
          </p>
          <Link to="/books" style={{
            display:'inline-block', padding:'12px 28px',
            background:'linear-gradient(135deg, #D4A853, #C49040)',
            color:'#2C1810', borderRadius:'24px', textDecoration:'none',
            fontWeight:'700', fontSize:'15px'
          }}>
            Browse Books →
          </Link>
        </div>
      ) : (
        <>
          <div style={{ background:'white', borderRadius:'16px', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
            {items.map(item => (
              <div key={item.key} style={{
                display:'flex', gap:'16px', padding:'20px',
                borderBottom:'1px solid #F5DEB3', alignItems:'center', flexWrap:'wrap'
              }}>
                <div style={{
                  width:'72px', height:'96px', flexShrink:0,
                  background:'linear-gradient(145deg, #F5DEB3, #D4A853)',
                  borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center',
                  overflow:'hidden'
                }}>
                  {item.type === 'book' && item.cover_image ? (
                    <img src={item.cover_image} alt={item.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <span style={{ fontSize:'32px' }}>{item.type === 'membership' ? '🎫' : '📖'}</span>
                  )}
                </div>

                <div style={{ flex:1, minWidth:'200px' }}>
                  <div style={{ fontWeight:'700', color:'#2C1810', fontSize:'16px', marginBottom:'4px' }}>
                    {item.title}
                  </div>
                  {item.author && (
                    <div style={{ color:'#8B6914', fontSize:'13px', marginBottom:'4px' }}>
                      by {item.author}
                    </div>
                  )}
                  <div style={{ color:'#D4A853', fontWeight:'700', fontSize:'15px' }}>
                    ₹{item.unit_price.toFixed(2)}
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  {item.type === 'book' ? (
                    <>
                      <button
                        onClick={() => updateQty(item.key, item.quantity - 1)}
                        style={{
                          width:'32px', height:'32px', borderRadius:'8px',
                          border:'1px solid #F5DEB3', background:'white',
                          cursor:'pointer', fontSize:'18px', color:'#8B6914'
                        }}>−</button>
                      <span style={{ minWidth:'32px', textAlign:'center', fontWeight:'700', color:'#2C1810' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.key, item.quantity + 1)}
                        style={{
                          width:'32px', height:'32px', borderRadius:'8px',
                          border:'1px solid #F5DEB3', background:'white',
                          cursor:'pointer', fontSize:'18px', color:'#8B6914'
                        }}>+</button>
                    </>
                  ) : (
                    <span style={{ color:'#8B6914', fontSize:'13px' }}>Qty: 1</span>
                  )}
                </div>

                <div style={{ minWidth:'100px', textAlign:'right' }}>
                  <div style={{ fontWeight:'800', color:'#2C1810', fontSize:'16px' }}>
                    ₹{(item.unit_price * item.quantity).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeItem(item.key)}
                    style={{
                      marginTop:'4px', background:'none', border:'none',
                      color:'#FC8181', fontSize:'12px', cursor:'pointer'
                    }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div style={{ padding:'20px', background:'#FFF8ED', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px' }}>
              <button
                onClick={clear}
                style={{
                  padding:'8px 16px', borderRadius:'8px',
                  border:'1px solid #FC8181', background:'transparent',
                  color:'#FC8181', fontSize:'13px', cursor:'pointer',
                  fontFamily:'Lato, sans-serif'
                }}>
                Clear Cart
              </button>
              <div style={{ textAlign:'right' }}>
                <div style={{ color:'#8B6914', fontSize:'13px' }}>Subtotal</div>
                <div style={{ fontFamily:'"Playfair Display", serif', fontSize:'28px', fontWeight:'800', color:'#2C1810' }}>
                  ₹{subtotal.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop:'24px', display:'flex', gap:'12px', justifyContent:'flex-end', flexWrap:'wrap' }}>
            <Link to="/books" style={{
              padding:'14px 28px', borderRadius:'12px',
              border:'2px solid #D4A853', background:'white',
              color:'#2C1810', textDecoration:'none', fontWeight:'700', fontSize:'15px'
            }}>
              ← Continue Shopping
            </Link>
            <button onClick={handleCheckout} style={{
              padding:'14px 32px', borderRadius:'12px', border:'none',
              background:'linear-gradient(135deg, #2C1810, #4A2C17)', color:'#F5DEB3',
              fontWeight:'700', fontSize:'16px', cursor:'pointer',
              fontFamily:'Lato, sans-serif',
              boxShadow:'0 4px 15px rgba(44,24,16,0.3)'
            }}>
              Proceed to Checkout →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
