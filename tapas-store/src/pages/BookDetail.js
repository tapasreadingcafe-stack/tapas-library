import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useApp } from '../App';
import { useCart } from '../context/CartContext';

function StarRating({ rating, interactive, onRate }) {
  const [hover, setHover] = useState(0);
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span
          key={i}
          style={{ color: i <= (hover || rating) ? '#D4A853' : '#ddd', fontSize: interactive ? '28px' : '18px', cursor: interactive ? 'pointer' : 'default' }}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate && onRate(i)}
        >★</span>
      ))}
    </span>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member } = useApp();
  const { addBook } = useCart();
  const [book, setBook] = useState(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [wishlisting, setWishlisting] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [reservationMsg, setReservationMsg] = useState('');

  useEffect(() => {
    if (id) fetchAll();
  }, [id]); // eslint-disable-line

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bookRes, reviewsRes] = await Promise.all([
        supabase.from('books').select('*').eq('id', id).single(),
        supabase.from('reviews').select('*, members(name)').eq('book_id', id).order('created_at', { ascending:false }).limit(10),
      ]);

      if (bookRes.error || !bookRes.data) { navigate('/books'); return; }

      setBook(bookRes.data);
      setReviews(reviewsRes.data || []);

      // Similar books
      if (bookRes.data.genre) {
        const { data: simRes } = await supabase.from('books').select('*').ilike('genre', `%${bookRes.data.genre}%`).neq('id', id).limit(4);
        setSimilar(simRes || []);
      }

      // Check wishlist
      if (member) {
        const { data: wl } = await supabase.from('wishlists').select('id').eq('member_id', member.id).eq('book_id', id).single();
        setInWishlist(!!wl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!member) { navigate('/login'); return; }
    setReserving(true);
    try {
      const { error } = await supabase.from('reservations').insert([{
        member_id: member.id,
        book_id: parseInt(id),
        reservation_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      }]);
      if (error) throw error;
      setReservationMsg('✅ Reserved successfully! We\'ll notify you when ready.');
    } catch (err) {
      setReservationMsg('❌ ' + (err.message || 'Failed to reserve. You may already have a reservation.'));
    } finally {
      setReserving(false);
    }
  };

  const handleAddToCart = () => {
    if (!book) return;
    addBook(book, 1);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleWishlist = async () => {
    if (!member) { navigate('/login'); return; }
    setWishlisting(true);
    try {
      if (inWishlist) {
        await supabase.from('wishlists').delete().eq('member_id', member.id).eq('book_id', id);
        setInWishlist(false);
      } else {
        await supabase.from('wishlists').insert([{ member_id: member.id, book_id: parseInt(id) }]);
        setInWishlist(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWishlisting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:'16px', fontFamily:'Lato, sans-serif' }}>
        <div style={{ fontSize:'48px' }}>📖</div>
        <p style={{ color:'#8B6914' }}>Loading book details...</p>
      </div>
    );
  }

  if (!book) return null;

  const available = book.quantity_available > 0;
  const forSale = Number(book.sales_price || 0) > 0 && book.store_visible !== false;
  const borrowable = book.is_borrowable !== false;
  const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1) : null;

  return (
    <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px 20px', fontFamily:'Lato, sans-serif' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom:'24px', display:'flex', gap:'8px', alignItems:'center', fontSize:'14px', color:'#8B6914' }}>
        <Link to="/" style={{ color:'#D4A853', textDecoration:'none' }}>Home</Link>
        <span>›</span>
        <Link to="/books" style={{ color:'#D4A853', textDecoration:'none' }}>Books</Link>
        <span>›</span>
        <span style={{ color:'#2C1810' }}>{book.title}</span>
      </div>

      {/* Main Content */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:'48px', marginBottom:'48px' }}>

        {/* Book Cover */}
        <div style={{ position:'sticky', top:'80px', alignSelf:'start' }}>
          <div style={{
            width:'100%', aspectRatio:'3/4', borderRadius:'16px', overflow:'hidden',
            background:'linear-gradient(145deg, #F5DEB3, #D4A853)',
            boxShadow:'0 20px 60px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            {book.cover_image ? (
              <img src={book.cover_image} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <div style={{ textAlign:'center', padding:'30px' }}>
                <div style={{ fontSize:'80px', marginBottom:'16px' }}>📖</div>
                <div style={{ color:'#8B6914', fontSize:'16px', fontWeight:'600', fontFamily:'"Playfair Display", serif' }}>{book.genre || 'Book'}</div>
              </div>
            )}
          </div>

          {/* Availability Badge */}
          <div style={{
            marginTop:'16px', padding:'12px 20px', borderRadius:'12px', textAlign:'center',
            background: available ? 'rgba(72,187,120,0.1)' : 'rgba(252,129,129,0.1)',
            border: `2px solid ${available ? '#48BB78' : '#FC8181'}`,
            color: available ? '#276749' : '#9B2335', fontWeight:'700', fontSize:'16px'
          }}>
            {available ? `✅ Available (${book.quantity_available} copies)` : '❌ Currently Borrowed'}
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop:'16px', display:'flex', flexDirection:'column', gap:'10px' }}>
            {forSale && available && (
              <button
                onClick={handleAddToCart}
                style={{
                  padding:'14px', borderRadius:'12px', border:'none', cursor:'pointer',
                  background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810',
                  fontWeight:'700', fontSize:'16px', fontFamily:'Lato, sans-serif',
                  boxShadow:'0 4px 15px rgba(212,168,83,0.4)'
                }}
              >
                {addedToCart ? '✅ Added to Cart' : '🛒 Add to Cart'}
              </button>
            )}
            {borrowable && (
              <button
                onClick={handleReserve}
                disabled={reserving}
                style={{
                  padding:'14px', borderRadius:'12px', border: forSale ? '2px solid #D4A853' : 'none',
                  cursor:'pointer',
                  background: forSale ? 'white' : 'linear-gradient(135deg, #D4A853, #C49040)',
                  color:'#2C1810',
                  fontWeight:'700', fontSize:'16px', fontFamily:'Lato, sans-serif',
                  boxShadow: forSale ? 'none' : '0 4px 15px rgba(212,168,83,0.4)'
                }}
              >
                {reserving ? '⏳ Reserving...' : '🔖 Reserve This Book'}
              </button>
            )}
            <button
              onClick={handleWishlist}
              disabled={wishlisting}
              style={{
                padding:'14px', borderRadius:'12px', border:`2px solid ${inWishlist ? '#FC8181' : '#D4A853'}`,
                cursor:'pointer', background: inWishlist ? 'rgba(252,129,129,0.1)' : 'white',
                color: inWishlist ? '#9B2335' : '#2C1810', fontWeight:'700', fontSize:'16px', fontFamily:'Lato, sans-serif'
              }}
            >
              {wishlisting ? '⏳ ...' : inWishlist ? '💔 Remove from Wishlist' : '❤️ Add to Wishlist'}
            </button>
          </div>

          {reservationMsg && (
            <div style={{ marginTop:'12px', padding:'12px', borderRadius:'8px', background: reservationMsg.startsWith('✅') ? 'rgba(72,187,120,0.1)' : 'rgba(252,129,129,0.1)', color: reservationMsg.startsWith('✅') ? '#276749' : '#9B2335', fontSize:'13px', lineHeight:'1.4', textAlign:'center' }}>
              {reservationMsg}
            </div>
          )}
        </div>

        {/* Book Info */}
        <div>
          {book.genre && (
            <span style={{ background:'rgba(212,168,83,0.15)', color:'#8B6914', padding:'4px 14px', borderRadius:'20px', fontSize:'13px', fontWeight:'600', display:'inline-block', marginBottom:'16px' }}>
              {book.genre}
            </span>
          )}

          <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'40px', fontWeight:'800', color:'#2C1810', lineHeight:'1.2', marginBottom:'12px' }}>
            {book.title}
          </h1>

          <p style={{ fontSize:'20px', color:'#8B6914', marginBottom:'16px' }}>
            by <span style={{ fontWeight:'600', color:'#5C3A1E' }}>{book.author}</span>
          </p>

          {avgRating && (
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
              <StarRating rating={Math.round(parseFloat(avgRating))} />
              <span style={{ color:'#8B6914', fontSize:'16px' }}>{avgRating} ({reviews.length} reviews)</span>
            </div>
          )}

          {forSale && (
            <div style={{ marginBottom:'24px' }}>
              <span style={{ fontSize:'32px', fontWeight:'800', color:'#D4A853', fontFamily:'"Playfair Display", serif' }}>₹{book.sales_price}</span>
              {book.mrp && Number(book.mrp) > Number(book.sales_price) && (
                <span style={{ color:'#8B6914', fontSize:'16px', marginLeft:'12px', textDecoration:'line-through' }}>₹{book.mrp}</span>
              )}
              <span style={{ color:'#8B6914', fontSize:'14px', marginLeft:'8px' }}>purchase price</span>
            </div>
          )}

          {book.description && (
            <div style={{ marginBottom:'28px' }}>
              <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'20px', color:'#2C1810', marginBottom:'12px' }}>About This Book</h3>
              <p style={{ color:'#5C3A1E', lineHeight:'1.8', fontSize:'16px' }}>{book.description}</p>
            </div>
          )}

          {/* Book Details */}
          <div style={{ background:'#FFF8ED', borderRadius:'12px', padding:'20px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'16px' }}>
            {[
              { label:'ISBN', value: book.isbn || 'N/A' },
              { label:'Publisher', value: book.publisher || 'N/A' },
              { label:'Year', value: book.publication_year || 'N/A' },
              { label:'Language', value: book.language || 'English' },
              { label:'Pages', value: book.pages || 'N/A' },
              { label:'Total Copies', value: book.quantity_total || '1' },
            ].map(d => (
              <div key={d.label}>
                <div style={{ fontSize:'11px', fontWeight:'700', color:'#8B6914', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>{d.label}</div>
                <div style={{ fontSize:'15px', color:'#2C1810', fontWeight:'600' }}>{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div style={{ marginBottom:'48px' }}>
        <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'28px', color:'#2C1810', marginBottom:'24px' }}>
          ⭐ Member Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <div style={{ background:'white', borderRadius:'12px', padding:'32px', textAlign:'center', color:'#8B6914', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
            No reviews yet. Be the first to review!
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            {reviews.map(review => (
              <div key={review.id} style={{ background:'white', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                  <div>
                    <div style={{ fontWeight:'700', color:'#2C1810' }}>{review.members?.name || 'Anonymous'}</div>
                    <StarRating rating={review.rating || 5} />
                  </div>
                  <div style={{ color:'#8B6914', fontSize:'13px' }}>
                    {review.created_at ? new Date(review.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : ''}
                  </div>
                </div>
                {review.review_text && <p style={{ color:'#5C3A1E', lineHeight:'1.6', fontStyle:'italic' }}>"{review.review_text}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Similar Books */}
      {similar.length > 0 && (
        <div>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'28px', color:'#2C1810', marginBottom:'24px' }}>
            You Might Also Like
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'20px' }}>
            {similar.map(b => (
              <Link key={b.id} to={`/books/${b.id}`} style={{ textDecoration:'none', color:'inherit' }}>
                <div style={{ background:'white', borderRadius:'12px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.07)', transition:'all 0.2s', cursor:'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.07)'; }}
                >
                  <div style={{ height:'140px', background:'linear-gradient(145deg, #F5DEB3, #D4A853)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {b.cover_image ? <img src={b.cover_image} alt={b.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:'40px' }}>📖</span>}
                  </div>
                  <div style={{ padding:'12px' }}>
                    <h4 style={{ fontFamily:'"Playfair Display", serif', fontSize:'13px', color:'#2C1810', marginBottom:'4px', lineHeight:'1.3' }}>{b.title}</h4>
                    <p style={{ color:'#8B6914', fontSize:'12px' }}>{b.author}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
