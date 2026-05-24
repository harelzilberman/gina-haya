import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;

interface KnowledgeFile {
  source_file: string;
  chunks: number;
  uploaded_at: string;
}

interface SearchResult {
  chunk_text: string;
  source_file: string;
  title: string;
}

export function AdminKnowledgePage() {
  const { user, session } = useAuthStore();
  const token = session?.access_token;

  // Upload state
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState<'he' | 'en'>('he');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Files list state
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Test search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const isAdmin = ADMIN_EMAIL && user?.email === ADMIN_EMAIL;

  async function loadFiles() {
    if (!token) return;
    setLoadingFiles(true);
    try {
      const data = await api.get<KnowledgeFile[]>('/api/admin/knowledge/list', token);
      setFiles(data);
    } catch {
      // silently ignore
    } finally {
      setLoadingFiles(false);
    }
  }

  useEffect(() => {
    if (isAdmin) loadFiles();
  }, [isAdmin, token]);

  async function handleUpload() {
    if (!token || !fileRef.current?.files?.[0]) return;

    const file = fileRef.current.files[0];

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('קובץ גדול מדי — מקסימום 10MB');
      return;
    }

    if (!title.trim()) {
      setUploadError('יש להזין כותרת');
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    setUploadError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data:...;base64, prefix
          resolve(result.split(',')[1] ?? result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await api.post<{ success: boolean; chunks: number; title: string }>(
        '/api/admin/knowledge/upload',
        { title: title.trim(), language, pdfBase64: base64 },
        token,
      );

      setUploadStatus(`✓ הועלו ${result.chunks} קטעים מ-"${result.title}"`);
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      await loadFiles();
    } catch (err: any) {
      setUploadError(err.message || 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(sourceFile: string) {
    if (!token) return;
    if (!window.confirm(`למחוק את "${sourceFile}"?`)) return;

    try {
      await api.del(`/api/admin/knowledge/${encodeURIComponent(sourceFile)}`, token);
      await loadFiles();
    } catch (err: any) {
      alert(`שגיאה במחיקה: ${err.message}`);
    }
  }

  async function handleSearch() {
    if (!token || !query.trim()) return;
    setSearching(true);
    setSearchResults(null);
    setSearchError(null);

    try {
      const data = await api.get<SearchResult[]>(
        `/api/admin/knowledge/search?q=${encodeURIComponent(query.trim())}`,
        token,
      );
      setSearchResults(data);
    } catch (err: any) {
      setSearchError(err.message || 'שגיאה בחיפוש');
    } finally {
      setSearching(false);
    }
  }

  if (!user) {
    return <div style={styles.page}><p>יש להתחבר תחילה.</p></div>;
  }

  if (!isAdmin) {
    return <div style={styles.page}><p style={{ color: '#c00' }}>אין הרשאת גישה לעמוד זה.</p></div>;
  }

  return (
    <div style={styles.page} dir="rtl">
      <h1 style={styles.h1}>מאגר ידע — ניהול</h1>

      {/* ── UPLOAD ─────────────────────────────────────────────── */}
      <section style={styles.section}>
        <h2 style={styles.h2}>העלאת PDF</h2>
        <div style={styles.row}>
          <label style={styles.label}>כותרת המסמך</label>
          <input
            style={styles.input}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="לדוגמה: מחלות עגבנייה"
          />
        </div>
        <div style={styles.row}>
          <label style={styles.label}>שפה</label>
          <select
            style={styles.input}
            value={language}
            onChange={e => setLanguage(e.target.value as 'he' | 'en')}
          >
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
        </div>
        <div style={styles.row}>
          <label style={styles.label}>קובץ PDF</label>
          <input ref={fileRef} type="file" accept=".pdf" style={styles.input} />
        </div>
        <button
          style={{ ...styles.btn, opacity: uploading ? 0.6 : 1 }}
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'מעבד...' : 'העלה'}
        </button>
        {uploadStatus && <p style={{ color: '#1a7a40', marginTop: 8 }}>{uploadStatus}</p>}
        {uploadError  && <p style={{ color: '#c00', marginTop: 8 }}>{uploadError}</p>}
      </section>

      {/* ── FILES LIST ────────────────────────────────────────── */}
      <section style={styles.section}>
        <h2 style={styles.h2}>קבצים שהועלו</h2>
        {loadingFiles ? (
          <p>טוען...</p>
        ) : files.length === 0 ? (
          <p style={{ color: '#888' }}>אין קבצים עדיין.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>שם קובץ</th>
                <th style={styles.th}>קטעים</th>
                <th style={styles.th}>תאריך העלאה</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.source_file}>
                  <td style={styles.td}>{f.source_file}</td>
                  <td style={styles.td}>{f.chunks}</td>
                  <td style={styles.td}>{new Date(f.uploaded_at).toLocaleDateString('he-IL')}</td>
                  <td style={styles.td}>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDelete(f.source_file)}
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── TEST SEARCH ───────────────────────────────────────── */}
      <section style={styles.section}>
        <h2 style={styles.h2}>בדיקת חיפוש</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={{ ...styles.input, flex: 1 }}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder='לדוגמה: עלים צהובים, כנימות שורש'
          />
          <button
            style={{ ...styles.btn, opacity: searching ? 0.6 : 1 }}
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? 'מחפש...' : 'חפש'}
          </button>
        </div>
        {searchError && <p style={{ color: '#c00', marginTop: 8 }}>{searchError}</p>}
        {searchResults !== null && (
          searchResults.length === 0
            ? <p style={{ color: '#888', marginTop: 8 }}>לא נמצאו תוצאות.</p>
            : searchResults.map((r, i) => (
                <div key={i} style={styles.chunk}>
                  <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
                    מקור: {r.source_file}
                  </p>
                  <pre style={styles.chunkText}>{r.chunk_text}</pre>
                </div>
              ))
        )}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: '"Assistant", "Heebo", sans-serif',
  },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  h2: { fontSize: 18, fontWeight: 600, marginBottom: 16 },
  section: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: '20px 24px',
    marginBottom: 24,
  },
  row: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 14,
    boxSizing: 'border-box',
  },
  btn: {
    background: '#1a7a40',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 20px',
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: 600,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'right',
    padding: '8px 12px',
    borderBottom: '2px solid #e0e0e0',
    fontSize: 13,
    fontWeight: 600,
  },
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: 14,
  },
  deleteBtn: {
    background: 'transparent',
    color: '#c00',
    border: '1px solid #c00',
    borderRadius: 4,
    padding: '3px 10px',
    cursor: 'pointer',
    fontSize: 12,
  },
  chunk: {
    background: '#f8f8f8',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
  },
  chunkText: {
    fontSize: 13,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
    fontFamily: 'inherit',
  },
};
