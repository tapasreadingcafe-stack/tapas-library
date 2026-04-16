import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BulkImport from '../BulkImport';
import BarcodeScanner from '../BarcodeScanner';
import { supabase } from '../utils/supabase';
import { logActivity, ACTIONS } from '../utils/activityLog';
import { getCategoryPrefix, createBookCopies, generateCopyIds } from '../utils/bookCopies';
import { exportToCSV } from '../utils/exportCSV';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { usePermission } from '../hooks/usePermission';
import ViewOnlyBanner from '../components/ViewOnlyBanner';

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
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isReadOnly, canDeleteBooks, canExportData } = usePermission();
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
  const [printAfterAdd, setPrintAfterAdd] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const emptyForm = {
    book_id: '',
    title: '',
    author: '',
    isbn: '',
    category: '',
    price: '',
    sales_price: '',
    mrp: '',
    discount_percent: '',
    quantity_total: 1,
    quantity_available: 1,
    book_image: '',
    condition: 'Good',
    store_visible: false,
    is_borrowable: true,
    is_staff_pick: false,
    staff_pick_blurb: '',
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
        .select('id, book_id, title, author, isbn, category, condition, price, sales_price, mrp, discount_percent, quantity_total, quantity_available, book_image, created_at, store_visible, is_borrowable, is_staff_pick, staff_pick_blurb')
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

      // Try imgbb first
      let uploaded = false;
      try {
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
          uploaded = true;
        }
      } catch {}

      // Fallback: convert to base64 data URL
      if (!uploaded) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          setFormData(prev => ({ ...prev, book_image: dataUrl }));
          setImagePreview(dataUrl);
        };
        reader.readAsDataURL(compressed);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const [showIsbnScanner, setShowIsbnScanner] = useState(false);

  const lookupISBN = async (isbnOverride) => {
    const isbn = (isbnOverride || formData.isbn || '').trim().replace(/[-\s]/g, '');
    if (!isbn) { toast.warning('Enter an ISBN first'); return; }
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
          // Note: pages and publisher are not in the books table, skip them
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
        toast.success('Book details auto-filled!');
      } else {
        toast.warning('No book found for this ISBN. Try entering details manually.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to lookup ISBN. Check your internet connection.');
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
      // Convert empty strings to proper values
      if (payload.price === '' || payload.price === null) payload.price = 0;
      if (payload.sales_price === '' || payload.sales_price === null) payload.sales_price = 0;
      if (payload.mrp === '' || payload.mrp === null) payload.mrp = 0;
      if (payload.discount_percent === '' || payload.discount_percent === null) payload.discount_percent = 0;
      payload.price = parseFloat(payload.price) || 0;
      payload.sales_price = parseFloat(payload.sales_price) || 0;
      payload.mrp = parseFloat(payload.mrp) || 0;
      payload.discount_percent = parseFloat(payload.discount_percent) || 0;

      const copyCount = parseInt(payload.quantity_total) || 1;

      if (editingId) {
        const { error } = await supabase.from('books').update(payload).eq('id', editingId);
        if (error) throw error;
        setEditingId(null);
        setFormData(emptyForm);
        setImagePreview('');
        setShowAddForm(false);
        fetchBooks();
        toast.success('Book updated!');
        logActivity(ACTIONS.BOOK_UPDATED, `Updated book: ${formData.title}`, { book_title: formData.title });
      } else {
        // Check if same book (by ISBN or title+author) already exists
        let existingBook = null;
        if (payload.isbn) {
          const { data } = await supabase.from('books').select('id, quantity_total, quantity_available, category').eq('isbn', payload.isbn).limit(1);
          if (data?.length) existingBook = data[0];
        }
        if (!existingBook && payload.title) {
          const { data } = await supabase.from('books').select('id, quantity_total, quantity_available, category').eq('title', payload.title).eq('author', payload.author || '').limit(1);
          if (data?.length) existingBook = data[0];
        }

        if (existingBook) {
          // Add copies to existing book
          const newTotal = (existingBook.quantity_total || 0) + copyCount;
          const newAvail = (existingBook.quantity_available || 0) + copyCount;
          await supabase.from('books').update({ quantity_total: newTotal, quantity_available: newAvail }).eq('id', existingBook.id);
          try {
            await createBookCopies(existingBook.id, existingBook.category || payload.category, copyCount);
          } catch (e) { console.warn('Copies:', e.message); }
          setFormData(emptyForm);
          setImagePreview('');
          setShowAddForm(false);
          fetchBooks();
          toast.success(`${copyCount} copies added to existing "${payload.title}" (Total: ${newTotal})`);
          logActivity(ACTIONS.BOOK_ADDED, `Added ${copyCount} copies to: ${payload.title} (total: ${newTotal})`, { book_title: payload.title });
          if (printAfterAdd) navigate(`/books/${existingBook.id}/copies`);
        } else {
          // Generate book_id with next number
          const prefix = getCategoryPrefix(payload.category);
          const nextCopies = await generateCopyIds(null, payload.category, 0);
          // Get last number from existing copies for this prefix
          const { data: lastCopy } = await supabase.from('book_copies').select('copy_code').like('copy_code', `B-${prefix}-%`).order('copy_code', { ascending: false }).limit(1);
          let nextNum = 1;
          if (lastCopy?.length) { const m = lastCopy[0].copy_code.match(/-(\d+)$/); if (m) nextNum = parseInt(m[1]) + 1; }
          payload.book_id = `B-${prefix}-${String(nextNum).padStart(4, '0')}`;

          const { data: newBook, error } = await supabase.from('books').insert([payload]).select().single();
          if (error) throw error;
          try {
            await createBookCopies(newBook.id, payload.category, copyCount);
          } catch (e) { console.warn('Copies:', e.message); }
          setFormData(emptyForm);
          setImagePreview('');
          setShowAddForm(false);
          fetchBooks();
          toast.success(`Book added with ${copyCount} copies!`);
          logActivity(ACTIONS.BOOK_ADDED, `Added book: ${payload.title} (${copyCount} copies)`, { book_title: payload.title });
          if (printAfterAdd) navigate(`/books/${newBook.id}/copies`);
        }
        setPrintAfterAdd(false);
      }
    } catch (error) {
      console.error('Error saving book:', error);
      toast.error('Error saving book: ' + error.message);
    }
  };

  const handleEditBook = (book) => {
    setFormData(book);
    setImagePreview(book.book_image || '');
    setEditingId(book.id);
    setShowAddForm(true);
  };

  const handleDeleteBook = async (id) => {
    if (!await confirm({ title: 'Delete Book', message: 'Are you sure you want to delete this book?', variant: 'danger' })) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchBooks();
      toast.success('Book deleted!');
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Error deleting book');
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
    <div style={{ padding: isMobile ? '12px' : '20px' }}>
      {isReadOnly && <ViewOnlyBanner />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1>📚 Books</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isReadOnly && <button
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
              setImagePreview('');
              setFormData(emptyForm);
            }}
            data-tour="add-book"
            style={{ padding: isMobile ? '10px 14px' : '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '14px' : 'inherit' }}
          >
            ➕ Add Book
          </button>}
          {!isReadOnly && canExportData && <div style={{ position: 'relative' }} data-tour="import-export">
            <button onClick={() => setShowImportExport(!showImportExport)}
              style={{ padding: isMobile ? '10px 14px' : '8px 16px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '14px' : 'inherit' }}>
              📁 Import / Export ▾
            </button>
            {showImportExport && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setShowImportExport(false)} />
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'white', borderRadius: '8px', boxShadow: '0 6px 20px rgba(0,0,0,0.15)', border: '1px solid #e0e0e0', zIndex: 100, minWidth: '200px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', fontSize: '11px', color: '#999', fontWeight: '600', borderBottom: '1px solid #f0f0f0' }}>IMPORT</div>
                  <button onClick={() => { setShowImportExport(false); setShowImport(true); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', textAlign: 'left', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📤</span> Import from CSV
                  </button>
                  <button onClick={() => { setShowImportExport(false); setShowImport(true); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', textAlign: 'left', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📊</span> Import from Excel (.xls/.xlsx)
                  </button>
                  <div style={{ padding: '8px 12px', fontSize: '11px', color: '#999', fontWeight: '600', borderBottom: '1px solid #f0f0f0' }}>EXPORT</div>
                  <button onClick={() => {
                    setShowImportExport(false);
                    if (books.length === 0) return toast.warning('No books to export');
                    exportToCSV(books.map(b => ({ Title: b.title, Author: b.author, ISBN: b.isbn, Category: b.category, 'Book ID': b.book_id, Condition: b.condition, 'Total Copies': b.quantity_total, Available: b.quantity_available, 'Buying Price': b.price, MRP: b.mrp, 'Selling Price': b.sales_price, 'Discount %': b.discount_percent })), 'books_catalog');
                  }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', textAlign: 'left', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📥</span> Export as CSV
                  </button>
                  <button onClick={() => {
                    setShowImportExport(false);
                    if (books.length === 0) return toast.warning('No books to export');
                    const rows = books.map(b => ({ Title: b.title, Author: b.author, ISBN: b.isbn, Category: b.category, 'Book ID': b.book_id, Condition: b.condition, 'Total Copies': b.quantity_total, Available: b.quantity_available, 'Buying Price': b.price, MRP: b.mrp, 'Selling Price': b.sales_price, 'Discount %': b.discount_percent }));
                    const headers = Object.keys(rows[0]);
                    let tsv = headers.join('\t') + '\n';
                    rows.forEach(r => { tsv += headers.map(h => r[h] ?? '').join('\t') + '\n'; });
                    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `books_catalog_${new Date().toISOString().split('T')[0]}.xls`; a.click(); URL.revokeObjectURL(url);
                  }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📊</span> Export as Excel (.xls)
                  </button>
                </div>
              </>
            )}
          </div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by title, author, ISBN, or Book ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit', minWidth: isMobile ? '100%' : '200px' }}
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit', flex: isMobile ? '1 1 45%' : 'none' }}
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
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit', flex: isMobile ? '1 1 45%' : 'none' }}
          >
            <option value="all">All Conditions</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {showAddForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: isMobile ? '16px' : '30px', borderRadius: '8px', maxWidth: '700px', width: isMobile ? '95%' : '90%', maxHeight: '90vh', overflowY: 'auto' }}>
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
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
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
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Author</label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Book ID</label>
                  <input
                    type="text"
                    name="book_id"
                    value={formData.book_id || (formData.category ? `B-${getCategoryPrefix(formData.category)}-XXXX` : 'Select category first')}
                    readOnly
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', background: '#f5f5f5', color: '#667eea', fontFamily: 'monospace', fontWeight: '600', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
                  />
                  <p style={{ fontSize: '10px', color: '#999', marginTop: '3px' }}>Auto-generated. Each copy gets: B-{getCategoryPrefix(formData.category || 'GEN')}-0001, 0002...</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ISBN</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      name="isbn"
                      value={formData.isbn}
                      onChange={handleInputChange}
                      placeholder="e.g. 9780134685991"
                      style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minWidth: isMobile ? '0' : '120px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
                    />
                    <button type="button" onClick={() => lookupISBN()} disabled={isbnLooking}
                      style={{ padding: '10px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap', minHeight: isMobile ? '44px' : 'auto', minWidth: isMobile ? '44px' : 'auto' }}>
                      {isbnLooking ? '...' : '🔍'}
                    </button>
                    <button type="button" onClick={() => setShowIsbnScanner(true)}
                      style={{ padding: '10px 12px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', minHeight: isMobile ? '44px' : 'auto', minWidth: isMobile ? '44px' : 'auto' }}
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
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
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
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
                  >
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* PRICING SECTION */}
              <div style={{ background: '#f8f9ff', padding: '14px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e0e8ff' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '14px', color: '#667eea' }}>💰 Pricing</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#666' }}>Buying Price (₹)</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="-"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
                    />
                    <p style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>Your cost. Leave blank if N/A</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#666' }}>MRP (₹)</label>
                    <input
                      type="number"
                      name="mrp"
                      value={formData.mrp}
                      onChange={(e) => {
                        const mrp = parseFloat(e.target.value) || 0;
                        const disc = parseFloat(formData.discount_percent) || 0;
                        const sellingPrice = disc > 0 ? Math.round(mrp * (1 - disc / 100)) : mrp;
                        setFormData(prev => ({ ...prev, mrp: e.target.value, sales_price: sellingPrice || '' }));
                      }}
                      min="0"
                      placeholder="Maximum Retail Price"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#666' }}>Discount (%)</label>
                    <input
                      type="number"
                      name="discount_percent"
                      value={formData.discount_percent}
                      onChange={(e) => {
                        const disc = parseFloat(e.target.value) || 0;
                        const mrp = parseFloat(formData.mrp) || 0;
                        const sellingPrice = mrp > 0 ? Math.round(mrp * (1 - disc / 100)) : '';
                        setFormData(prev => ({ ...prev, discount_percent: e.target.value, sales_price: sellingPrice || prev.sales_price }));
                      }}
                      min="0" max="100" step="0.5"
                      placeholder="0"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#667eea' }}>Selling Price (₹)</label>
                    <input
                      type="number"
                      name="sales_price"
                      value={formData.sales_price}
                      onChange={(e) => {
                        const sp = parseFloat(e.target.value) || 0;
                        const mrp = parseFloat(formData.mrp) || 0;
                        const disc = mrp > 0 ? Math.round(((mrp - sp) / mrp) * 100) : '';
                        setFormData(prev => ({ ...prev, sales_price: e.target.value, discount_percent: disc || prev.discount_percent }));
                      }}
                      min="0"
                      placeholder="Auto from MRP - Discount"
                      style={{ width: '100%', padding: '10px', border: '2px solid #667eea', borderRadius: '4px', fontWeight: '700', color: '#667eea', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
                    />
                    {formData.mrp && formData.sales_price && parseFloat(formData.sales_price) < parseFloat(formData.mrp) && (
                      <p style={{ fontSize: '11px', color: '#27ae60', marginTop: '2px', fontWeight: '600' }}>
                        Save ₹{(parseFloat(formData.mrp) - parseFloat(formData.sales_price)).toLocaleString('en-IN')} ({formData.discount_percent}% off)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Total Copies</label>
                  <input
                    type="number"
                    name="quantity_total"
                    value={formData.quantity_total}
                    onChange={handleInputChange}
                    min="1"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
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
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}
                />
              </div>

              {/* Store visibility + borrowability toggles (ecommerce) */}
              <div style={{ marginBottom: '15px', padding: '12px 14px', background: '#f8f9ff', borderRadius: '6px', border: '1px dashed #c0c8f5' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#5a67d8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🌐 Online Store
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={!!formData.store_visible}
                    onChange={(e) => setFormData(prev => ({ ...prev, store_visible: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#5a67d8', cursor: 'pointer' }}
                  />
                  <span><strong>Show on www.tapasreadingcafe.com</strong> — customers can buy this book online (needs Selling Price set)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_borrowable !== false}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_borrowable: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#5a67d8', cursor: 'pointer' }}
                  />
                  <span><strong>Part of lending library</strong> — members can borrow this book (uncheck for bookstore-only stock)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={!!formData.is_staff_pick}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_staff_pick: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#D4A853', cursor: 'pointer' }}
                  />
                  <span>⭐ <strong>Staff pick</strong> — feature this book in the "Handpicked by our librarians" section on the storefront home</span>
                </label>
                {formData.is_staff_pick && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ display: 'flex', justifyContent:'space-between', alignItems:'center', fontSize: '12px', fontWeight: '700', color: '#8B6914', marginBottom: '6px' }}>
                      <span>STAFF PICK BLURB</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!formData.title) { alert('Enter a title first.'); return; }
                          try {
                            const { data, error } = await supabase.functions.invoke('ai-assist', {
                              body: { task: 'book_blurb', title: formData.title, author: formData.author, genre: formData.category },
                            });
                            if (error || !data?.text) throw new Error(data?.error || error?.message || 'AI failed');
                            const short = String(data.text).slice(0, 280);
                            setFormData(prev => ({ ...prev, staff_pick_blurb: short }));
                          } catch (err) {
                            alert('AI draft failed: ' + (err.message || err));
                          }
                        }}
                        style={{
                          padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                          background: '#667eea', color: 'white', border: 'none',
                          borderRadius: '4px', cursor: 'pointer',
                        }}
                        title="Let AI draft a blurb from title / author / genre"
                      >
                        ✨ Draft with AI
                      </button>
                    </label>
                    <textarea
                      name="staff_pick_blurb"
                      value={formData.staff_pick_blurb || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, staff_pick_blurb: e.target.value }))}
                      placeholder="One or two sentences on why your team loves this book. Shown under the book cover on the Home page."
                      rows={3}
                      maxLength={280}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <div style={{ fontSize: '11px', color: '#999', textAlign: 'right', marginTop: '2px' }}>
                      {(formData.staff_pick_blurb || '').length}/280
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button type="submit" disabled={isReadOnly} style={{ padding: '10px 20px', background: isReadOnly ? '#ccc' : '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontWeight: '600', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}>
                  {editingId ? 'Update Book' : 'Add Book'}
                </button>
                {!editingId && !isReadOnly && (
                  <button type="submit" onClick={() => setPrintAfterAdd(true)}
                    style={{ padding: '10px 20px', background: '#1dd1a1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}>
                    Add + 🖨️ Print Barcode
                  </button>
                )}
                <button type="button" onClick={() => setShowAddForm(false)}
                  style={{ padding: '10px 20px', background: '#e0e0e0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', minHeight: isMobile ? '44px' : 'auto', fontSize: isMobile ? '16px' : 'inherit' }}>
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
          isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid #f0f0f0' }}>
                  <div style={{ width: '50px', height: '70px', background: '#f0f0f0', borderRadius: '6px', animation: 'shimmer 1.4s ease-in-out infinite' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '14px', width: '70%', background: '#f0f0f0', borderRadius: '4px', marginBottom: '8px', animation: 'shimmer 1.4s ease-in-out infinite' }} />
                    <div style={{ height: '12px', width: '50%', background: '#f0f0f0', borderRadius: '4px', animation: 'shimmer 1.4s ease-in-out infinite' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )
        ) : filteredBooks.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📚</div>
            <p style={{ color: '#999', fontSize: '15px', margin: '0 0 12px' }}>{books.length === 0 ? 'No books in your library yet' : 'No books match your search'}</p>
            {books.length === 0 && <button onClick={handleAddBook} style={{ padding: '8px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>+ Add Your First Book</button>}
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            {filteredBooks.map((book) => {
              const cStyle = hasCondition && book.condition ? CONDITION_STYLE[book.condition] || {} : {};
              return (
                <div key={book.id} style={{ background: 'white', borderRadius: '10px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid #f0f0f0' }}>
                  <div style={{ width: '50px', height: '70px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {book.book_image ? (
                      <img src={book.book_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span style={{ fontSize: '20px' }}>📚</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</div>
                    <div style={{ fontSize: '12px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {book.category && (
                        <span style={{ background: '#e8f4fd', color: '#2980b9', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{book.category}</span>
                      )}
                      {hasCondition && book.condition && (
                        <span style={{ background: cStyle.bg, color: cStyle.text, padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>{book.condition}</span>
                      )}
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>₹{book.sales_price || book.price}</span>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: book.quantity_available > 0 ? '#d4edda' : '#f8d7da', color: book.quantity_available > 0 ? '#155724' : '#721c24' }}>
                        {book.quantity_available}/{book.quantity_total}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => handleEditBook(book)} disabled={isReadOnly}
                      style={{ width: '36px', height: '36px', background: isReadOnly ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Edit book">
                      ✏️
                    </button>
                    <button onClick={() => navigate(`/books/${book.id}/copies`)}
                      style={{ width: '36px', height: '36px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Manage copies">
                      📦
                    </button>
                    {!isReadOnly && canDeleteBooks && <button onClick={() => handleDeleteBook(book.id)}
                      style={{ width: '36px', height: '36px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete book">
                      🗑️
                    </button>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Title</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Author</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Category</th>
                  {hasCondition && <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Condition</th>}
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Available</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Buying</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>MRP</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Selling</th>
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
                      <td style={{ padding: '12px', color: '#666' }}>{book.price ? `₹${book.price.toLocaleString('en-IN')}` : '—'}</td>
                      <td style={{ padding: '12px' }}>{book.mrp ? `₹${book.mrp.toLocaleString('en-IN')}` : '—'}</td>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#155724' }}>{book.sales_price ? `₹${book.sales_price.toLocaleString('en-IN')}` : book.mrp ? `₹${book.mrp.toLocaleString('en-IN')}` : '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => handleEditBook(book)} disabled={isReadOnly}
                            style={{ padding: '4px 8px', background: isReadOnly ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: isReadOnly ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                            title="Edit book">
                            ✏️
                          </button>
                          <button onClick={() => navigate(`/books/${book.id}/copies`)}
                            style={{ padding: '4px 8px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                            title="Manage copies & print barcodes">
                            📦
                          </button>
                          {!isReadOnly && canDeleteBooks && <button onClick={() => handleDeleteBook(book.id)}
                            style={{ padding: '4px 8px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                            title="Delete book">
                            🗑️
                          </button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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