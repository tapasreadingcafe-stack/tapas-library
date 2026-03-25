import React, { useState } from 'react';

function FilterBar({ onFilterChange, onClose }) {
  const [search, setSearch] = useState('');
  const [membershipCategory, setMembershipCategory] = useState('all');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const handleSearch = (value) => {
    setSearch(value);
    applyFilters({
      search: value,
      membershipCategory,
      sortBy: 'expiry_date',
      sortOrder: 'asc'
    });
  };

  const handleMembershipChange = (category) => {
    setMembershipCategory(category);
    applyFilters({
      search,
      membershipCategory: category,
      sortBy: 'expiry_date',
      sortOrder: 'asc'
    });
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
      {/* Main Filter Row */}
      <div className="filter-row-main">
        {/* Search Bar */}
        <input
          type="text"
          className="filter-search-input"
          placeholder="Search name, phone, email....."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />

        {/* Membership Category Buttons */}
        <div className="filter-category-buttons">
          <button
            className={`category-btn ${membershipCategory === 'all' ? 'active' : ''}`}
            onClick={() => handleMembershipChange('all')}
          >
            All
          </button>
          <button
            className={`category-btn ${membershipCategory === 'subscription' ? 'active' : ''}`}
            onClick={() => handleMembershipChange('subscription')}
          >
            Members
          </button>
          <button
            className={`category-btn ${membershipCategory === 'non_subscription' ? 'active' : ''}`}
            onClick={() => handleMembershipChange('non_subscription')}
          >
            Non-Members
          </button>
        </div>

        {/* More Filters Icon */}
        <button
          className={`btn-icon-sm more-filters-btn ${showMoreFilters ? 'active' : ''}`}
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          title="More Filters"
        >
          ⚙️
        </button>
      </div>

      {/* More Filters Section (Hidden by default) */}
      {showMoreFilters && (
        <div className="filter-row-expanded">
          <div className="filter-group-inline">
            <label className="filter-label-inline">Plan Status:</label>
            <input type="checkbox" id="active-plan" />
            <label htmlFor="active-plan" className="checkbox-label">Active</label>
            <input type="checkbox" id="expiring-plan" />
            <label htmlFor="expiring-plan" className="checkbox-label">Expiring Soon</label>
            <input type="checkbox" id="expired-plan" />
            <label htmlFor="expired-plan" className="checkbox-label">Expired</label>
          </div>

          <div className="filter-group-inline">
            <label className="filter-label-inline">Member Type:</label>
            <input type="checkbox" id="adult" />
            <label htmlFor="adult" className="checkbox-label">Adults (18+)</label>
            <input type="checkbox" id="minor" />
            <label htmlFor="minor" className="checkbox-label">Minors (&lt;18)</label>
          </div>

          <div className="filter-group-inline">
            <label className="filter-label-inline">Borrow Status:</label>
            <input type="checkbox" id="active-borrower" />
            <label htmlFor="active-borrower" className="checkbox-label">Active Borrowers</label>
            <input type="checkbox" id="no-borrow" />
            <label htmlFor="no-borrow" className="checkbox-label">No Books</label>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;