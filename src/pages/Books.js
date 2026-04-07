import React, { useState, useEffect } from 'react';
import BulkImport from '../BulkImport';
import { supabase } from '../utils/supabase';
import { logActivity, ACTIONS } from '../utils/activityLog';

const PRESET_CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Science', 'History', 'Biography', 'Mystery',
  'Fantasy', 'Romance', 'Thriller', 'Self-Help', 'Business', 'Technology',
  'Children', 'Young Adult', 'Poetry', 'Drama', 'Philosophy', 'Religion',
  'Travel', 'Cooking', 'Art', 'Sports', 'Politics', 'Economics', 'Health',
];

const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];

const CONDITION_STYLE = {
  New:     { bg: '#d4edda', text: '#155724' },
  Good:    { bg: '#cce5ff', text: '#004085' },
  Fair:    { bg: '#fff3cd', text: '#856404' },
  Poor:    { bg: '#fde8e8', text: '#c0392b' },
  Damaged: { bg: '#f8d7da', text: '#721c24' },
};

export default function Books() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasCondition, setHasCondition] = useState(false);
  const [filterCondition, setFilterCondition] = useState('all');
  const [isbnLooking, setIsbnLooking] = useState(false);

  const emptyForm = {
    book_id: '',
    title: '',
    author: '',
    isbn: '',
    category: '',
    price: 0,
    sales_price: 0,
    quantity_total: 1,
    quantity_available: 1,
    book_image: '',
    condition: 'Good',
  };

  const [formData, setFormData] = useState(emptyForm);

  // Run probe + categories only once on mount
  useEffect(() => {
    probeCondition();
    fetchCategories();
  }, []);

  // Re-fetch books whenever filter changes
  useEffect(() => {
    fetchBooks();
  }, [filterCategory]);

  const probeCondition = async () => {
    const { error } = await supabase.from('books').select('condition').limit(0);
    setHasCondition(!error);
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('books')
        .select('id, book_id, title, author, isbn, category, condition, price, sales_price, quantity_total, quantity_available, book_image, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: name === 'price' || name === 'sales_price' || name === 'quantity_total' || name === 'quantity_available' ? parseFloat(value) : value };
    setFormData(updatedData);
    
    if (name === 'book_image') {
      setImagePreview(value);
    }
  };

  const compressImage = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, 'image/jpeg', 0.82);
    };
    img.src = url;
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('image', compressed, 'cover.jpg');

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.REACT_APP_IMGBB_API_KEY}`, {
        method: 'POST',
        body: fd,
      });

      const data = await response.json();
      if (data.success) {
        const imageUrl = data.data.display_url;
        setFormData(prev => ({ ...prev, book_image: imageUrl }));
        setImagePreview(imageUrl);
      } else {
        alert('Failed to upload image. Please try a valid image file.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const [showIsbnScanner, setShowIsbnScanner] = useState(false);

  const lookupISBN = async (isbnOverride) => {
    const isbn = (isbnOverride || formData.isbn || '').trim().replace(/[-\s]/g, '');
    if (!isbn) { alert('Enter an ISBN first'); return; }
    setIsbnLooking(true);
    try {
      // Try Open Library first (better ISBN coverage)
      let found = false;
      try {
        const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
        const olData = await olRes.json();
        const olBook = olData[`ISBN:${isbn}`];
        if (olBook) {
          const newForm = { ...formData, isbn };
          if (olBook.title) newForm.title = olBook.title;
          if (olBook.authors?.length) newForm.author = olBook.authors.map(a => a.name).join(', ');
          if (olBook.subjects?.length) newForm.category = olBook.subjects[0].name;
          if (olBook.cover?.medium) {
            newForm.book_image = olBook.cover.medium.replace('http:', 'https:');
            setImagePreview(newForm.book_image);
          } else if (olBook.cover?.small) {
            newForm.book_image = olBook.cover.small.replace('http:', 'https:');
            setImagePreview(newForm.book_image);
          }
          if (olBook.number_of_pages) newForm.pages = olBook.number_of_pages;
          if (olBook.publishers?.length) newForm.publisher = olBook.publishers[0].name;
          setFormData(newForm);
          found = true;
        }
      } catch {}

      // Fallback to Google Books API
      if (!found) {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const info = data.items[0].volumeInfo;
          const newForm = { ...formData, isbn };
          if (info.title) newForm.title = info.title;
          if (info.authors) newForm.author = info.authors.join(', ');
          if (info.categories?.length) newForm.category = info.categories[0];
          if (info.imageLinks?.thumbnail) {
            newForm.book_image = info.imageLinks.thumbnail.replace('http:', 'https:');
            setImagePreview(newForm.book_image);
          }
          setFormData(newForm);
          found = true;
        }
      }

      if (found) {
        alert('Book details auto-filled!');
      } else {
        alert('No book found for this ISBN. Try entering details manually.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to lookup ISBN. Check your internet connection.');
    }
    setIsbnLooking(false);
  };

  const handleBarcodeScan = (scannedCode) => {
    setShowIsbnScanner(false);
    if (scannedCode) {
      setFormData(prev => ({ ...prev, isbn: scannedCode }));
      lookupISBN(scannedCode);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!hasCondition) delete payload.condition;

      if (editingId) {
        const { error } = await supabase.from('books').update(payload).eq('id', editingId);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase.from('books').insert([payload]);
        if (error) throw error;
      }

      setFormData(emptyForm);
      setImagePreview('');
      setShowAddForm(false);
      fetchBooks();
      alert(editingId ? 'Book updated!' : 'Book added!');
      logActivity(editingId ? ACTIONS.BOOK_UPDATED : ACTIONS.BOOK_ADDED, `${editingId ? 'Updated' : 'Added'} book: ${formData.title}`, { book_title: formData.title, author: formData.author });
    } catch (error) {
      console.error('Error saving book:', error);
      alert('Error saving book: ' + error.message);
    }
  };

  const handleEditBook = (book) => {
    setFormData(book);
    setImagePreview(book.book_image || '');
    setEditingId(book.id);
    setShowAddForm(true);
  };

  const handleDeleteBook = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchBooks();
      alert('Book deleted!');
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Error deleting book');
    }
  };

  const filteredBooks = books.filter(book => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (
      book.title?.toLowerCase().includes(term) ||
      book.author?.toLowerCase().includes(term) ||
      book.isbn?.includes(searchTerm) ||
      book.book_id?.includes(searchTerm)
    );
    const matchCondition = filterCondition === 'all' || book.condition === filterCondition;
    return matchSearch && matchCondition;
  });

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>📚 Books</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
              setImagePreview('');
              setFormData(emptyForm);
            }}
            style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ➕ Add Book
          </button>
          <button
            onClick={() => setShowImport(true)}
            style={{ padding: '8px 16px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            📤 Import CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by title, author, ISBN, or Book ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {hasCondition && (
          <select
            value={filterCondition}
            onChange={e => setFilterCondition(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="all">All Conditions</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {showAddForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingId ? 'Edit Book' : 'Add New Book'}</h2>
            <form onSubmit={handleAddBook}>
              {/* IMAGE PREVIEW SECTION */}
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '4px', textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>📸 Book Cover Image</label>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Book Cover"
                    loading="lazy"
                    style={{ maxWidth: '100%', maxHeight: '200px', marginBottom: '10px', borderRadius: '4px', background: '#f0f0f0' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                )}
                {!imagePreview && <p style={{ color: '#999' }}>No image selected</p>}
              </div>

              {/* IMAGE URL INPUT */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Book Image URL</label>
                <input
                  type="text"
                  name="book_image"
                  value={formData.book_image}
                  onChange={handleInputChange}
                  placeholder="https://covers.openlibrary.org/b/id/7741150-M.jpg"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Get free images from: https://openlibrary.org</p>
              </div>

              {/* IMAGE UPLOAD BUTTON */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Or Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', cursor: uploadingImage ? 'not-allowed' : 'pointer' }}
                />
                {uploadingImage && <p style={{ color: '#667eea', marginTop: '5px' }}>⏳ Uploading...</p>}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Author</label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Book ID</label>
                  <input
                    type="text"
                    name="book_id"
                    value={formData.book_id}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ISBN</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      name="isbn"
                      value={formData.isbn}
                      onChange={handleInputChange}
                      placeholder="e.g. 9780134685991"
                      style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <button type="button" onClick={() => lookupISBN()} disabled={isbnLooking}
                      style={{ padding: '10px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {isbnLooking ? '...' : '🔍'}
                    </button>
                    <button type="button" onClick={() => setShowIsbnScanner(true)}
                      style={{ padding: '10px 12px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}
                      title="Scan barcode">
                      📷
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Enter ISBN or scan barcode, then auto-fill from Open Library / Google Books</p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    list="category-options"
                    placeholder="Select or type a category..."
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <datalist id="category-options">
                    {PRESET_CATEGORIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {hasCondition && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Book Condition</label>
                  <select
                    name="condition"
                    value={formData.condition || 'Good'}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Sales Price (₹)</label>
                  <input
                    type="number"
                    name="sales_price"
                    value={formData.sales_price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Total Copies</label>
                  <input
                    type="number"
                    name="quantity_total"
                    value={formData.quantity_total}
                    onChange={handleInputChange}
                    min="1"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Available Copies</label>
                <input
                  type="number"
                  name="quantity_available"
                  value={formData.quantity_available}
                  onChange={handleInputChange}
                  min="0"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {editingId ? 'Update Book' : 'Add Book'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{ padding: '8px 16px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Condition setup notice */}
      {!hasCondition && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '10px 16px', marginBottom: '14px', fontSize: '12px' }}>
          ⚠️ <strong>Book Condition Tracking:</strong> Run in Supabase SQL Editor to enable:&nbsp;
          <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>
            ALTER TABLE books ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'Good';
          </code>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {[40, 20, 15, 10, 10, 5].map((w, j) => (
                    <td key={j} style={{ padding: '14px 12px' }}>
                      <div style={{ height: '14px', width: `${w}%`, minWidth: '40px', background: '#f0f0f0', borderRadius: '4px', animation: 'shimmer 1.4s ease-in-out infinite' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : filteredBooks.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No books found</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Title</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Author</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Category</th>
                {hasCondition && <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Condition</th>}
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Available</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Price</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book) => {
                const cStyle = hasCondition && book.condition ? CONDITION_STYLE[book.condition] || {} : {};
                return (
                  <tr key={book.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px' }}>{book.title}</td>
                    <td style={{ padding: '12px' }}>{book.author}</td>
                    <td style={{ padding: '12px' }}>
                      {book.category ? (
                        <span style={{ background: '#e8f4fd', color: '#2980b9', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>{book.category}</span>
                      ) : '—'}
                    </td>
                    {hasCondition && (
                      <td style={{ padding: '12px' }}>
                        {book.condition ? (
                          <span style={{ background: cStyle.bg, color: cStyle.text, padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>
                            {book.condition}
                          </span>
                        ) : '—'}
                      </td>
                    )}
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: book.quantity_available > 0 ? '#d4edda' : '#f8d7da', color: book.quantity_available > 0 ? '#155724' : '#721c24' }}>
                        {book.quantity_available}/{book.quantity_total}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>₹{book.price?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => handleEditBook(book)}
                          style={{ padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteBook(book.id)}
                          style={{ padding: '4px 8px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showImport && (
        <BulkImport
          type="books"
          onSuccess={fetchBooks}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* ISBN Scanner Modal */}
      {showIsbnScanner && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setShowIsbnScanner(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>📷 Scan or Enter ISBN</h3>

            {/* QR Code scanner for QR-based ISBNs */}
            <BarcodeScanner
              onScan={(code) => handleBarcodeScan(code)}
              onClose={() => setShowIsbnScanner(false)}
            />

            {/* Manual quick entry (for handheld barcode scanners that type) */}
            <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px', fontWeight: '600' }}>Or use a USB/Bluetooth barcode scanner:</p>
              <input
                type="text"
                autoFocus
                placeholder="Barcode scanner will type here..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.target.value.trim();
                    if (val) handleBarcodeScan(val);
                  }
                }}
                style={{ width: '100%', padding: '10px', border: '2px solid #667eea', borderRadius: '6px', fontSize: '16px', textAlign: 'center', fontFamily: 'monospace' }}
              />
              <p style={{ fontSize: '11px', color: '#999', marginTop: '4px', textAlign: 'center' }}>Scan barcode or type ISBN and press Enter</p>
            </div>

            <button onClick={() => setShowIsbnScanner(false)}
              style={{ width: '100%', marginTop: '12px', padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}