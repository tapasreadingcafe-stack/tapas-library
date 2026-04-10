import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { calculateAge, isMinor, generateCustomerID, formatCurrency, formatDate, calculateStatusColor, PLAN_DEFAULTS } from '../utils/membershipUtils';
import { useConfirm } from '../components/ConfirmModal';

const TIERS = {
  basic:  { name: 'Basic',  icon: '🥉', borrow_limit: 2,  loan_days: 7,  color: '#95a5a6', bg: '#f4f4f4' },
  silver: { name: 'Silver', icon: '🥈', borrow_limit: 4,  loan_days: 14, color: '#7f8c8d', bg: '#ecf0f1' },
  gold:   { name: 'Gold',   icon: '🥇', borrow_limit: 6,  loan_days: 21, color: '#f39c12', bg: '#fefdf0' },
};

const CHILD_COLORS = ['#3498db', '#27ae60', '#9b59b6', '#f39c12', '#e91e63'];

const RELATIONSHIPS = ['Son', 'Daughter', 'Other'];

function ChildAvatar({ child, color, size = 44 }) {
  const initials = (child.name || '?')[0].toUpperCase();
  if (child.avatar_url) {
    return (
      <img
        src={child.avatar_url}
        alt={child.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}`, flexShrink: 0 }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '800', fontSize: size * 0.4, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

const EMPTY_CHILD_FORM = { name: '', date_of_birth: '', relationship: 'Son', avatar_url: '' };

export default function MemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [member, setMember] = useState(null);
  const [membershipHistory, setMembershipHistory] = useState([]);
  const [borrowingHistory, borrowingHistoryData] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgradingTier, setUpgradingTier] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = React.useRef();

  // Family state
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyTableExists, setFamilyTableExists] = useState(null);
  const [hasChildIdCol, setHasChildIdCol] = useState(false);
  const [childCirculation, setChildCirculation] = useState({}); // childId -> circulation rows
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChild, setEditingChild] = useState(null); // child being edited
  const [childForm, setChildForm] = useState(EMPTY_CHILD_FORM);
  const [savingChild, setSavingChild] = useState(false);
  const [familyLoading, setFamilyLoading] = useState(false);

  useEffect(() => {
    fetchMemberProfile();
  }, [memberId]);

  const fetchMemberProfile = async () => {
    setLoading(true);
    try {
      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      setMember(memberData);

      const { data: circulationData } = await supabase
        .from('circulation')
        .select('*, books(title, author, isbn, category)')
        .eq('member_id', memberId)
        .order('checkout_date', { ascending: false });

      borrowingHistoryData(circulationData || []);

      const { data: salesData } = await supabase
        .from('sales')
        .select('*, sale_items(*, products(name, category))')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      setPurchaseHistory(salesData || []);

      if (memberData) {
        const history = [];
        history.push({ date: memberData.created_at, event: 'Account Created', details: 'Member joined', type: 'signup' });
        if (memberData.plan && memberData.subscription_start) {
          history.push({ date: memberData.subscription_start, event: 'Plan Activated', details: `${memberData.plan} plan started`, type: 'plan_start' });
        }
        if (memberData.subscription_end) {
          history.push({ date: memberData.subscription_end, event: 'Plan Expiry', details: `${memberData.plan} plan expires`, type: 'plan_end' });
        }
        history.sort((a, b) => new Date(b.date) - new Date(a.date));
        setMembershipHistory(history);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }

    // Fetch family data after main profile
    fetchFamilyData();
  };

  const fetchFamilyData = async () => {
    setFamilyLoading(true);
    try {
      // Probe family_members table
      const { error: tableErr } = await supabase.from('family_members').select('id').limit(0);
      if (tableErr) {
        setFamilyTableExists(false);
        setFamilyLoading(false);
        return;
      }
      setFamilyTableExists(true);

      // Probe child_id column in circulation
      const { error: colErr } = await supabase.from('circulation').select('child_id').limit(0);
      setHasChildIdCol(!colErr);

      // Fetch family members
      const { data: fm } = await supabase
        .from('family_members')
        .select('*')
        .eq('parent_member_id', memberId)
        .order('created_at');

      setFamilyMembers(fm || []);

      // Fetch circulation per child (if column exists)
      if (!colErr && fm && fm.length > 0) {
        const childIds = fm.map(c => c.id);
        const { data: cc } = await supabase
          .from('circulation')
          .select('*, books(title)')
          .in('child_id', childIds);

        const map = {};
        (cc || []).forEach(row => {
          if (!map[row.child_id]) map[row.child_id] = [];
          map[row.child_id].push(row);
        });
        setChildCirculation(map);
      }
    } catch (err) {
      console.error('Family fetch error:', err);
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleTierUpgrade = async (tierKey) => {
    if (!await confirm({ title: 'Upgrade Membership', message: `Upgrade membership to ${TIERS[tierKey].name} tier?`, variant: 'warning' })) return;
    setUpgradingTier(true);
    try {
      const tier = TIERS[tierKey];
      const { error } = await supabase
        .from('members')
        .update({ borrow_limit: tier.borrow_limit, membership_tier: tierKey })
        .eq('id', memberId);
      if (error) {
        const { error: e2 } = await supabase
          .from('members')
          .update({ borrow_limit: tier.borrow_limit })
          .eq('id', memberId);
        if (e2) throw e2;
      }
      alert(`Tier updated to ${tier.name}! Borrow limit: ${tier.borrow_limit} books.`);
      fetchMemberProfile();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUpgradingTier(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        // Resize to 200x200 for storage efficiency
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const scale = Math.max(size / img.width, size / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const { error } = await supabase
            .from('members')
            .update({ profile_photo: dataUrl })
            .eq('id', memberId);
          if (error) {
            // Column might not exist yet — try adding it
            alert('To enable photos, add a profile_photo TEXT column to members table, or the update was blocked by RLS.');
          } else {
            setMember(prev => ({ ...prev, profile_photo: dataUrl }));
          }
          setUploadingPhoto(false);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Upload failed: ' + err.message);
      setUploadingPhoto(false);
    }
  };

  const openAddChild = () => {
    setEditingChild(null);
    setChildForm(EMPTY_CHILD_FORM);
    setShowAddChild(true);
  };

  const openEditChild = (child) => {
    setEditingChild(child);
    setChildForm({
      name: child.name || '',
      date_of_birth: child.date_of_birth || '',
      relationship: child.relationship || 'Son',
      avatar_url: child.avatar_url || '',
    });
    setShowAddChild(true);
  };

  const saveChild = async () => {
    if (!childForm.name.trim()) { alert('Please enter the child\'s name'); return; }
    setSavingChild(true);
    try {
      const age = childForm.date_of_birth
        ? Math.floor((new Date() - new Date(childForm.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

      const payload = {
        parent_member_id: memberId,
        name: childForm.name.trim(),
        date_of_birth: childForm.date_of_birth || null,
        age,
        relationship: childForm.relationship,
        avatar_url: childForm.avatar_url.trim() || null,
      };

      if (editingChild) {
        const { error } = await supabase.from('family_members').update(payload).eq('id', editingChild.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('family_members').insert(payload);
        if (error) throw error;
      }

      setShowAddChild(false);
      setChildForm(EMPTY_CHILD_FORM);
      setEditingChild(null);
      fetchFamilyData();
    } catch (err) {
      alert('Error saving child profile: ' + err.message);
    } finally {
      setSavingChild(false);
    }
  };

  const removeChild = async (child) => {
    if (!await confirm({ title: 'Remove Child', message: `Remove ${child.name} from this family account?`, variant: 'danger' })) return;
    try {
      const { error } = await supabase.from('family_members').delete().eq('id', child.id);
      if (error) throw error;
      fetchFamilyData();
    } catch (err) {
      alert('Error removing child: ' + err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading profile...</div>;
  }

  if (!member) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Member not found</div>;
  }

  const age = calculateAge(member.date_of_birth);
  const customerId = generateCustomerID(member);
  const statusColor = calculateStatusColor(member);

  const returned = borrowingHistory.filter(b => b.status === 'returned');
  const genreMap = {};
  returned.forEach(b => {
    const cat = b.books?.category;
    if (cat) genreMap[cat] = (genreMap[cat] || 0) + 1;
  });
  const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const readMonths = new Set(borrowingHistory.map(b => b.checkout_date?.slice(0, 7)).filter(Boolean));
  let streak = 0;
  const now = new Date();
  let m = new Date(now.getFullYear(), now.getMonth(), 1);
  while (readMonths.has(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`)) {
    streak++;
    m.setMonth(m.getMonth() - 1);
  }

  const bLimit = member.borrow_limit || 0;
  const currentTierKey = bLimit <= 2 ? 'basic' : bLimit <= 4 ? 'silver' : 'gold';
  const currentTier = TIERS[currentTierKey];

  // Family summary stats
  const familyTotalOut = Object.values(childCirculation).flat().filter(c => c.status === 'checked_out').length;
  const familyOverdue = Object.values(childCirculation).flat().filter(c => c.status === 'checked_out' && new Date(c.due_date) < new Date()).length;

  // Computed age for child form preview
  const childFormAge = childForm.date_of_birth
    ? Math.floor((new Date() - new Date(childForm.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const headerBorderColor = statusColor === 'gold' ? '#ffc107' : statusColor === 'orange' ? '#ff9800' : statusColor === 'red' ? '#f44336' : '#9e9e9e';

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/members')}
        style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px', fontSize: '14px' }}
      >
        ← Back to Members
      </button>

      {/* Member Header Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: `5px solid ${headerBorderColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
            {/* Profile Photo */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {member.profile_photo ? (
                <img src={member.profile_photo} alt={member.name}
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${headerBorderColor}` }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${headerBorderColor}, #667eea)`,
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '800', fontSize: '28px',
                }}>
                  {(member.name || '?')[0].toUpperCase()}
                </div>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                style={{
                  position: 'absolute', bottom: '-2px', right: '-2px',
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: '#667eea', color: 'white', border: '2px solid white',
                  cursor: 'pointer', fontSize: '12px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
                title="Upload photo"
              >
                {uploadingPhoto ? '...' : '📷'}
              </button>
            </div>
            <div>
            <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>{member.name}</h1>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '16px' }}><strong>Customer ID:</strong> {customerId}</p>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '16px' }}><strong>Age:</strong> {age} years old {isMinor(member.date_of_birth) ? '(Minor)' : '(Adult)'}</p>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '16px' }}><strong>Phone:</strong> {member.phone}</p>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '16px' }}><strong>Email:</strong> {member.email}</p>

            {/* Family mini widget */}
            {familyMembers.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f0f4ff', borderRadius: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#667eea' }}>👨‍👩‍👧 Family:</span>
                {familyMembers.map((child, idx) => (
                  <div key={child.id} onClick={() => navigate(`/member/${memberId}/child/${child.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '3px 8px', background: 'white', borderRadius: '12px', border: `1px solid ${CHILD_COLORS[idx % CHILD_COLORS.length]}` }}>
                    <ChildAvatar child={child} color={CHILD_COLORS[idx % CHILD_COLORS.length]} size={20} />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>{child.name}</span>
                  </div>
                ))}
                {hasChildIdCol && familyTotalOut > 0 && (
                  <span style={{ fontSize: '12px', color: '#666' }}>· {familyTotalOut} book{familyTotalOut !== 1 ? 's' : ''} out</span>
                )}
                {hasChildIdCol && familyOverdue > 0 && (
                  <span style={{ fontSize: '12px', color: '#e74c3c', fontWeight: '700' }}>· ⚠️ {familyOverdue} overdue</span>
                )}
              </div>
            )}
          </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Current Plan</p>
            <h2 style={{ margin: '0 0 10px 0', color: '#667eea', textTransform: 'capitalize' }}>{member.plan || 'No Plan'}</h2>
            <p style={{
              padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', margin: '0',
              background: statusColor === 'gold' ? '#fff3cd' : statusColor === 'orange' ? '#fff9e6' : statusColor === 'red' ? '#ffebee' : '#f0f0f0',
              color: statusColor === 'gold' ? '#856404' : statusColor === 'orange' ? '#856404' : statusColor === 'red' ? '#c62828' : '#666',
            }}>
              {statusColor === 'gold' ? '🟡 Active' : statusColor === 'orange' ? '🟠 Expiring Soon' : statusColor === 'red' ? '🔴 Expired' : '⚪ Guest'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: '14px' }}>Total Books Borrowed</p>
          <h2 style={{ margin: '0', color: '#667eea', fontSize: '32px' }}>{borrowingHistory.length}</h2>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: '14px' }}>Total Purchases</p>
          <h2 style={{ margin: '0', color: '#667eea', fontSize: '32px' }}>{purchaseHistory.length}</h2>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: '14px' }}>Total Spent</p>
          <h2 style={{ margin: '0', color: '#667eea', fontSize: '32px' }}>
            {formatCurrency(purchaseHistory.reduce((sum, sale) => sum + (sale.final_total || 0), 0))}
          </h2>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FAMILY MEMBERS SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #667eea', paddingBottom: '12px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0', color: '#333' }}>👨‍👩‍👧‍👦 Family Members</h2>
          {familyTableExists && (
            <button
              onClick={openAddChild}
              style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
            >
              + Add Family Member
            </button>
          )}
        </div>

        {/* Table not set up yet */}
        {familyTableExists === false && (
          <div style={{ background: '#fff9e6', border: '1px solid #ffc107', borderRadius: '8px', padding: '16px 20px' }}>
            <div style={{ fontWeight: '700', marginBottom: '8px', color: '#856404' }}>⚠️ Setup Required</div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
              Run this SQL in your Supabase Dashboard (SQL Editor) to enable family profiles:
            </div>
            <pre style={{ background: '#f5f5f5', borderRadius: '6px', padding: '12px', fontSize: '12px', overflowX: 'auto', margin: '0 0 10px 0', color: '#333' }}>{`CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_member_id UUID NOT NULL,
  name TEXT NOT NULL,
  date_of_birth DATE,
  age INTEGER,
  avatar_url TEXT,
  relationship TEXT DEFAULT 'Son',
  created_at TIMESTAMPTZ DEFAULT now()
);`}</pre>
            <div style={{ fontSize: '13px', color: '#856404', marginBottom: '8px' }}>
              Also run this to enable tracking books borrowed on behalf of children:
            </div>
            <pre style={{ background: '#f5f5f5', borderRadius: '6px', padding: '12px', fontSize: '12px', margin: '0', color: '#333' }}>{`ALTER TABLE circulation ADD COLUMN IF NOT EXISTS child_id UUID;`}</pre>
            <button
              onClick={fetchFamilyData}
              style={{ marginTop: '12px', padding: '7px 16px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
            >
              🔄 Check Again
            </button>
          </div>
        )}

        {familyTableExists === null && familyLoading && (
          <div style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>Loading family data...</div>
        )}

        {familyTableExists && (
          <>
            {/* child_id column setup notice */}
            {!hasChildIdCol && (
              <div style={{ background: '#fff9e6', border: '1px solid #ffc107', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#856404' }}>
                💡 Run <code style={{ background: '#f5f5f5', padding: '1px 5px', borderRadius: '3px' }}>ALTER TABLE circulation ADD COLUMN IF NOT EXISTS child_id UUID;</code> to track books borrowed per child.
              </div>
            )}

            {familyMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#bbb' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>👨‍👩‍👧</div>
                <div style={{ fontSize: '14px' }}>No family members added yet.</div>
                <button onClick={openAddChild} style={{ marginTop: '14px', padding: '8px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  + Add First Child
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                {familyMembers.map((child, idx) => {
                  const color = CHILD_COLORS[idx % CHILD_COLORS.length];
                  const childAge = child.date_of_birth ? calculateAge(child.date_of_birth) : child.age;
                  const childBorrows = (childCirculation[child.id] || []).filter(c => c.status === 'checked_out');
                  const childRead = (childCirculation[child.id] || []).filter(c => c.status === 'returned').length;
                  const childOverdue = childBorrows.filter(c => new Date(c.due_date) < new Date()).length;

                  return (
                    <div key={child.id} style={{
                      border: `2px solid ${color}`,
                      borderRadius: '12px', padding: '18px', background: `${color}08`,
                      display: 'flex', flexDirection: 'column', gap: '10px',
                    }}>
                      {/* Child header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ChildAvatar child={child} color={color} size={48} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '16px', color: '#222' }}>{child.name}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {childAge ? `Age ${childAge}` : ''}
                            {childAge && child.relationship ? ' · ' : ''}
                            {child.relationship || ''}
                          </div>
                        </div>
                      </div>

                      {/* Stats pills */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {hasChildIdCol && (
                          <>
                            <span style={{ background: color + '20', color, padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>
                              📚 {childBorrows.length} out
                            </span>
                            <span style={{ background: '#27ae6020', color: '#27ae60', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>
                              ✅ {childRead} read
                            </span>
                            {childOverdue > 0 && (
                              <span style={{ background: '#f8d7da', color: '#721c24', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}>
                                ⚠️ {childOverdue} overdue
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Currently borrowed books */}
                      {hasChildIdCol && childBorrows.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#555' }}>
                          {childBorrows.slice(0, 2).map(b => (
                            <div key={b.id} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                              📖 {b.books?.title}
                            </div>
                          ))}
                          {childBorrows.length > 2 && <div style={{ color: '#aaa' }}>+{childBorrows.length - 2} more</div>}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button
                          onClick={() => navigate(`/member/${memberId}/child/${child.id}`)}
                          style={{ flex: 1, padding: '7px', background: color, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => openEditChild(child)}
                          style={{ padding: '7px 12px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => removeChild(child)}
                          style={{ padding: '7px 12px', background: '#fff0f0', color: '#e74c3c', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Reading Analytics Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #667eea', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0', color: '#333' }}>📖 Reading Analytics</h2>
          <button onClick={() => window.print()} style={{ padding: '6px 14px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
            🖨️ Export / Print
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Books Read', value: returned.length, color: '#27ae60', icon: '✅' },
            { label: 'Currently Borrowed', value: borrowingHistory.filter(b => b.status === 'checked_out').length, color: '#3498db', icon: '📚' },
            { label: 'Reading Streak', value: `${streak} mo.`, color: '#f39c12', icon: '🔥' },
            { label: 'Genres Explored', value: Object.keys(genreMap).length, color: '#9b59b6', icon: '🗂️' },
          ].map(s => (
            <div key={s.label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '14px', textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '20px' }}>{s.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: s.color, marginTop: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
        {topGenres.length > 0 && (
          <div>
            <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>🎭 Favourite Genres</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {topGenres.map(([genre, count], idx) => (
                <div key={genre} style={{
                  background: idx === 0 ? '#f0f4ff' : '#f8f9fa',
                  border: `1px solid ${idx === 0 ? '#c7d2fe' : '#eee'}`,
                  borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: idx === 0 ? '700' : '500'
                }}>
                  {idx === 0 ? '⭐ ' : ''}{genre} <span style={{ color: '#999', fontSize: '11px' }}>({count})</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {returned.length === 0 && (
          <p style={{ color: '#999', textAlign: 'center', padding: '10px' }}>No reading history yet.</p>
        )}
      </div>

      {/* Membership Tier Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>🏅 Membership Tier</h2>
        <div style={{ marginBottom: '16px', padding: '14px', background: currentTier.bg, border: `2px solid ${currentTier.color}`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '32px' }}>{currentTier.icon}</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '18px', color: currentTier.color }}>{currentTier.name} Tier</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '3px' }}>
              Borrow limit: {currentTier.borrow_limit} books · Loan duration: {currentTier.loan_days} days
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#666' }}>
            Current borrow limit: <strong>{member.borrow_limit || '—'}</strong>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {Object.entries(TIERS).map(([key, tier]) => {
            const isCurrentTier = key === currentTierKey;
            return (
              <div key={key} style={{ border: `2px solid ${isCurrentTier ? tier.color : '#eee'}`, borderRadius: '8px', padding: '16px', textAlign: 'center', background: isCurrentTier ? tier.bg : 'white', opacity: isCurrentTier ? 1 : 0.8 }}>
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>{tier.icon}</div>
                <div style={{ fontWeight: '700', color: tier.color }}>{tier.name}</div>
                <div style={{ fontSize: '12px', color: '#666', margin: '6px 0' }}>{tier.borrow_limit} books · {tier.loan_days} days</div>
                {isCurrentTier ? (
                  <span style={{ background: tier.color, color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>Current</span>
                ) : (
                  <button onClick={() => handleTierUpgrade(key)} disabled={upgradingTier}
                    style={{ padding: '5px 14px', background: tier.color, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                    {upgradingTier ? '...' : key === 'gold' ? '⬆️ Upgrade' : '⬇️ Downgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Membership History Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>📅 Membership History</h2>
        {membershipHistory.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No membership history</p>
        ) : (
          <div>
            {membershipHistory.map((item, idx) => (
              <div key={idx} style={{ padding: '15px', borderLeft: '3px solid #667eea', marginBottom: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>{item.event}</p>
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>{item.details}</p>
                  </div>
                  <p style={{ margin: '0', color: '#999', fontSize: '14px', minWidth: '120px', textAlign: 'right' }}>{formatDate(item.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Borrowing History Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>📚 Borrowing History ({borrowingHistory.length})</h2>
        {borrowingHistory.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No books borrowed</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Book Title</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Author</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Checkout</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Due Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {borrowingHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px' }}>{item.books?.title}</td>
                    <td style={{ padding: '12px' }}>{item.books?.author || '-'}</td>
                    <td style={{ padding: '12px' }}>{formatDate(item.checkout_date)}</td>
                    <td style={{ padding: '12px' }}>{formatDate(item.due_date)}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: item.status === 'returned' ? '#d4edda' : '#fff3cd', color: item.status === 'returned' ? '#155724' : '#856404' }}>
                        {item.status === 'returned' ? '✓ Returned' : '📖 Checked Out'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase History Card */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>🛒 Purchase History ({purchaseHistory.length})</h2>
        {purchaseHistory.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No purchases</p>
        ) : (
          <div>
            {purchaseHistory.map((sale) => (
              <div key={sale.id} style={{ padding: '15px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#333' }}>
                    {sale.sale_items?.map(item => item.products?.name).join(', ') || 'Items'}
                  </p>
                  <p style={{ margin: '0', color: '#999', fontSize: '14px' }}>
                    Payment: {sale.payment_method?.toUpperCase()} | {formatDate(sale.created_at)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontWeight: 'bold', color: '#667eea', fontSize: '16px' }}>{formatCurrency(sale.final_total)}</p>
                  {sale.discount_amount > 0 && (
                    <p style={{ margin: '5px 0 0 0', color: '#4caf50', fontSize: '12px' }}>Discount: {formatCurrency(sale.discount_amount)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ADD / EDIT CHILD MODAL */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showAddChild && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}
          onClick={() => setShowAddChild(false)}
        >
          <div
            style={{ background: 'white', borderRadius: '14px', padding: '30px', maxWidth: '440px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#333' }}>
              {editingChild ? '✏️ Edit Child Profile' : '👶 Add Family Member'}
            </h2>

            {/* Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>CHILD'S FULL NAME *</label>
              <input
                value={childForm.name}
                onChange={e => setChildForm({ ...childForm, name: e.target.value })}
                placeholder="e.g. Arjun Sharma"
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {/* Date of birth */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>DATE OF BIRTH</label>
              <input
                type="date"
                value={childForm.date_of_birth}
                onChange={e => setChildForm({ ...childForm, date_of_birth: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
              {childFormAge !== null && childFormAge >= 0 && (
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#667eea' }}>
                  Age: <strong>{childFormAge} years old</strong>
                </div>
              )}
            </div>

            {/* Relationship */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>RELATIONSHIP</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {RELATIONSHIPS.map(r => (
                  <button key={r} onClick={() => setChildForm({ ...childForm, relationship: r })} style={{
                    flex: 1, padding: '9px', border: '2px solid', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    borderColor: childForm.relationship === r ? '#667eea' : '#e0e0e0',
                    background: childForm.relationship === r ? '#667eea' : 'white',
                    color: childForm.relationship === r ? 'white' : '#555',
                  }}>
                    {r === 'Son' ? '👦' : r === 'Daughter' ? '👧' : '🧒'} {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar URL (optional) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '6px', letterSpacing: '0.5px' }}>PHOTO URL (optional)</label>
              <input
                value={childForm.avatar_url}
                onChange={e => setChildForm({ ...childForm, avatar_url: e.target.value })}
                placeholder="https://... (leave blank for initials avatar)"
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddChild(false)} style={{ flex: 1, padding: '11px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
                Cancel
              </button>
              <button onClick={saveChild} disabled={savingChild} style={{ flex: 1, padding: '11px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                {savingChild ? 'Saving...' : editingChild ? '✓ Save Changes' : '✓ Add to Family'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
