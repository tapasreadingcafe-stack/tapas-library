import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Books from './pages/Books';
import Borrow from './pages/Borrow';
import POS from './pages/POS';
import Reports from './pages/Reports';
import './App.css';
import MemberProfile from './pages/MemberProfile';
import OverdueBooks from './pages/OverdueBooks';
import BookAvailability from './pages/BookAvailability';
import BorrowStatistics from './pages/BorrowStatistics';
import Reservations from './pages/Reservations';
import Fines from './pages/Fines';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-left">
          <button 
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <h1 className="app-title">📚 Tapas Library</h1>
        </div>
        <div className="navbar-right">
          <span className="user-info">👤 Admin</span>
          <button className="logout-btn">Logout</button>
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <nav className="sidebar-nav">
          <Link to="/" className="nav-link">
            <span className="nav-icon">📊</span>
            <span className="nav-label">Dashboard</span>
          </Link>
          <Link to="/members" className="nav-link">
            <span className="nav-icon">👥</span>
            <span className="nav-label">Members</span>
          </Link>
          <Link to="/books" className="nav-link">
            <span className="nav-icon">📖</span>
            <span className="nav-label">Books</span>
          </Link>
          <Link to="/Borrow" className="nav-link">
            <span className="nav-icon">📚</span>
            <span className="nav-label">Borrow</span>
          </Link>
          <Link to="/overdue" className="nav-link"><span className="nav-icon">🔴</span><span className="nav-label">Overdue</span></Link>
          <Link to="/availability" className="nav-link"><span className="nav-icon">📚</span><span className="nav-label">Availability</span></Link>
          <Link to="/statistics" className="nav-link"><span className="nav-icon">📊</span><span className="nav-label">Statistics</span></Link>
          <Link to="/pos" className="nav-link">
            <span className="nav-icon">🛒</span>
            <span className="nav-label">POS</span>
          </Link>
          <Link to="/fines" className="nav-link">
            <span className="nav-icon">💰</span>
            <span className="nav-label">Fines</span>
          </Link>
          <Link to="/reservations" className="nav-link">
            <span className="nav-icon">🔖</span>
            <span className="nav-label">Reservations</span>
          </Link>
          <Link to="/reports" className="nav-link">
            <span className="nav-icon">📈</span>
            <span className="nav-label">Reports</span>
          </Link>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`main-content ${sidebarOpen ? 'expanded' : 'full'}`}>
        <Routes>
          <Route path="/overdue" element={<OverdueBooks />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/books" element={<Books />} />
          <Route path="/Borrow" element={<Borrow />} />
          <Route path="/availability" element={<BookAvailability />} />
          <Route path="/statistics" element={<BorrowStatistics />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/member/:memberId" element={<MemberProfile />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/fines" element={<Fines />} />
      
    
        </Routes>
      </main>
    </div>
  );
}

export default App;