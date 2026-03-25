// src/components/MemberCard.js
import React from 'react';
import MembershipBadge from './MembershipBadge';
import { formatDate, formatCurrency, calculateDaysLeft } from '../utils/membershipUtils';

function MemberCard({ member, onEdit, onRenew, onDelete }) {
  const daysLeft = calculateDaysLeft(member.subscription_end);
  const isExpired = daysLeft < 0;

  return (
    <div className={`member-card status-${member.status_color || 'normal'}`}>
      <div className="member-card-header">
        <div className="member-info">
          <h3 className="member-name">{member.name}</h3>
          <p className="member-phone">{member.phone || 'No phone'}</p>
        </div>
        <div className="card-actions">
          <button className="btn btn-small btn-primary" onClick={() => onEdit(member)}>
            Edit
          </button>
          <button className="btn btn-small btn-delete" onClick={() => onDelete(member.id)}>
            Delete
          </button>
        </div>
      </div>

      <div className="membership-badge-wrapper">
        <MembershipBadge member={member} />
      </div>

      {member.subscription_end && (
        <div className="member-details">
          <div className="detail-row">
            <span className="label">Membership Period:</span>
            <span className="value">
              {formatDate(member.subscription_start)} → {formatDate(member.subscription_end)}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Duration:</span>
            <span className="value">{member.plan_duration_days} days</span>
          </div>
          <div className="detail-row">
            <span className="label">Borrow Limit:</span>
            <span className="value">{member.borrow_limit || 0} books</span>
          </div>
          <div className="detail-row">
            <span className="label">Discount:</span>
            <span className="value">{member.discount_percent || 0}% on sales</span>
          </div>
          {member.plan_price && (
            <div className="detail-row">
              <span className="label">Price Paid:</span>
              <span className="value">{formatCurrency(member.plan_price)}</span>
            </div>
          )}
        </div>
      )}

      <div className="member-actions">
        {isExpired ? (
          <>
            <button className="btn btn-primary" onClick={() => onRenew(member)}>
              Renew Membership
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" onClick={() => onRenew(member)}>
              Renew
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default MemberCard;