import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function POS() {
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBooks();
    fetchMembers();
    fetchCategories();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      let query = supabase.from('books').select('*');
      
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase.from('members').select('*').eq('status', 'active');
      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('category', { distinct: true });
      if (error) throw error;
      const uniqueCategories = [...new Set(data?.map(b => b.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredBooks = books.filter(book =>
    (book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedCategory === 'all' || book.category === selectedCategory)
  );

  const addToCart = (book) => {
    const existingItem = cart.find(item => item.id === book.id);
    
    if (existingItem) {
      if (existingItem.quantity < book.quantity_available) {
        setCart(cart.map(item =>
          item.id === book.id ? { ...item, quantity: item.quantity + 1 } : item
        ));
      } else {
        alert('Not enough stock available');
      }
    } else {
      if (book.quantity_available > 0) {
        setCart([...cart, { ...book, quantity: 1 }]);
      } else {
        alert('Out of stock');
      }
    }
  };

  const removeFromCart = (bookId) => {
    setCart(cart.filter(item => item.id !== bookId));
  };

  const updateQuantity = (bookId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(bookId);
    } else {
      const book = books.find(b => b.id === bookId);
      if (newQuantity <= book.quantity_available) {
        setCart(cart.map(item =>
          item.id === bookId ? { ...item, quantity: newQuantity } : item
        ));
      }
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>🛒 Point of Sale</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        {/* PRODUCTS SECTION */}
        <div>
          {/* SEARCH & FILTER */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search books..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* PRODUCT GRID */}
          {loading ? (
            <p style={{ textAlign: 'center', color: '#999' }}>Loading books...</p>
          ) : filteredBooks.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>No books found</p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '15px'
            }}>
              {filteredBooks.map(book => (
                <div
                  key={book.id}
                  style={{
                    background: 'white',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  {/* BOOK IMAGE */}
                  <div style={{
                    width: '100%',
                    height: '200px',
                    background: '#f0f0f0',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {book.book_image ? (
                      <img
                        src={book.book_image}
                        alt={book.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div style={{
                      display: book.book_image ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      color: '#999',
                      fontSize: '12px'
                    }}>
                      No Image
                    </div>
                  </div>

                  {/* BOOK INFO */}
                  <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#333', fontWeight: 'bold' }}>
                      {book.title.substring(0, 20)}...
                    </h4>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>
                      {book.author.substring(0, 15)}
                    </p>
                    <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#999' }}>
                      {book.category}
                    </p>

                    {/* PRICE & STOCK */}
                    <div style={{ marginBottom: '10px', marginTop: 'auto' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold', color: '#667eea' }}>
                        ₹{book.price?.toLocaleString('en-IN')}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '11px',
                        color: book.quantity_available > 0 ? '#4CAF50' : '#ff6b6b'
                      }}>
                        {book.quantity_available > 0 ? `${book.quantity_available} in stock` : 'Out of stock'}
                      </p>
                    </div>

                    {/* ADD TO CART BUTTON */}
                    <button
                      onClick={() => addToCart(book)}
                      disabled={book.quantity_available === 0}
                      style={{
                        padding: '8px',
                        background: book.quantity_available > 0 ? '#667eea' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: book.quantity_available > 0 ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      {book.quantity_available > 0 ? '+ Add' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CART SECTION */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: 'fit-content',
          position: 'sticky',
          top: '20px'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#333' }}>🛒 Cart ({cart.length})</h2>

          {/* MEMBER SELECT */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>Member</label>
            <select
              value={selectedMember?.id || ''}
              onChange={(e) => {
                const member = members.find(m => m.id === e.target.value);
                setSelectedMember(member);
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="">Guest</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* CART ITEMS */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            marginBottom: '15px',
            paddingBottom: '15px',
            borderBottom: '1px solid #eee'
          }}>
            {cart.length === 0 ? (
              <p style={{ color: '#999', fontSize: '12px', margin: 0 }}>Cart is empty</p>
            ) : (
              cart.map(item => (
                <div
                  key={item.id}
                  style={{
                    marginBottom: '10px',
                    padding: '10px',
                    background: '#f9f9f9',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <strong style={{ color: '#333' }}>{item.title.substring(0, 15)}</strong>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        background: '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#666' }}>
                    <span>₹{item.price?.toLocaleString('en-IN')}</span>
                    <span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        style={{ padding: '2px 6px', cursor: 'pointer', background: '#f0f0f0', border: 'none', borderRadius: '2px' }}
                      >
                        −
                      </button>
                      <span style={{ margin: '0 8px', fontWeight: 'bold' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        style={{ padding: '2px 6px', cursor: 'pointer', background: '#f0f0f0', border: 'none', borderRadius: '2px' }}
                      >
                        +
                      </button>
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#667eea' }}>
                    ₹{(item.price * item.quantity)?.toLocaleString('en-IN')}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* TOTAL */}
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '15px',
            padding: '15px',
            background: '#f5f5f5',
            borderRadius: '4px',
            textAlign: 'center',
            color: '#667eea'
          }}>
            Total: ₹{cartTotal.toLocaleString('en-IN')}
          </div>

          {/* CHECKOUT BUTTON */}
          <button
            onClick={() => alert('Checkout - Coming in Feature 5!')}
            disabled={cart.length === 0}
            style={{
              width: '100%',
              padding: '12px',
              background: cart.length > 0 ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ✓ Checkout
          </button>
        </div>
      </div>
    </div>
  );
}