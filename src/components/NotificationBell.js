import React, { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '../utils/supabase';

const STORAGE_KEY = 'tapas_dismissed_notifications';

function getDismissedIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setDismissedIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIdsState] = useState(getDismissedIds);
  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const results = [];

    try {
      const { data: overdue } = await supabase
        .from('circulation')
        .select('id, due_date, members(name), books(title)')
        .eq('status', 'checked_out')
        .lt('due_date', today);

      if (overdue) {
        overdue.forEach((item) => {
          results.push({
            id: `overdue-${item.id}`,
            type: 'overdue',
            icon: '\uD83D\uDCD5',
            text: `"${item.books?.title}" borrowed by ${item.members?.name} is overdue (due ${item.due_date})`,
            timestamp: item.due_date,
          });
        });
      }
    } catch (e) {
      console.error('Failed to fetch overdue books:', e);
    }

    try {
      const { data: expiring } = await supabase
        .from('members')
        .select('id, name, subscription_end')
        .eq('status', 'active')
        .lt('subscription_end', sevenDays)
        .gt('subscription_end', today);

      if (expiring) {
        expiring.forEach((item) => {
          results.push({
            id: `expiring-${item.id}`,
            type: 'expiring',
            icon: '\uD83D\uDCB3',
            text: `${item.name}'s membership expires on ${item.subscription_end}`,
            timestamp: item.subscription_end,
          });
        });
      }
    } catch (e) {
      console.error('Failed to fetch expiring memberships:', e);
    }

    try {
      const { data: lowStock } = await supabase
        .from('books')
        .select('id, title, quantity_available')
        .lte('quantity_available', 2)
        .gt('quantity_available', 0);

      if (lowStock) {
        lowStock.forEach((item) => {
          results.push({
            id: `lowstock-${item.id}`,
            type: 'lowstock',
            icon: '\uD83D\uDCE6',
            text: `"${item.title}" has only ${item.quantity_available} cop${item.quantity_available === 1 ? 'y' : 'ies'} left`,
            timestamp: new Date().toISOString(),
          });
        });
      }
    } catch (e) {
      console.error('Failed to fetch low stock books:', e);
    }

    setNotifications(results);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeNotifications = notifications.filter(
    (n) => !dismissedIds.includes(n.id)
  );
  const count = activeNotifications.length;

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    const merged = [...new Set([...dismissedIds, ...allIds])];
    setDismissedIdsState(merged);
    setDismissedIds(merged);
  };

  const handleDismiss = (id) => {
    const merged = [...new Set([...dismissedIds, id])];
    setDismissedIdsState(merged);
    setDismissedIds(merged);
  };

  const grouped = {
    overdue: activeNotifications.filter((n) => n.type === 'overdue'),
    expiring: activeNotifications.filter((n) => n.type === 'expiring'),
    lowstock: activeNotifications.filter((n) => n.type === 'lowstock'),
  };

  const groupLabels = {
    overdue: { label: 'Overdue Books', color: '#e74c3c' },
    expiring: { label: 'Expiring Memberships', color: '#f39c12' },
    lowstock: { label: 'Low Stock', color: '#667eea' },
  };

  return (
    <div ref={bellRef} style={styles.container}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={styles.bellButton}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
      >
        <span style={styles.bellIcon}>{'\uD83D\uDD14'}</span>
        {count > 0 && (
          <span style={styles.badge}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <span style={styles.dropdownTitle}>Notifications</span>
            {count > 0 && (
              <button onClick={handleMarkAllRead} style={styles.markAllBtn}>
                Mark all read
              </button>
            )}
          </div>

          <div style={styles.dropdownBody}>
            {count === 0 ? (
              <div style={styles.emptyState}>
                <span style={{ fontSize: 32 }}>{'\u2705'}</span>
                <p style={{ margin: '8px 0 0', color: '#888' }}>
                  All caught up!
                </p>
              </div>
            ) : (
              Object.entries(grouped).map(
                ([type, items]) =>
                  items.length > 0 && (
                    <div key={type} style={styles.group}>
                      <div
                        style={{
                          ...styles.groupHeader,
                          borderLeftColor: groupLabels[type].color,
                        }}
                      >
                        <span style={styles.groupLabel}>
                          {groupLabels[type].label}
                        </span>
                        <span
                          style={{
                            ...styles.groupCount,
                            backgroundColor: groupLabels[type].color,
                          }}
                        >
                          {items.length}
                        </span>
                      </div>
                      {items.map((n) => (
                        <div key={n.id} style={styles.notifItem}>
                          <span style={styles.notifIcon}>{n.icon}</span>
                          <div style={styles.notifContent}>
                            <p style={styles.notifText}>{n.text}</p>
                            <span style={styles.notifTime}>
                              {formatTimeAgo(n.timestamp)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDismiss(n.id)}
                            style={styles.dismissBtn}
                            aria-label="Dismiss notification"
                          >
                            {'\u2715'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    display: 'inline-block',
  },
  bellButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    padding: '8px',
    borderRadius: '8px',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: '22px',
    lineHeight: 1,
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    lineHeight: 1,
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    width: '380px',
    maxWidth: 'calc(100vw - 32px)',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
    zIndex: 1000,
    overflow: 'hidden',
    border: '1px solid #e8e8e8',
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#fafafa',
  },
  dropdownTitle: {
    fontWeight: 700,
    fontSize: '15px',
    color: '#333',
  },
  markAllBtn: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  dropdownBody: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
  },
  group: {
    marginBottom: '4px',
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: '#f5f5f5',
    borderLeft: '3px solid',
  },
  groupLabel: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#555',
  },
  groupCount: {
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    minWidth: '20px',
    height: '20px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
  },
  notifItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    gap: '10px',
    transition: 'background 0.15s',
  },
  notifIcon: {
    fontSize: '20px',
    lineHeight: 1,
    flexShrink: 0,
    marginTop: '2px',
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
  },
  notifText: {
    margin: 0,
    fontSize: '13px',
    color: '#333',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  notifTime: {
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
    display: 'inline-block',
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#bbb',
    fontSize: '14px',
    padding: '2px 6px',
    borderRadius: '4px',
    flexShrink: 0,
    lineHeight: 1,
    transition: 'color 0.2s',
  },
};
