// Add these NEW functions at the top of the file:

export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const isMinor = (dateOfBirth) => {
  const age = calculateAge(dateOfBirth);
  return age !== null && age < 18;
};

export const generateCustomerID = (memberId, isMinor) => {
  if (!memberId) return '';
  // Take last 4 digits of UUID and convert to number
  const lastDigits = memberId.replace(/-/g, '').slice(-8);
  const numericId = parseInt(lastDigits, 16) % 10000;
  const paddedId = String(numericId).padStart(4, '0');
  
  return isMinor ? `MIN${paddedId}` : `CUST${paddedId}`;
};

export const getCustomerIDPrefix = (dateOfBirth) => {
  return isMinor(dateOfBirth) ? 'MIN' : 'CUST';
};
// src/utils/membershipUtils.js
// Membership utility functions for Tapas Library

// Default plan values
export const PLAN_DEFAULTS = {
  day_pass: {
    name: 'Day Pass',
    price: 50,
    duration_days: 1,
    borrow_limit: 2,
    discount_percent: 0
  },
  basic: {
    name: 'Basic',
    price: 100,
    duration_days: 30,
    borrow_limit: 3,
    discount_percent: 0
  },
  premium: {
    name: 'Premium',
    price: 300,
    duration_days: 30,
    borrow_limit: 10,
    discount_percent: 10
  },
  family: {
    name: 'Family',
    price: 500,
    duration_days: 90,
    borrow_limit: 20,
    discount_percent: 15
  },
  student: {
    name: 'Student',
    price: 150,
    duration_days: 30,
    borrow_limit: 5,
    discount_percent: 15
  },
  teen: {
    name: 'Teen',
    price: 200,
    duration_days: 30,
    borrow_limit: 8,
    discount_percent: 12
  }
};

// Calculate status color based on subscription dates
export function calculateStatusColor(member) {
  // Guest or inactive
  if (member.membership_type === 'guest' || member.membership_type === 'inactive_member') {
    return 'normal';
  }

  // No subscription end date
  if (!member.subscription_end) {
    return 'normal';
  }

  const today = new Date();
  const expiryDate = new Date(member.subscription_end);
  const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    // Expired
    return 'red';
  } else if (daysLeft < 7) {
    // Expiring soon
    return 'orange';
  } else {
    // Active
    return 'gold';
  }
}

// Calculate days left in membership
export function calculateDaysLeft(subscriptionEnd) {
  if (!subscriptionEnd) return null;
  
  const today = new Date();
  const expiryDate = new Date(subscriptionEnd);
  const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
  
  return daysLeft;
}

// Get status text based on days left
export function getStatusText(member) {
  const color = calculateStatusColor(member);
  const daysLeft = calculateDaysLeft(member.subscription_end);

  switch (color) {
    case 'gold':
      return `🟡 ACTIVE (${daysLeft} days left)`;
    case 'orange':
      return `🟠 EXPIRING SOON (${daysLeft} days left)`;
    case 'red':
      if (daysLeft < 0) {
        return `🔴 EXPIRED (${Math.abs(daysLeft)} days ago)`;
      }
      return '🔴 EXPIRED';
    default:
      return '⚪ GUEST';
  }
}

// Check if member can borrow
export function canBorrow(member) {
  if (!member) return false;
  if (member.membership_type !== 'active_member') return false;
  
  const color = calculateStatusColor(member);
  if (color === 'red') return false; // Expired
  
  return true;
}

// Check if member is active
export function isActiveMember(member) {
  if (!member.membership_type === 'active_member') return false;
  if (!member.subscription_end) return false;
  
  const daysLeft = calculateDaysLeft(member.subscription_end);
  return daysLeft >= 0;
}

// Calculate subscription end date from start date and duration
export function calculateEndDate(startDate, durationDays) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  return end.toISOString().split('T')[0]; // Return as YYYY-MM-DD
}

// Create membership object
export function createMembership(plan, customValues = {}) {
  const defaults = PLAN_DEFAULTS[plan];
  
  if (!defaults) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const today = new Date().toISOString().split('T')[0];
  const durationDays = customValues.duration_days || defaults.duration_days;
  const endDate = calculateEndDate(today, durationDays);

  return {
    plan,
    membership_type: 'active_member',
    plan_price: customValues.price || defaults.price,
    plan_duration_days: durationDays,
    borrow_limit: customValues.borrow_limit || defaults.borrow_limit,
    discount_percent: customValues.discount_percent ?? defaults.discount_percent,
    subscription_start: today,
    subscription_end: endDate,
    status_color: 'gold',
    is_active: true
  };
}

// Renew membership
export function renewMembership(member, customValues = {}) {
  const defaults = PLAN_DEFAULTS[member.plan];
  
  if (!defaults) {
    throw new Error(`Invalid plan: ${member.plan}`);
  }

  const today = new Date().toISOString().split('T')[0];
  const durationDays = customValues.duration_days || member.plan_duration_days || defaults.duration_days;
  const endDate = calculateEndDate(today, durationDays);

  return {
    plan: member.plan,
    membership_type: 'active_member',
    plan_price: customValues.price || member.plan_price || defaults.price,
    plan_duration_days: durationDays,
    borrow_limit: customValues.borrow_limit || member.borrow_limit || defaults.borrow_limit,
    discount_percent: customValues.discount_percent ?? (member.discount_percent || defaults.discount_percent),
    subscription_start: today,
    subscription_end: endDate,
    status_color: 'gold',
    is_active: true
  };
}

// Apply POS discount
export function applyDiscount(amount, discountPercent) {
  if (!discountPercent || discountPercent === 0) return amount;
  
  const discount = (amount * discountPercent) / 100;
  return {
    originalAmount: amount,
    discountPercent: discountPercent,
    discountAmount: discount,
    finalAmount: amount - discount
  };
}

// Filter members by status
export function filterMembersByStatus(members, statuses) {
  return members.filter(member => {
    const color = calculateStatusColor(member);
    const daysLeft = calculateDaysLeft(member.subscription_end);

    // Map colors to status names
    let memberStatus;
    if (color === 'gold') memberStatus = 'active';
    else if (color === 'orange') memberStatus = 'expiring';
    else if (color === 'red') memberStatus = 'expired';
    else memberStatus = 'guest';

    return statuses.includes(memberStatus);
  });
}

// Filter members by plan
export function filterMembersByPlan(members, plans) {
  return members.filter(member => {
    if (!member.plan) return plans.includes('no_plan');
    return plans.includes(member.plan);
  });
}

// Filter members by search
export function filterMembersBySearch(members, searchText) {
  if (!searchText) return members;
  
  const text = searchText.toLowerCase();
  return members.filter(member => {
    return (
      member.name?.toLowerCase().includes(text) ||
      member.phone?.includes(text) ||
      member.email?.toLowerCase().includes(text)
    );
  });
}

// Sort members
export function sortMembers(members, sortBy, sortOrder = 'asc') {
  const sorted = [...members];
  
  sorted.sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'expiry_date':
        aVal = new Date(a.subscription_end || new Date(9999, 11, 31));
        bVal = new Date(b.subscription_end || new Date(9999, 11, 31));
        break;
      case 'name':
        aVal = a.name?.toLowerCase() || '';
        bVal = b.name?.toLowerCase() || '';
        break;
      case 'created_date':
        aVal = new Date(a.created_at);
        bVal = new Date(b.created_at);
        break;
      case 'plan':
        aVal = a.plan || 'z';
        bVal = b.plan || 'z';
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

// Format currency
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
}

// Format date
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Get all available plans
export function getAvailablePlans() {
  return Object.keys(PLAN_DEFAULTS).map(key => ({
    id: key,
    ...PLAN_DEFAULTS[key]
  }));
}