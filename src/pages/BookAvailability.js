import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function BookAvailability() {
  const [books, setBooks] = useState([]);
  const [circulation, setCirculation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, available, low-stock, out-of-stock
  const [sortBy, setSortBy] = useState('availability'); // availability, title, author

  useEffect(() => {
    fetchBooksAndCirculation();
  }, []);

  const fetchBooksAndCirculation = async () => {
    setLoading(true);
    try {
      // Fetch all books
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .order('title', { ascending: true });

      if (booksError) throw booksError;

      // Fetch all checked-out books
      const { data: circulationData, error: circulationError } = await supabase
        .from('circulation')
        .select('*, members(name), books(id)')
        .eq('status', 'checked_out');

      if (circulationError) throw circulationError;

      setBooks(booksData || []);
      setCirculation(circulationData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch book availability data');
    } finally {
      setLoading(false);
    }
  };

  const getCheckedOutCount = (bookId) => {
    return circulation.filter(item => item.books?.id === bookId).length;
  };

  const getAvailableCount = (book) => {
    const checkedOut = getCheckedOutCount(book.id);
    return Math.max(0, book.quantity_available - checkedOut);
  };

  const getStockStatus = (book) => {
    const available = getAvailableCount(book);
    const total = book.quantity_available;

    if (available === 0 && total > 0) return 'out-of-stock';
    if (available < 3 && available > 0) return 'low-stock';
    if (available > 0) return 'available';
    return 'unavailable';
  };

  const getCheckoutTrend = (book) => {
    const checkedOut = getCheckedOutCount(book.id);
    const total = book.quantity_available;
    if (total === 0) return 0;
    return Math.round((checkedOut / total) * 100);
  };

  const filteredBooks = books
    .filter(book => {
      const status = getStockStatus(book);
      if (filterStatus === 'all') return true;
      return status === filterStatus;
    })
    .filter(book => {
      const term = searchTerm.toLowerCase();
      return (
        book.title?.toLowerCase().includes(term) ||
        book.author?.toLowerCase().includes(term) ||
        book.isbn?.includes(term)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'availability') {
        const aAvail = getAvailableCount(a);
        const bAvail = getAvailableCount(b);
        return bAvail - aAvail;
      } else if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'author') {
        return (a.author || '').localeCompare(b.author || '');
      }
      return 0;
    });

  const stats = {
    totalBooks: books.length,
    available: books.filter(b => getStockStatus(b) === 'available').length,
    lowStock: books.filter(b => getStockStatus(b) === 'low-stock').length,
    outOfStock: books.filter(b => getStockStatus(b) === 'out-of-stock').length,
    totalCopies: books.reduce((sum, b) => sum + b.quantity_available, 0),
    checkedOut: circulation.length
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return { color: '#4CAF50', text: '✓ Available', emoji: '📗' };
      case 'low-stock':
        return { color: '#FF9800', text: '⚠ Low Stock', emoji: '📙' };
      case 'out-of-stock':
        return { color: '#f44336', text: '✗ Out of Stock', emoji: '📕' };
      default:
        return { color: '#999', text: 'Unknown', emoji: '❓' };
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading book availability...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>📚 Book Availability Dashboard</h1>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Total Books</p>
          <h2 style={{ margin: '0', color: '#667eea', fontSize: '24px' }}>{stats.totalBooks}</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Available</p>
          <h2 style={{ margin: '0', color: '#4CAF50', fontSize: '24px' }}>{stats.available}</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Low Stock</p>
          <h2 style={{ margin: '0', color: '#FF9800', fontSize: '24px' }}>{stats.lowStock}</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Out of Stock</p>
          <h2 style={{ margin: '0', color: '#f44336', fontSize: '24px' }}>{stats.outOfStock}</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Total Copies</p>
          <h2 style={{ margin: '0', color: '#2196F3', fontSize: '24px' }}>{stats.totalCopies}</h2>
        </div>

        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>Checked Out</p>
          <h2 style={{ margin: '0', color: '#9C27B0', fontSize: '24px' }}>{stats.checkedOut}</h2>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '0' }}>
          <div>
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">All Books</option>
              <option value="available">Available Only</option>
              <option value="low-stock">Low Stock Only</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="availability">Sort by Availability</option>
              <option value="title">Sort by Title</option>
              <option value="author">Sort by Author</option>
            </select>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {filteredBooks.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '40px',
            color: '#999'
          }}>
            No books found
          </div>
        ) : (
          filteredBooks.map(book => {
            const status = getStockStatus(book);
            const badge = getStatusBadge(status);
            const available = getAvailableCount(book);
            const checkedOut = getCheckedOutCount(book.id);
            const trend = getCheckoutTrend(book);

            return (
              <div key={book.id} style={{
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                border: `3px solid ${badge.color}`
              }}>
                {/* Header with Status */}
                <div style={{
                  background: badge.color,
                  color: 'white',
                  padding: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {badge.emoji} {badge.text}
                </div>

                {/* Content */}
                <div style={{ padding: '15px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '16px' }}>
                    {book.title}
                  </h3>

                  <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '13px' }}>
                    {book.author || 'Unknown Author'}
                  </p>

                  {book.isbn && (
                    <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: '11px' }}>
                      ISBN: {book.isbn}
                    </p>
                  )}

                  {/* Availability Stats */}
                  <div style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold' }}>Available: {available}/{book.quantity_available}</span>
                        <span style={{ color: '#999' }}>Checked Out: {checkedOut}</span>
                      </div>
                      <div style={{
                        background: '#ddd',
                        height: '6px',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: badge.color,
                          height: '100%',
                          width: `${trend}%`,
                          transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Status Message */}
                  {status === 'low-stock' && (
                    <div style={{
                      background: '#fff3cd',
                      border: '1px solid #ffc107',
                      color: '#856404',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginBottom: '10px',
                      fontWeight: 'bold'
                    }}>
                      ⚠️ Only {available} copies left! Low stock alert.
                    </div>
                  )}

                  {status === 'out-of-stock' && (
                    <div style={{
                      background: '#ffebee',
                      border: '1px solid #f44336',
                      color: '#c62828',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginBottom: '10px',
                      fontWeight: 'bold'
                    }}>
                      ✗ No copies available. {checkedOut} currently checked out.
                    </div>
                  )}

                  {/* Category */}
                  {book.category && (
                    <p style={{
                      margin: '0',
                      color: '#667eea',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      📂 {book.category}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}