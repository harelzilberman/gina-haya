import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;

interface WaitlistSignup {
  id: string;
  email: string;
  source: string;
  locale: string;
  product_id: string | null;
  product_name: string | null;
  notes: string | null;
  category: string | null;
  created_at: string;
}

interface ProductGroup {
  product_name: string;
  count: number;
  signups: WaitlistSignup[];
}

function groupByProduct(signups: WaitlistSignup[]): ProductGroup[] {
  const map = new Map<string, WaitlistSignup[]>();
  for (const s of signups) {
    const key = s.product_name ?? '(ללא מוצר)';
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .map(([product_name, sigs]) => ({ product_name, count: sigs.length, signups: sigs }))
    .sort((a, b) => b.count - a.count);
}

export function AdminWaitlistPage() {
  const { user, session } = useAuthStore();
  const token = session?.access_token;

  const [signups, setSignups] = useState<WaitlistSignup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count');

  const isAdmin = ADMIN_EMAIL && user?.email === ADMIN_EMAIL;

  async function loadSignups() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<WaitlistSignup[]>('/api/admin/waitlist', token);
      setSignups(data);
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) loadSignups();
  }, [isAdmin, token]);

  function toggleGroup(name: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (!user) {
    return <div style={styles.page}><p>יש להתחבר תחילה.</p></div>;
  }
  if (!isAdmin) {
    return <div style={styles.page}><p style={{ color: '#c00' }}>אין הרשאת גישה לעמוד זה.</p></div>;
  }

  const filteredSignups = filterCategory
    ? signups.filter(s => (s.category ?? '').toLowerCase().includes(filterCategory.toLowerCase()))
    : signups;

  const groups = groupByProduct(filteredSignups);
  const sorted = sortBy === 'count'
    ? groups
    : [...groups].sort((a, b) => a.product_name.localeCompare(b.product_name, 'he'));

  const totalCount = filteredSignups.length;

  return (
    <div style={styles.page} dir="rtl">
      <h1 style={styles.h1}>רשימות המתנה</h1>

      {/* Summary bar */}
      <div style={styles.summaryBar}>
        <span style={styles.summaryItem}>
          סה"כ נרשמו: <strong>{totalCount}</strong>
        </span>
        <span style={styles.summaryItem}>
          מוצרים: <strong>{groups.length}</strong>
        </span>
        <button style={{ ...styles.btn, marginRight: 'auto' }} onClick={loadSignups} disabled={loading}>
          {loading ? 'טוען...' : 'רענן'}
        </button>
      </div>

      {error && <p style={{ color: '#c00', marginBottom: 16 }}>{error}</p>}

      {/* Filters */}
      <div style={styles.filtersRow}>
        <div>
          <label style={styles.filterLabel}>סינון לפי קטגוריה</label>
          <input
            style={styles.filterInput}
            type="text"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            placeholder="wood / biodynamic / ..."
          />
        </div>
        <div>
          <label style={styles.filterLabel}>מיון</label>
          <select
            style={styles.filterInput}
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'count' | 'name')}
          >
            <option value="count">לפי מספר נרשמים (יורד)</option>
            <option value="name">לפי שם מוצר (א-ב)</option>
          </select>
        </div>
      </div>

      {/* Groups */}
      {loading ? (
        <p style={{ color: '#888' }}>טוען...</p>
      ) : sorted.length === 0 ? (
        <p style={{ color: '#888' }}>אין נרשמים עדיין.</p>
      ) : (
        sorted.map(group => {
          const isOpen = expandedGroups.has(group.product_name);
          return (
            <div key={group.product_name} style={styles.groupCard}>
              <button
                style={styles.groupHeader}
                onClick={() => toggleGroup(group.product_name)}
              >
                <span style={styles.groupName}>{group.product_name}</span>
                <span style={styles.groupCount}>{group.count} נרשמים</span>
                <span style={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div style={styles.signupTable}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={styles.th}>אימייל</th>
                        <th style={styles.th}>הערות</th>
                        <th style={styles.th}>קטגוריה</th>
                        <th style={styles.th}>תאריך</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.signups.map(s => (
                        <tr key={s.id}>
                          <td style={styles.td}>{s.email}</td>
                          <td style={{ ...styles.td, ...styles.notesCell }}>
                            {s.notes ? (
                              <span title={s.notes}>
                                {s.notes.length > 60 ? s.notes.slice(0, 60) + '…' : s.notes}
                              </span>
                            ) : (
                              <span style={{ color: '#bbb' }}>—</span>
                            )}
                          </td>
                          <td style={styles.td}>{s.category ?? '—'}</td>
                          <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                            {new Date(s.created_at).toLocaleDateString('he-IL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: '"Assistant", "Heebo", sans-serif',
  },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 20 },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    background: '#f5f5f5',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  summaryItem: { fontSize: 14, color: '#333' },
  btn: {
    background: '#1a7a40',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '7px 18px',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 600,
  },
  filtersRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  filterLabel: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 },
  filterInput: {
    padding: '7px 10px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 13,
    minWidth: 180,
  },
  groupCard: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'none',
    border: 'none',
    padding: '14px 16px',
    cursor: 'pointer',
    textAlign: 'right',
    fontSize: 14,
  },
  groupName: { flex: 1, fontWeight: 600, textAlign: 'right' },
  groupCount: {
    background: '#e6f4ec',
    color: '#1a7a40',
    borderRadius: 99,
    padding: '2px 10px',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  chevron: { fontSize: 11, color: '#999' },
  signupTable: {
    borderTop: '1px solid #f0f0f0',
    overflowX: 'auto',
  },
  th: {
    textAlign: 'right',
    padding: '8px 12px',
    borderBottom: '2px solid #e0e0e0',
    fontSize: 12,
    fontWeight: 600,
    background: '#fafafa',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid #f5f5f5',
    fontSize: 13,
    verticalAlign: 'top',
  },
  notesCell: {
    maxWidth: 300,
    wordBreak: 'break-word',
  },
};
