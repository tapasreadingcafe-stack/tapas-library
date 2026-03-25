import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useReactToPrint } from 'react-to-print';

export default function POS() {
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState('newest');
  const [categories, setCategories] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [allBooks, setAllBooks] = useState([]);
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showCheckout, setShowCheckout] = useState(false);
  const [quickSelectBooks, setQuickSelectBooks] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    plan: 'basic',
    borrow_limit: 2
  });
  const receiptRef = React.useRef();

  useEffect(() => {
    fetchBooks();
    fetchMembers();
    fetchCategories();
    loadQuickSelectBooks();
  }, []);

  useEffect(() => {
    if (customerSearch.trim() === '') {
      setFilteredMembers([]);
    } else {
      const filtered = members.filter(m =>
        m.name.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [customerSearch, members]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('books').select('*');
      if (error) throw error;
      setAllBooks(data || []);
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
      const { data, error } = await supabase.from('books').select('category', { distinct: true });
      if (error) throw error;
      const uniqueCategories = [...new Set(data?.map(b => b.category).filter(Boolean))];
      setCategories(uniqueCategories.sort());
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const loadQuickSelectBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('quantity_available', { ascending: false })
        .limit(6);
      if (error) throw error;
      setQuickSelectBooks(data || []);
    } catch (error) {
      console.error('Error loading quick select books:', error);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('Please enter customer name');
      return;
    }

    try {
      const { data, error } = await supabase.from('members').insert({
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        plan: newCustomer.plan,
        borrow_limit: newCustomer.borrow_limit,
        status: 'active',
        subscription_start: new Date().toISOString(),
        subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }).select();

      if (error) throw error;

      const newMember = data[0];
      setSelectedMember(newMember);
      setCustomerSearch(newMember.name);
      setShowAddCustomer(false);
      setNewCustomer({ name: '', phone: '', email: '', plan: 'basic', borrow_limit: 2 });
      
      // Refresh members list
      fetchMembers();
      alert('✓ Customer added successfully!');
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Error adding customer');
    }
  };

  const applyFilters = () => {
    let filtered = allBooks;
    filtered = filtered.filter(book =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(book => book.category === selectedCategory);
    }
    filtered = filtered.filter(book => book.price >= priceRange[0] && book.price <= priceRange[1]);
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'title-az') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    setBooks(filtered);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setPriceRange([0, 1000]);
    setSortBy('newest');
    setBooks(allBooks);
  };

  const handlePriceChange = (e, index) => {
    const newRange = [...priceRange];
    newRange[index] = parseInt(e.target.value);
    if (newRange[0] <= newRange[1]) {
      setPriceRange(newRange);
    }
  };

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

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountAmount = 0;
  if (discountType === 'percentage' && discountValue > 0) {
    discountAmount = subtotal * (discountValue / 100);
  } else if (discountType === 'fixed' && discountValue > 0) {
    discountAmount = Math.min(discountValue, subtotal);
  }
  const finalTotal = subtotal - discountAmount;

  const handleCheckout = async () => {
    try {
      const { error } = await supabase.from('sales').insert({
        member_id: selectedMember?.id || null,
        book_id: cart[0]?.id || null,
        quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
        total_amount: finalTotal,
        sale_date: new Date().toISOString(),
        status: 'completed'
      });

      if (error) throw error;

      setLastOrder({
        id: Math.floor(Math.random() * 10000),
        date: new Date(),
        member: selectedMember,
        items: cart,
        subtotal: subtotal,
        discount: discountAmount,
        total: finalTotal,
        paymentMethod: paymentMethod
      });

      alert('✓ Order Completed! Receipt ready to print.');
      setShowCheckout(true);
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Error processing order');
    }
  };

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  const completeTransaction = () => {
    setCart([]);
    setSelectedMember(null);
    setCustomerSearch('');
    setDiscountValue(0);
    setPaymentMethod('cash');
    setShowCheckout(false);
    setLastOrder(null);
  };

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>🛒 Point of Sale</h1>

      {showCheckout && lastOrder ? (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <button
            onClick={() => setShowCheckout(false)}
            style={{ marginBottom: '20px', padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ← Back to POS
          </button>

          <div ref={receiptRef} style={{ background: 'white', padding: '40px', borderRadius: '8px', maxWidth: '400px', margin: '0 auto', fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
              <h2 style={{ margin: '0 0 5px 0' }}>TAPAS LIBRARY</h2>
              <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>Point of Sale Receipt</p>
            </div>

            <div style={{ fontSize: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Bill #:</span>
                <span>{lastOrder.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Date:</span>
                <span>{lastOrder.date.toLocaleString('en-IN')}</span>
              </div>
              {lastOrder.member && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Customer:</span>
                  <span>{lastOrder.member.name}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: '2px solid #333', borderBottom: '2px solid #333', padding: '15px 0', marginBottom: '15px' }}>
              {lastOrder.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                  <div>
                    <div>{item.title.substring(0, 20)}</div>
                    <div style={{ color: '#666', fontSize: '11px' }}>₹{item.price} × {item.quantity}</div>
                  </div>
                  <div style={{ fontWeight: 'bold' }}>₹{(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '12px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Subtotal:</span>
                <span>₹{lastOrder.subtotal.toFixed(2)}</span>
              </div>
              {lastOrder.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#ff6b6b' }}>
                  <span>Discount:</span>
                  <span>-₹{lastOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
                <span>Total:</span>
                <span>₹{lastOrder.total.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ fontSize: '12px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment:</span>
                <span style={{ fontWeight: 'bold' }}>{lastOrder.paymentMethod.toUpperCase()}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '11px', color: '#666', paddingTop: '15px', borderTop: '2px solid #333' }}>
              <p style={{ margin: '10px 0' }}>Thank you for your purchase!</p>
              <p style={{ margin: '5px 0' }}>Visit us again soon</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
            <button
              onClick={handlePrint}
              style={{ padding: '12px 24px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🖨️ Print
            </button>
            <button
              onClick={completeTransaction}
              style={{ padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✓ Complete
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
          <div>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, minWidth: '250px', padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{ padding: '10px 16px', background: showFilters ? '#667eea' : '#fff', color: showFilters ? 'white' : '#333', border: showFilters ? 'none' : '2px solid #e0e0e0', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                ⚙️ {showFilters ? '▲' : '▼'}
              </button>
              <button
                onClick={resetFilters}
                style={{ padding: '10px 14px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                ↻
              </button>
            </div>

            {showFilters && (
              <div style={{ background: 'white', borderRadius: '8px', padding: '15px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '11px', fontWeight: 'bold' }}>Category</label>
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}>
                    <option value="all">All</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '11px', fontWeight: 'bold' }}>Price</label>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <input type="number" value={priceRange[0]} onChange={(e) => handlePriceChange(e, 0)} style={{ width: '50px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '11px' }} min="0" max={priceRange[1]} />
                    <span style={{ fontSize: '10px' }}>-</span>
                    <input type="number" value={priceRange[1]} onChange={(e) => handlePriceChange(e, 1)} style={{ width: '50px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '11px' }} min={priceRange[0]} max="10000" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '11px', fontWeight: 'bold' }}>Sort</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}>
                    <option value="newest">Newest</option>
                    <option value="price-low">Low Price</option>
                    <option value="price-high">High Price</option>
                    <option value="title-az">A-Z</option>
                  </select>
                </div>
                <button onClick={applyFilters} style={{ padding: '8px 12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>✓</button>
              </div>
            )}

            <div style={{ marginBottom: '15px', padding: '12px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold' }}>⭐ Quick</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '6px' }}>
                {quickSelectBooks.map(book => (
                  <button
                    key={book.id}
                    onClick={() => addToCart(book)}
                    disabled={book.quantity_available === 0}
                    style={{
                      padding: '8px',
                      background: book.quantity_available > 0 ? '#fff3cd' : '#ccc',
                      border: '2px solid #ffc107',
                      borderRadius: '4px',
                      cursor: book.quantity_available > 0 ? 'pointer' : 'not-allowed',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                    onMouseEnter={(e) => { if (book.quantity_available > 0) { e.target.style.background = '#ffc107'; e.target.style.color = 'white'; } }}
                    onMouseLeave={(e) => { e.target.style.background = '#fff3cd'; e.target.style.color = 'black'; }}
                  >
                    {book.title.substring(0, 10)}<br/>₹{book.price}
                  </button>
                ))}
              </div>
            </div>

            <p style={{ color: '#999', fontSize: '12px', marginBottom: '12px' }}>Books: {books.length}</p>

            {loading ? (
              <p style={{ textAlign: 'center', color: '#999' }}>Loading...</p>
            ) : books.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999' }}>No books</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {books.map(book => (
                  <div key={book.id} style={{ background: 'white', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'; }}>
                    <div style={{ width: '100%', height: '160px', background: '#f0f0f0', overflow: 'hidden' }}>
                      {book.book_image ? (
                        <img src={book.book_image} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : null}
                    </div>
                    <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#333', fontWeight: 'bold' }}>{book.title.substring(0, 16)}</h4>
                      <p style={{ margin: '0 0 3px 0', fontSize: '10px', color: '#666' }}>{book.author.substring(0, 12)}</p>
                      <p style={{ margin: '0 0 6px 0', fontSize: '10px', color: '#999' }}>{book.category}</p>
                      <div style={{ marginTop: 'auto' }}>
                        <p style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 'bold', color: '#667eea' }}>₹{book.price}</p>
                        <button onClick={() => addToCart(book)} disabled={book.quantity_available === 0} style={{ width: '100%', padding: '6px', background: book.quantity_available > 0 ? '#667eea' : '#ccc', color: 'white', border: 'none', borderRadius: '3px', cursor: book.quantity_available > 0 ? 'pointer' : 'not-allowed', fontSize: '11px', fontWeight: 'bold' }}>
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CART SIDEBAR */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', height: 'fit-content', position: 'sticky', top: '20px' }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>🛒 Cart ({cart.length})</h2>

            {/* CUSTOMER SEARCH */}
            <div style={{ marginBottom: '12px', position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 'bold' }}>Customer</label>
              <input
                type="text"
                placeholder="Type name..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
              />

              {filteredMembers.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ddd', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 10, marginTop: '2px' }}>
                  {filteredMembers.slice(0, 5).map(member => (
                    <div
                      key={member.id}
                      onClick={() => {
                        setSelectedMember(member);
                        setCustomerSearch(member.name);
                        setFilteredMembers([]);
                      }}
                      style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '12px', color: '#333' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f9f9f9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                    >
                      {member.name}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowAddCustomer(true)}
                style={{ width: '100%', marginTop: '6px', padding: '6px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
              >
                + Add New
              </button>
            </div>

            {/* ADD CUSTOMER MODAL */}
            {showAddCustomer && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: 'white', borderRadius: '8px', padding: '20px', maxWidth: '400px', width: '90%', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Add New Customer</h3>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Name *</label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                      placeholder="Customer name"
                    />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Phone</label>
                    <input
                      type="text"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                      placeholder="9876543210"
                    />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Email</label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Plan</label>
                    <select
                      value={newCustomer.plan}
                      onChange={(e) => setNewCustomer({ ...newCustomer, plan: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                    >
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="family">Family</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>Borrow Limit</label>
                    <input
                      type="number"
                      value={newCustomer.borrow_limit}
                      onChange={(e) => setNewCustomer({ ...newCustomer, borrow_limit: parseInt(e.target.value) })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                      min="1"
                      max="10"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleAddCustomer}
                      style={{ flex: 1, padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCustomer(false);
                        setNewCustomer({ name: '', phone: '', email: '', plan: 'basic', borrow_limit: 2 });
                      }}
                      style={{ flex: 1, padding: '10px', background: '#ccc', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CART ITEMS */}
            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
              {cart.length === 0 ? (
                <p style={{ color: '#999', fontSize: '11px', margin: 0 }}>Empty</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} style={{ marginBottom: '8px', padding: '8px', background: '#f9f9f9', borderRadius: '3px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <strong style={{ color: '#333' }}>{item.title.substring(0, 12)}</strong>
                      <button onClick={() => removeFromCart(item.id)} style={{ background: '#ff6b6b', color: 'white', border: 'none', padding: '1px 4px', cursor: 'pointer', fontSize: '9px', borderRadius: '2px' }}>×</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>₹{item.price}</span>
                      <span>
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '2px 4px', background: '#f0f0f0', border: 'none', cursor: 'pointer', fontSize: '10px' }}>−</button>
                        <span style={{ margin: '0 4px', fontWeight: 'bold', fontSize: '11px' }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '2px 4px', background: '#f0f0f0', border: 'none', cursor: 'pointer', fontSize: '10px' }}>+</button>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DISCOUNT (COMPACT) */}
            {cart.length > 0 && (
              <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', padding: '8px', marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '10px', fontWeight: 'bold' }}>💰 Discount</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={{ flex: 0.6, padding: '6px', border: '1px solid #ffc107', borderRadius: '3px', fontSize: '11px', background: 'white' }}>
                    <option value="percentage">%</option>
                    <option value="fixed">₹</option>
                  </select>
                  <input type="number" placeholder="0" value={discountValue} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} style={{ flex: 1, padding: '6px', border: '1px solid #ffc107', borderRadius: '3px', fontSize: '11px' }} min="0" />
                </div>
              </div>
            )}

            {/* PAYMENT (COMPACT) */}
            {cart.length > 0 && (
              <div style={{ background: '#e3f2fd', border: '1px solid #2196F3', borderRadius: '4px', padding: '8px', marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '10px', fontWeight: 'bold' }}>💳 Pay</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #2196F3', borderRadius: '3px', fontSize: '11px', background: 'white' }}>
                  <option value="cash">💵 Cash</option>
                  <option value="upi">📱 UPI</option>
                </select>
              </div>
            )}

            {/* PRICE BREAKDOWN */}
            {cart.length > 0 && (
              <div style={{ background: '#f9f9f9', borderRadius: '4px', padding: '8px', marginBottom: '8px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#666' }}>
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#ff6b6b', fontWeight: 'bold' }}>
                    <span>Disc:</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', color: '#667eea' }}>
                  <span>Total:</span>
                  <span>₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* CHECKOUT BUTTON */}
            <button onClick={handleCheckout} disabled={cart.length === 0} style={{ width: '100%', padding: '10px', background: cart.length > 0 ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', cursor: cart.length > 0 ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 'bold' }}>
              ✓ Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}