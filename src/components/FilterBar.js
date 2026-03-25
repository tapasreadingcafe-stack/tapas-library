import React, { useState } from 'react';

function FilterBar({ onFilterChange, onClose }) {
  const [search, setSearch] = useState('');
  const [membershipCategory, setMembershipCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [sortBy, setSortBy] = useState('expiry_date');

  const handleSearch = (value) => {
    setSearch(value);
    applyFilters({
      search: value,
      membershipCategory,
      sortOrder,
      sortBy
    });
  };

  const handleMembershipChange = (category) => {
    setMembershipCategory(category);
    applyFilters({
      search,
      membershipCategory: category,
      sortOrder,
      sortBy
    });
  };

  const handleSortOrderToggle = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    applyFilters({
      search,
      membershipCategory,
      sortOrder: newOrder,
      sortBy
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setMembershipCategory('all');
    setSortOrder('asc');
    setSortBy('expiry_date');
    applyFilters({
      search: '',
      membershipCategory: 'all',
      sortOrder: 'asc',
      sortBy: 'expiry_date'
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyFilters({
        search,
        membershipCategory,
        sortOrder,
        sortBy
      });
    }
  };

  const applyFilters = (filters) => {
    let membershipStatus = [];
    let membershipPlan = [];

    if (filters.membershipCategory === 'all') {
      membershipStatus = ['active', 'expiring', 'expired', 'guest'];
      membershipPlan = ['day_pass', 'basic', 'premium', 'family', 'student', 'teen', 'no_plan'];
    } else if (filters.membershipCategory === 'subscription') {
      membershipStatus = ['active', 'expiring', 'expired'];
      membershipPlan = ['day_pass', 'basic', 'premium', 'family', 'student', 'teen'];
    } else if (filters.membershipCategory === 'non_subscription') {
      membershipStatus = ['guest'];
      membershipPlan = ['no_plan'];
    }

    onFilterChange({
      search: filters.search,
      membershipStatus,
      membershipPlan,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    });
  };

  return (
    <div className="filter-bar-horizontal">
      {/* Search Bar */}
      <div className="filter-row-main">
        <input
          type="text"
          className="filter-search-input"
          placeholder="Search name, phone, email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyPress={handleKeyPress}
        />

        {/* Membership Category Buttons */}
        <div className="filter-category-buttons">
          <button
            className={`category-btn ${membershipCategory === 'all' ? 'active' : ''}`}
            onClick={() => handleMembershipChange('all')}
            title="All Members"
          >
            All
          </button>
          <button
            className={`category-btn ${membershipCategory === 'subscription' ? 'active' : ''}`}
            onClick={() => handleMembershipChange('subscription')}
            title="Subscription Members"
          >
            Members
          </button>
          <button
            className={`category-btn ${membershipCategory === 'non_subscription' ? 'active' : ''}`}
            onClick={() => handleMembershipChange('non_subscription')}
            title="Non-Subscription Members"
          >
            Guests
          </button>
        </div>

        {/* Sort Order Icon */}
        <button
          className="btn-icon-sm"
          onClick={handleSortOrderToggle}
          title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>

        {/* Clear Button */}
        <button
          className="btn-icon-sm"
          onClick={handleClearFilters}
          title="Clear All Filters"
        >
          🗑️
        </button>

        {/* Close Button */}
        <button
          className="btn-icon-sm"
          onClick={onClose}
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default FilterBar;