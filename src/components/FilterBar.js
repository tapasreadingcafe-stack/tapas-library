import React, { useState } from 'react';

function FilterBar({ onFilterChange, onClose }) {
  const [filters, setFilters] = useState({
    search: '',
    membershipStatus: ['active', 'expiring', 'expired', 'guest'],
    membershipPlan: ['day_pass', 'basic', 'premium', 'family', 'student', 'no_plan'],
    sortBy: 'expiry_date',
    sortOrder: 'asc'
  });
  const [expanded, setExpanded] = useState(false);

  const handleStatusChange = (status) => {
    const updated = [...filters.membershipStatus];
    const idx = updated.indexOf(status);
    if (idx > -1) {
      updated.splice(idx, 1);
    } else {
      updated.push(status);
    }
    setFilters({ ...filters, membershipStatus: updated });
  };

  const handlePlanChange = (plan) => {
    const updated = [...filters.membershipPlan];
    const idx = updated.indexOf(plan);
    if (idx > -1) {
      updated.splice(idx, 1);
    } else {
      updated.push(plan);
    }
    setFilters({ ...filters, membershipPlan: updated });
  };

  const handleApply = () => {
    onFilterChange(filters);
  };

  const handleClear = () => {
    const cleared = {
      search: '',
      membershipStatus: ['active', 'expiring', 'expired', 'guest'],
      membershipPlan: ['day_pass', 'basic', 'premium', 'family', 'student', 'no_plan'],
      sortBy: 'expiry_date',
      sortOrder: 'asc'
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  return (
    <div className="filter-bar-horizontal">
      <div className="filter-row-main">
        <input
          type="text"
          placeholder="Search name, phone, email..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="filter-search-input"
        />

        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          className="filter-select-small"
        >
          <option value="expiry_date">Sort: Expiry</option>
          <option value="name">Sort: Name</option>
          <option value="created_date">Sort: Created</option>
          <option value="plan">Sort: Plan</option>
        </select>

        <select
          value={filters.sortOrder}
          onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
          className="filter-select-small"
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>

        <button 
          className={`filter-toggle-btn ${expanded ? 'active' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          ⚙️ More Filters
        </button>

        <button className="btn btn-secondary btn-sm" onClick={handleClear}>
          Clear
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleApply}>
          Apply
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>
          Close
        </button>
      </div>

      {expanded && (
        <div className="filter-row-expanded">
          <div className="filter-group-inline">
            <label className="filter-label-inline">Status:</label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filters.membershipStatus.includes('active')}
                onChange={() => handleStatusChange('active')}
              />
              Active
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filters.membershipStatus.includes('expiring')}
                onChange={() => handleStatusChange('expiring')}
              />
              Expiring
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filters.membershipStatus.includes('expired')}
                onChange={() => handleStatusChange('expired')}
              />
              Expired
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filters.membershipStatus.includes('guest')}
                onChange={() => handleStatusChange('guest')}
              />
              Guest
            </label>
          </div>

          <div className="filter-group-inline">
            <label className="filter-label-inline">Plans:</label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filters.membershipPlan.includes('day_pass')}
                onChange={() => handlePlanChange('day_pass')}
              />
              Day Pass
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filters.membershipPlan.includes('basic')}
                onChange={() => handlePlanChange('basic')}
              />
              Basic
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filters.membershipPlan.includes('premium')}
                onChange={() => handlePlanChange('premium')}
              />
              Premium
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filters.membershipPlan.includes('family')}
                onChange={() => handlePlanChange('family')}
              />
              Family
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filters.membershipPlan.includes('student')}
                onChange={() => handlePlanChange('student')}
              />
              Student
            </label>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filters.membershipPlan.includes('no_plan')}
                onChange={() => handlePlanChange('no_plan')}
              />
              No Plan
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;