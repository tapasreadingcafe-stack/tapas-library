// src/components/MembershipBadge.js
import React from 'react';
import { getStatusText, calculateDaysLeft } from '../utils/membershipUtils';

function MembershipBadge({ member }) {
  if (!member) return null;

  const statusText = getStatusText(member);
  const color = member.status_color || 'normal';

  return (
    <div className={`membership-badge status-${color}`}>
      <div className="badge-status">{statusText}</div>
      {member.plan && (
        <div className="badge-plan">
          {member.plan.charAt(0).toUpperCase() + member.plan.slice(1)} Plan
        </div>
      )}
    </div>
  );
}

export default MembershipBadge;