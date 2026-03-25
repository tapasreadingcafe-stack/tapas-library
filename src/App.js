import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Books from './pages/Books';
import Circulation from './pages/Circulation';
import POS from './pages/POS';
import Reports from './pages/Reports';
import './App.css';

export default function App() {
const navigate = useNavigate();
const [sidebarOpen, setSidebarOpen] = useState(true);

return (
<div className="app-container">
{/* Navigation Bar */}
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

```
  {/* Sidebar */}
  <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
    <nav className="sidebar-nav">
      <button
        className="nav-link"
        onClick={() => navigate('/')}
        title="Dashboard"
      >
        <span className="nav-icon">📊</span>
        <span className="nav-label">Dashboard</span>
      </button>

      <button
        className="nav-link"
        onClick={() => navigate('/members')}
        title="Members"
      >
        <span className="nav-icon">👥</span>
        <span className="nav-label">Members</span>
      </button>

      <button
        className="nav-link"
        onClick={() => navigate('/books')}
        title="Books"
      >
        <span className="nav-icon">📚</span>
        <span className="nav-label">Books</span>
      </button>

      <button
        className="nav-link"
        onClick={() => navigate('/circulation')}
        title="Circulation"
      >
        <span className="nav-icon">🔄</span>
        <span className="nav-label">Circulation</span>
      </button>

      <button
        className="nav-link"
        onClick={() => navigate('/pos')}
        title="Point of Sale"
      >
        <span className="nav-icon">🛒</span>
        <span className="nav-label">POS</span>
      </button>

      <button
        className="nav-link"
        onClick={() => navigate('/reports')}
        title="Reports"
      >
        <span className="nav-icon">📈</span>
        <span className="nav-label">Reports</span>
      </button>
    </nav>
  </aside>

  {/* Main Content */}
  <main className={`main-content ${sidebarOpen ? 'expanded' : 'full'}`}>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/members" element={<Members />} />
      <Route path="/books" element={<Books />} />
      <Route path="/circulation" element={<Circulation />} />
      <Route path="/pos" element={<POS />} />
      <Route path="/reports" element={<Reports />} />
    </Routes>
  </main>
</div>
);
}