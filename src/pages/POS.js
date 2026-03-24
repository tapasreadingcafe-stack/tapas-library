import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function POS() {
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [searchBook, setSearchBook] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: booksData } = await supabase.from('books').select('*');
      const { data: membersData } = await supabase.from('members').select('*');
      setBooks(booksData || []);
      setMembers(membersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (book) => {
    const existingItem = cart.find(item => item.id === book.id);
    if (existingItem) {
      if (existingItem.quantity < book.quantity_available) {
        setCart(cart.map(item =>
          item.id === book.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      if (book.quantity_available > 0) {
        setCart([...cart, { ...book, quantity: 1 }]);
      }
    }
  };

  const removeFromCart = (bookId) => {
    setCart(cart.filter(item => item.id !== bookId));
  };

  const updateQuantity = (bookId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(bookId);
    } else {
      setCart(cart.map(item =>
        item.id === bookId ? { ...item, quantity } : item
      ));
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = (subtotal * discountPercent) / 100;
    return subtotal - discount;
  };

  const handleCheckout = async () => {
    if (!selectedMember || cart.length === 0) {
      alert('Select a member and add items to cart');
      return;
    }

    try {
      const totalAmount = calculateTotal();

      // Create sale records for each book
      for (let item of cart) {
        await supabase.from('sales').insert([{
          member_id: selectedMember,
          book_id: item.id,
          quantity: item.quantity,
          total_amount: item.price * item.quantity,
          status: 'completed',
        }]);

        // Update book availability
        await supabase
          .from('books')
          .update({ quantity_available: item.quantity_available - item.quantity })
          .eq('id', item.id);
      }

      setLastSale({
        member: members.find(m => m.id === selectedMember),
        items: cart,
        total: totalAmount,
        discount: discountPercent,
        date: new Date(),
      });

      setShowReceipt(true);
      setCart([]);
      setSelectedMember(null);
      setDiscountPercent(0);
      fetchData();
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Error: ' + error.message);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchBook.toLowerCase()) ||
    book.author.toLowerCase().includes(searchBook.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      {/* Books Section */}
      <div>
        <h1>🛍️ Point of Sale</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search books..."
            value={searchBook}
            onChange={(e) => setSearchBook(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '15px' }}
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {filteredBooks.filter(b => b.quantity_available > 0).map(book => (
              <div
                key={book.id}
                onClick={() => addToCart(book)}
                style={{
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: '#f9f9f9',
                  transition: 'all 0.2s',
                  ':hover': { background: '#f0f0f0', borderColor: '#667eea' }
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{book.title}</div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>{book.author}</div>
                <div style={{ fontSize: '12px', color: '#667eea', marginBottom: '5px' }}>₹{book.price?.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '12px', color: book.quantity_available > 0 ? '#4CAF50' : '#ff6b6b' }}>
                  {book.quantity_available} available
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2>Shopping Cart</h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Member *</label>
            <select
              value={selectedMember || ''}
              onChange={(e) => setSelectedMember(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">Select Member</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {cart.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>Cart is empty</p>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              {cart.map(item => (
                <div key={item.id} style={{ padding: '10px', borderBottom: '1px solid #eee', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.title}</div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{ background: '#ff6b6b', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🗑️
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div>₹{item.price?.toLocaleString('en-IN')}</div>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        style={{ padding: '4px 8px', background: '#f0f0f0', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      >
                        −
                      </button>
                      <span style={{ width: '30px', textAlign: 'center' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        style={{ padding: '4px 8px', background: '#f0f0f0', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ fontWeight: 'bold' }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Discount %</label>
            <input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Subtotal:</span>
              <span>₹{(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toLocaleString('en-IN')}</span>
            </div>
            {discountPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#4CAF50' }}>
                <span>Discount ({discountPercent}%):</span>
                <span>-₹{((cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * discountPercent) / 100).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
              <span>Total:</span>
              <span>₹{calculateTotal().toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || !selectedMember}
            style={{
              width: '100%',
              padding: '12px',
              background: cart.length === 0 || !selectedMember ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: cart.length === 0 || !selectedMember ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            💳 Checkout
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', maxWidth: '400px', width: '90%' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>📋 Receipt</h2>
            <div style={{ marginBottom: '15px', fontSize: '12px' }}>
              <p><strong>Member:</strong> {lastSale.member?.name}</p>
              <p><strong>Date:</strong> {lastSale.date.toLocaleDateString('en-IN')}</p>
              <p><strong>Time:</strong> {lastSale.date.toLocaleTimeString('en-IN')}</p>
            </div>

            <table style={{ width: '100%', fontSize: '12px', marginBottom: '15px', borderCollapse: 'collapse' }}>
              <thead style={{ borderBottom: '1px solid #ddd' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '5px' }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '5px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '5px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lastSale.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '5px' }}>{item.title}</td>
                    <td style={{ textAlign: 'center', padding: '5px' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '5px' }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span><strong>Total:</strong></span>
                <span><strong>₹{lastSale.total.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => window.print()}
                style={{ flex: 1, padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                🖨️ Print
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                style={{ flex: 1, padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}