import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const CATEGORIES = [
  { icon:'🧙', label:'Fiction', color:'#667EEA' },
  { icon:'📰', label:'Non-Fiction', color:'#F6AD55' },
  { icon:'🔬', label:'Science', color:'#68D391' },
  { icon:'📜', label:'History', color:'#FC8181' },
  { icon:'👦', label:'Children', color:'#76E4F7' },
  { icon:'💼', label:'Business', color:'#B794F4' },
  { icon:'🌍', label:'Travel', color:'#F6E05E' },
  { icon:'🎨', label:'Arts', color:'#FBB6CE' },
];

const TESTIMONIALS = [
  { name:'Priya S.', text:'Best library in town! The collection is amazing and staff is super helpful.', rating:5 },
  { name:'Rahul M.', text:'Love the online reservation system. Makes borrowing books so convenient!', rating:5 },
  { name:'Anita K.', text:'My kids love the children\'s section. A wonderful community space.', rating:5 },
];

function StarRating({ rating }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= rating ? '#D4A853' : '#ddd', fontSize:'16px' }}>★</span>
      ))}
    </span>
  );
}

function BookCard({ book }) {
  return (
    <Link to={`/books/${book.id}`} style={{ textDecoration:'none', color:'inherit' }}>
      <div style={{
        background:'white', borderRadius:'12px', overflow:'hidden',
        boxShadow:'0 4px 15px rgba(0,0,0,0.08)', transition:'transform 0.2s, box-shadow 0.2s',
        cursor:'pointer', height:'100%'
      }}
        onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 8px 25px rgba(0,0,0,0.15)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 15px rgba(0,0,0,0.08)'; }}
      >
        <div style={{ height:'180px', background:'linear-gradient(135deg, #F5DEB3, #D4A853)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          {(book.book_image || book.cover_image) ? (
            <img src={book.book_image || book.cover_image} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ textAlign:'center', padding:'20px' }}>
              <div style={{ fontSize:'48px', marginBottom:'8px' }}>📖</div>
              <div style={{ fontSize:'11px', color:'#8B6914', fontWeight:'600', textTransform:'uppercase', letterSpacing:'1px' }}>
                {book.genre || book.category || 'Book'}
              </div>
            </div>
          )}
          <div style={{
            position:'absolute', top:'10px', right:'10px',
            background: book.quantity_available > 0 ? '#48BB78' : '#FC8181',
            color:'white', fontSize:'10px', fontWeight:'700', padding:'3px 8px', borderRadius:'10px'
          }}>
            {book.quantity_available > 0 ? '✅ In Stock' : '❌ Sold Out'}
          </div>
        </div>
        <div style={{ padding:'16px' }}>
          <h3 style={{ fontFamily:'"Playfair Display", serif', fontSize:'15px', fontWeight:'600', marginBottom:'6px', lineHeight:'1.3', color:'#2C1810' }}>
            {book.title}
          </h3>
          <p style={{ color:'#8B6914', fontSize:'13px', marginBottom:'10px' }}>{book.author}</p>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {Number(book.sales_price || 0) > 0 ? (
              <span style={{ color:'#D4A853', fontWeight:'700', fontSize:'16px' }}>₹{book.sales_price}</span>
            ) : (
              <span style={{ color:'#48BB78', fontWeight:'600', fontSize:'13px' }}>Borrow Only</span>
            )}
            <span style={{ color:'#D4A853', fontSize:'13px' }}>★ {book.rating || '4.5'}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [booksRes, newRes] = await Promise.all([
        supabase.from('books').select('*').eq('store_visible', true).gt('quantity_available', 0).limit(8).order('title'),
        supabase.from('books').select('*').eq('store_visible', true).limit(8).order('created_at', { ascending:false }),
      ]);

      setFeaturedBooks(booksRes.data || []);
      setNewArrivals(newRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) navigate(`/books?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  return (
    <div style={{ fontFamily:'Lato, sans-serif' }}>

      {/* HERO */}
      <section style={{
        background:'linear-gradient(135deg, #2C1810 0%, #4A2C17 40%, #6B3D26 100%)',
        color:'white', minHeight:'85vh', display:'flex', alignItems:'center',
        position:'relative', overflow:'hidden'
      }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 50%, rgba(212,168,83,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(245,222,179,0.05) 0%, transparent 50%)' }} />
        <div style={{ position:'absolute', right:'-100px', top:'-100px', width:'500px', height:'500px', borderRadius:'50%', background:'rgba(212,168,83,0.05)', border:'2px solid rgba(212,168,83,0.1)' }} />
        <div style={{ position:'absolute', left:'-50px', bottom:'-50px', width:'300px', height:'300px', borderRadius:'50%', background:'rgba(245,222,179,0.03)' }} />

        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'80px 20px', position:'relative', zIndex:1, width:'100%' }}>
          <div style={{ maxWidth:'650px' }}>
            <div style={{ display:'inline-block', background:'rgba(212,168,83,0.2)', border:'1px solid rgba(212,168,83,0.4)', borderRadius:'20px', padding:'6px 16px', fontSize:'13px', color:'#D4A853', letterSpacing:'1px', marginBottom:'24px', textTransform:'uppercase', fontWeight:'600' }}>
              📚 Your Neighbourhood Book Store
            </div>
            <h1 style={{ fontFamily:'"Playfair Display", serif', fontSize:'clamp(36px, 6vw, 68px)', fontWeight:'800', lineHeight:'1.1', marginBottom:'24px', color:'#F5DEB3' }}>
              Tapas Library<br />
              <span style={{ color:'#D4A853' }}>&amp; Book Store</span>
            </h1>
            <p style={{ fontSize:'18px', lineHeight:'1.7', color:'rgba(245,222,179,0.85)', marginBottom:'40px', maxWidth:'500px' }}>
              Discover thousands of books, borrow your favourites, or own them forever. Your next great read is waiting.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ display:'flex', gap:'0', marginBottom:'32px', maxWidth:'500px', borderRadius:'50px', overflow:'hidden', boxShadow:'0 8px 30px rgba(0,0,0,0.3)' }}>
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by title, author, or genre..."
                style={{ flex:1, padding:'16px 24px', border:'none', fontSize:'15px', outline:'none', background:'white', color:'#2C1810' }}
              />
              <button type="submit" style={{ padding:'16px 28px', background:'linear-gradient(135deg, #D4A853, #C49040)', border:'none', color:'#2C1810', fontWeight:'700', cursor:'pointer', fontSize:'15px' }}>
                🔍 Search
              </button>
            </form>

            <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
              <Link to="/books" style={{ background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810', textDecoration:'none', padding:'14px 32px', borderRadius:'50px', fontWeight:'700', fontSize:'16px', boxShadow:'0 4px 15px rgba(212,168,83,0.4)' }}>
                Browse Books →
              </Link>
              <Link to="/offers" style={{ border:'2px solid rgba(245,222,179,0.5)', color:'#F5DEB3', textDecoration:'none', padding:'14px 32px', borderRadius:'50px', fontWeight:'600', fontSize:'16px' }}>
                View Offers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ background:'linear-gradient(135deg, #D4A853, #C49040)', padding:'30px 20px' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'20px', textAlign:'center' }}>
          {[
            { num:'5000+', label:'Books Available' },
            { num:'2000+', label:'Happy Members' },
            { num:'15+', label:'Genres' },
            { num:'10+', label:'Years of Service' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize:'32px', fontWeight:'800', color:'#2C1810', fontFamily:'"Playfair Display", serif' }}>{s.num}</div>
              <div style={{ fontSize:'14px', color:'#5C3A1E', fontWeight:'600' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED BOOKS */}
      <section style={{ maxWidth:'1200px', margin:'0 auto', padding:'60px 20px' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', marginBottom:'12px' }}>
            ⭐ Featured Books
          </h2>
          <p style={{ color:'#8B6914', fontSize:'16px' }}>Hand-picked favourites from our collection</p>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#8B6914' }}>Loading books...</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'24px', marginBottom:'32px' }}>
            {featuredBooks.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        )}

        <div style={{ textAlign:'center' }}>
          <Link to="/books" style={{ background:'linear-gradient(135deg, #2C1810, #4A2C17)', color:'#F5DEB3', textDecoration:'none', padding:'14px 40px', borderRadius:'50px', fontWeight:'600', fontSize:'15px', display:'inline-block' }}>
            View All Books →
          </Link>
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ background:'#FFF8ED', padding:'60px 20px' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'40px' }}>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', marginBottom:'12px' }}>
              Browse by Genre
            </h2>
            <p style={{ color:'#8B6914', fontSize:'16px' }}>Find your perfect read</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'16px' }}>
            {CATEGORIES.map(cat => (
              <Link key={cat.label} to={`/books?genre=${encodeURIComponent(cat.label)}`} style={{ textDecoration:'none' }}>
                <div style={{
                  background:'white', borderRadius:'16px', padding:'24px 16px', textAlign:'center',
                  boxShadow:'0 2px 10px rgba(0,0,0,0.06)', cursor:'pointer', transition:'all 0.2s',
                  border:`2px solid transparent`
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ fontSize:'36px', marginBottom:'10px' }}>{cat.icon}</div>
                  <div style={{ fontWeight:'600', fontSize:'14px', color:'#2C1810' }}>{cat.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section style={{ maxWidth:'1200px', margin:'0 auto', padding:'60px 20px' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', marginBottom:'12px' }}>
            🆕 New Arrivals
          </h2>
          <p style={{ color:'#8B6914', fontSize:'16px' }}>Fresh additions to our collection</p>
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#8B6914' }}>Loading...</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'24px', marginBottom:'32px' }}>
            {newArrivals.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        )}
      </section>

      {/* OFFERS BANNER */}
      <section style={{
        background:'linear-gradient(135deg, #2C1810 0%, #4A2C17 100%)',
        padding:'60px 20px', textAlign:'center', color:'white'
      }}>
        <div style={{ maxWidth:'700px', margin:'0 auto' }}>
          <div style={{ fontSize:'48px', marginBottom:'16px' }}>🎉</div>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#F5DEB3', marginBottom:'16px' }}>
            Exclusive Member Offers
          </h2>
          <p style={{ color:'rgba(245,222,179,0.8)', fontSize:'16px', marginBottom:'32px', lineHeight:'1.6' }}>
            Join as a Gold member and get unlimited borrows, priority reservations, and 20% off all book purchases!
          </p>
          <div style={{ display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/offers" style={{ background:'linear-gradient(135deg, #D4A853, #C49040)', color:'#2C1810', textDecoration:'none', padding:'14px 32px', borderRadius:'50px', fontWeight:'700', fontSize:'16px' }}>
              See All Offers →
            </Link>
            <Link to="/login" style={{ border:'2px solid rgba(245,222,179,0.5)', color:'#F5DEB3', textDecoration:'none', padding:'14px 32px', borderRadius:'50px', fontWeight:'600', fontSize:'16px' }}>
              Become a Member
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ background:'#FFF8ED', padding:'60px 20px' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'40px' }}>
            <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', marginBottom:'12px' }}>
              What Our Members Say
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'24px' }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background:'white', borderRadius:'16px', padding:'28px', boxShadow:'0 4px 15px rgba(0,0,0,0.07)' }}>
                <StarRating rating={t.rating} />
                <p style={{ color:'#5C3A1E', lineHeight:'1.7', margin:'16px 0', fontSize:'15px', fontStyle:'italic' }}>"{t.text}"</p>
                <div style={{ fontWeight:'700', color:'#2C1810' }}>— {t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEMBERSHIP CTA */}
      <section style={{ maxWidth:'1200px', margin:'0 auto', padding:'60px 20px' }}>
        <div style={{ background:'linear-gradient(135deg, #FFF8ED, #FAEBD7)', borderRadius:'24px', padding:'50px', textAlign:'center', border:'2px solid rgba(212,168,83,0.3)' }}>
          <h2 style={{ fontFamily:'"Playfair Display", serif', fontSize:'36px', fontWeight:'700', color:'#2C1810', marginBottom:'12px' }}>
            Join Tapas Library Today
          </h2>
          <p style={{ color:'#8B6914', fontSize:'16px', marginBottom:'40px', maxWidth:'500px', margin:'0 auto 40px' }}>
            Choose the membership that suits you best and start your reading journey.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'20px', maxWidth:'800px', margin:'0 auto' }}>
            {[
              { tier:'Basic', price:'₹300', period:'/month', features:['5 books at a time', 'Standard access', 'Email support'], color:'#8B6914', bg:'white' },
              { tier:'Silver', price:'₹500', period:'/month', features:['10 books at a time', 'Priority reservations', 'Phone support', '10% book discount'], color:'white', bg:'linear-gradient(135deg, #2C1810, #4A2C17)', popular:true },
              { tier:'Gold', price:'₹800', period:'/month', features:['Unlimited borrows', 'Earliest access', 'Dedicated support', '20% book discount', 'Guest passes'], color:'#2C1810', bg:'linear-gradient(135deg, #D4A853, #C49040)' },
            ].map(plan => (
              <div key={plan.tier} style={{
                background: plan.bg, borderRadius:'16px', padding:'30px', textAlign:'center',
                boxShadow: plan.popular ? '0 8px 30px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.07)',
                transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                position:'relative', overflow:'hidden'
              }}>
                {plan.popular && (
                  <div style={{ position:'absolute', top:'12px', right:'12px', background:'#D4A853', color:'#2C1810', fontSize:'10px', fontWeight:'800', padding:'3px 10px', borderRadius:'10px', letterSpacing:'1px' }}>
                    POPULAR
                  </div>
                )}
                <div style={{ fontFamily:'"Playfair Display", serif', fontSize:'22px', fontWeight:'700', color: plan.color, marginBottom:'8px' }}>{plan.tier}</div>
                <div style={{ fontSize:'36px', fontWeight:'800', color: plan.color, fontFamily:'"Playfair Display", serif' }}>{plan.price}</div>
                <div style={{ color: plan.color, opacity:0.7, fontSize:'13px', marginBottom:'20px' }}>{plan.period}</div>
                {plan.features.map(f => (
                  <div key={f} style={{ color: plan.color, opacity:0.9, fontSize:'13px', marginBottom:'8px' }}>✓ {f}</div>
                ))}
                <Link to="/login" style={{ display:'block', marginTop:'20px', padding:'10px', borderRadius:'25px', background: plan.popular ? '#D4A853' : 'rgba(0,0,0,0.1)', color: plan.popular ? '#2C1810' : plan.color, textDecoration:'none', fontWeight:'700', fontSize:'14px' }}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
