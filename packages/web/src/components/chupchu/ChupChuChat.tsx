import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { useDirection } from '../../hooks/useDirection';
import type { ChupChuMessage } from '@gina-haya/shared';
import type { ChupChuExpression } from '../../stores/chupChuStore';
import { useChupChu } from '../../hooks/useChupChu';
import { useAuthStore } from '../../stores/authStore';
import { ChupChuGreeting } from './ChupChuGreeting';
import { RateLimitBanner } from './RateLimitBanner';
import { PlantConfirmBubble } from '../journal/PlantConfirmBubble';
import type { ConfirmItem } from '../journal/PlantConfirmBubble';
import './chupchu-chat.css';

// Compress an image file to JPEG base64 below ~4.5 MB
async function compressImageToBase64(file: File): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1568;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else                { width  = Math.round((width  * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas context unavailable'));
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64  = dataUrl.split(',')[1];
      resolve({ base64, dataUrl });
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

// ── Design tokens ────────────────────────────────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_MID  = '#091410';
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

// ── Expression images ─────────────────────────────────────────────────────────
const EXPRESSION_IMAGES: Record<ChupChuExpression, string> = {
  default:   '/chupchu_final.png',
  happy:     '/chupchu_happy.png',
  surprised: '/chupchu_surprised.png',
  thinking:  '/chupchu_thinking.png',
  wise:      '/chupchu_wise.png',
};

// ── Guest chat (unauthenticated) ──────────────────────────────────────────────
const GUEST_LIMIT = 3;
const GUEST_KEY   = 'chupchu_guest_count';

function getGuestCount(): number {
  return parseInt(localStorage.getItem(GUEST_KEY) || '0', 10);
}
function incrementGuestCount(): number {
  const next = getGuestCount() + 1;
  localStorage.setItem(GUEST_KEY, String(next));
  return next;
}

const GUEST_TIPS: string[] = [
  "שלום! אני צ'ופצ'ו 🌱 אשמח לעזור לך עם הגינה. הצטרף אלינו כדי לקבל תשובות מלאות!",
  'שאלה נהדרת! כדי לקבל את התשובה המלאה, כדאי להירשם — זה חינמי לגמרי 🌿',
  'עוד שאלה אחת ואגיד לך הכל... או שתצטרף עכשיו וניהנה יחד מגינה חיה ונושמת! 🪴',
];

function GuestSignupWall() {
  const navigate = useNavigate();
  return (
    <div style={{
      padding:         '22px 18px',
      backgroundColor: NIGHT_CARD,
      borderTop:       '1px solid rgba(0,229,195,0.25)',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      gap:             '14px',
      textAlign:       'center',
    }}>
      <img
        src="/chupchu_final.png"
        alt="ChupChu"
        style={{ width: '60px', height: '60px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(0,229,195,0.35))' }}
      />
      <h3 style={{ fontFamily: "'Caveat', cursive", fontSize: '21px', color: BIO_CYAN, margin: 0 }}>
        רוצה להמשיך לדבר איתי?
      </h3>
      <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}CC`, margin: 0, lineHeight: 1.65, maxWidth: '280px' }}>
        הצטרפו בחינם וקבלו גישה מלאה לצ'ופצ'ו, ללוח הביודינמי ולגינה החיה שלכם
      </p>
      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
        <button
          onClick={() => navigate('/signup')}
          style={{
            flex: 1, padding: '11px 12px',
            backgroundColor: BIO_CYAN, color: NIGHT,
            border: 'none', borderRadius: '10px',
            fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', transition: 'filter 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
        >
          הרשמה חינמית
        </button>
        <button
          onClick={() => navigate('/login')}
          style={{
            flex: 1, padding: '11px 12px',
            backgroundColor: 'transparent', color: BIO_CYAN,
            border: '1px solid rgba(0,229,195,0.45)', borderRadius: '10px',
            fontFamily: FRANK, fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          כניסה
        </button>
      </div>
      <p style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}50`, margin: 0 }}>
        3 שיחות ניתנו לאורחים — ראיתם רק את ההתחלה 🌱
      </p>
    </div>
  );
}

// Avatar with emoji fallback when the expression image doesn't exist yet
function ChupChuAvatar({ expression, size }: { expression: ChupChuExpression; size: number }) {
  const fontSize = Math.round(size * 0.5);
  return (
    <div
      className="chupchu-avatar-pulse"
      aria-hidden="true"
      style={{
        flexShrink:      0,
        width:           `${size}px`,
        height:          `${size}px`,
        borderRadius:    '50%',
        background:      'radial-gradient(circle at 40% 40%, rgba(0,229,195,0.45), rgba(0,180,150,0.2))',
        border:          '1px solid rgba(0,229,195,0.3)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        overflow:        'hidden',
        position:        'relative',
      }}
    >
      <span style={{ position: 'absolute', fontSize: `${fontSize}px`, lineHeight: 1 }}>🌱</span>
      <img
        src={EXPRESSION_IMAGES[expression]}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots({ isRTL, expression }: { isRTL: boolean; expression: ChupChuExpression }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        <ChupChuAvatar expression={expression} size={28} />
        <div
          style={{
            backgroundColor: NIGHT_CARD,
            border:          '1px solid rgba(0,229,195,0.15)',
            borderRadius:    '16px',
            padding:         '10px 16px',
          }}
          aria-label={isRTL ? 'צ\'ופצ\'ו חושב' : 'Chupchu is thinking'}
        >
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '16px' }}>
            {[0, 150, 300].map(delay => (
              <span
                key={delay}
                className="chupchu-dot"
                style={{
                  display:          'inline-block',
                  width:            '7px',
                  height:           '7px',
                  borderRadius:     '50%',
                  backgroundColor:  TEXT_MID,
                  animationDelay:   `${delay}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, isRTL }: { message: ChupChuMessage; isRTL: boolean }) {
  const isUser = message.role === 'user';

  const rowJustify = isRTL
    ? (isUser ? 'flex-start' : 'flex-end')
    : (isUser ? 'flex-end'   : 'flex-start');

  const userCorner    = isRTL ? { borderTopRightRadius: '4px' } : { borderTopLeftRadius:  '4px' };
  const chupChuCorner = isRTL ? { borderTopLeftRadius:  '4px' } : { borderTopRightRadius: '4px' };

  return (
    <div style={{ display: 'flex', justifyContent: rowJustify }}>
      <div style={{
        display:       'flex',
        alignItems:    'flex-end',
        gap:           '8px',
        maxWidth:      '80%',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}>
        {/* ChupChu avatar — assistant messages only */}
        {!isUser && (
          <div
            className="chupchu-avatar-pulse"
            aria-hidden="true"
            style={{
              flexShrink:      0,
              width:           '28px',
              height:          '28px',
              borderRadius:    '50%',
              background:      'radial-gradient(circle at 40% 40%, rgba(0,229,195,0.45), rgba(0,180,150,0.2))',
              border:          '1px solid rgba(0,229,195,0.3)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontSize:        '13px',
              lineHeight:      1,
              marginBottom:    '2px',
            }}
          >
            🌱
          </div>
        )}

        {/* Bubble */}
        <div
          className={[
            !isUser ? 'chupchu-md' : undefined,
            isUser ? 'chupchu-bubble-user' : 'chupchu-bubble-chupchu',
          ].filter(Boolean).join(' ')}
          style={{
            borderRadius: '16px',
            padding:      '10px 14px',
            fontSize:     '14px',
            lineHeight:   1.65,
            textAlign:    isRTL ? 'right' : 'left',
            direction:    isRTL ? 'rtl' : 'ltr',
            ...(isUser ? userCorner : chupChuCorner),
            ...(isUser
              ? {
                  backgroundColor: 'rgba(0,229,195,0.08)',
                  border:          '1px solid rgba(0,229,195,0.2)',
                  color:           TEXT_MID,
                  fontFamily:      DM_SANS,
                  fontWeight:      400,
                }
              : {
                  backgroundColor:  NIGHT_CARD,
                  border:           '1px solid rgba(0,229,195,0.15)',
                  borderInlineEnd:  `2px solid ${BIO_CYAN}`,
                  color:            TEXT_MID,
                  fontFamily:       FRANK,
                }),
          }}
        >
          {isUser
            ? message.content.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))
            : <ReactMarkdown>{message.content}</ReactMarkdown>
          }
        </div>
      </div>
    </div>
  );
}

// ── Task proposal card ────────────────────────────────────────────────────────
const CATEGORY_ICON: Record<string, string> = {
  watering:     '💧',
  fertilizing:  '🌱',
  pruning:      '✂️',
  planting:     '🌿',
  harvesting:   '🌾',
  pest_control: '🪲',
  composting:   '♻️',
  general:      '📋',
};

const PRIORITY_COLOR: Record<string, string> = {
  high:   '#E05555',
  medium: '#C8A040',
  low:    '#4A9C68',
};

interface TaskProposalCardProps {
  tasks: import('../../stores/chupChuStore').ProposedTask[];
  isRTL: boolean;
  isHe: boolean;
  onDismiss: () => void;
}

function TaskProposalCard({ tasks, isRTL, isHe, onDismiss }: TaskProposalCardProps) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set(tasks.map((_, i) => i)));
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'https://powerful-embrace-production-95ea.up.railway.app';

  const toggle = (i: number) =>
    setChecked(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const formatDate = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(isHe ? 'he-IL' : 'en-US', { weekday: 'short', day: 'numeric', month: 'numeric' });
  };

  const handleAdd = async () => {
    const selected = tasks
      .filter((_, i) => checked.has(i))
      .map(t => ({
        title: isHe ? t.title.he : t.title.en,
        notes: isHe ? t.description.he : t.description.en,
        date:  t.date,
        category: t.category,
      }));
    if (selected.length === 0) return;

    setSaving(true);
    try {
      const authToken = useAuthStore.getState().session?.access_token;
      if (!authToken) throw new Error('Not authenticated');

      const res = await fetch(`${API_BASE}/api/tasks/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ tasks: selected }),
      });
      if (!res.ok) throw new Error('Failed to create tasks');
      setSaved(true);
      setTimeout(onDismiss, 2000);
    } catch {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div style={{
        backgroundColor: NIGHT_CARD,
        border: `1px solid ${BIO_CYAN}`,
        borderRadius: '12px',
        padding: '14px 16px',
        textAlign: 'center',
        fontFamily: DM_SANS,
        fontSize: '14px',
        color: BIO_CYAN,
      }}>
        {isHe
          ? `✓ נוספו ${checked.size} משימות ליומן שלך`
          : `✓ Added ${checked.size} tasks to your task manager`}
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: NIGHT_CARD,
      border: `1px solid rgba(0,229,195,0.25)`,
      borderRadius: '12px',
      overflow: 'hidden',
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(0,229,195,0.12)',
        backgroundColor: 'rgba(0,229,195,0.05)',
      }}>
        <span style={{ fontFamily: FRANK, fontSize: '13px', fontWeight: 700, color: BIO_CYAN }}>
          {isHe ? '📋 משימות מוצעות' : '📋 Suggested Tasks'}
        </span>
        <button onClick={onDismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: `${TEXT_MID}55`, fontSize: '14px', padding: '0 2px',
        }}>✕</button>
      </div>

      {/* Task list */}
      <div style={{ padding: '8px 0' }}>
        {tasks.map((task, i) => (
          <label key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '8px 14px', cursor: 'pointer',
            borderBottom: i < tasks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <input
              type="checkbox"
              checked={checked.has(i)}
              onChange={() => toggle(i)}
              style={{ marginTop: '3px', flexShrink: 0, accentColor: BIO_CYAN }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px' }}>{CATEGORY_ICON[task.category] ?? '📋'}</span>
                <span style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, fontWeight: 500 }}>
                  {isHe ? task.title.he : task.title.en}
                </span>
                <span style={{
                  fontSize: '10px', fontFamily: DM_SANS, fontWeight: 600,
                  color: PRIORITY_COLOR[task.priority] ?? TEXT_MID,
                  background: `${PRIORITY_COLOR[task.priority] ?? '#888'}22`,
                  borderRadius: '4px', padding: '1px 5px',
                }}>
                  {task.priority}
                </span>
              </div>
              <div style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}66`, marginTop: '2px' }}>
                {formatDate(task.date)}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Footer button */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(0,229,195,0.12)' }}>
        <button
          onClick={handleAdd}
          disabled={saving || checked.size === 0}
          style={{
            width: '100%', padding: '9px', borderRadius: '8px', border: 'none',
            backgroundColor: checked.size > 0 ? BIO_CYAN : 'rgba(0,229,195,0.15)',
            color: checked.size > 0 ? NIGHT : `${TEXT_MID}44`,
            fontFamily: FRANK, fontSize: '13px', fontWeight: 700,
            cursor: saving || checked.size === 0 ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving
            ? (isHe ? 'מוסיף...' : 'Adding...')
            : (isHe
                ? `הוסף ${checked.size} משימות נבחרות ✓`
                : `Add ${checked.size} Selected Tasks ✓`)}
        </button>
      </div>
    </div>
  );
}

// ── Main chat ─────────────────────────────────────────────────────────────────
interface ChupChuChatProps {
  compact?: boolean;
  initialMessage?: string;
  onInitialMessageConsumed?: () => void;
  quickSend?: string;
  onQuickSendConsumed?: () => void;
}

export function ChupChuChat({ compact, initialMessage, onInitialMessageConsumed, quickSend, onQuickSendConsumed }: ChupChuChatProps = {}) {
  const { t, i18n } = useTranslation('chupchu');
  const isHe = i18n.language === 'he';
  const { dir, isRTL } = useDirection();

  const {
    messages,
    pendingMessage,
    pendingImageDataUrl,
    isLoading,
    error,
    rateLimited,
    rateLimitTier,
    expression,
    proposedTasks,
    memory,
    sendMessage,
    clearError,
    clearProposedTasks,
    loadMemory,
    triggerSummarize,
  } = useChupChu();

  const { user } = useAuthStore();
  const isGuest = !user;

  const lang = i18n.language;

  const [input, setInput] = useState('');
  const messagesEndRef         = useRef<HTMLDivElement>(null);
  const textareaRef            = useRef<HTMLTextAreaElement>(null);
  const fileInputRef           = useRef<HTMLInputElement>(null);
  // Tracks message count at last summarisation to enforce a per-session interval.
  // useRef so a re-render cannot reset the marker and re-fire the same window.
  const lastSummarizedAtRef    = useRef<number>(0);

  const [imageFile,       setImageFile]       = useState<File | null>(null);
  const [imageBase64,     setImageBase64]     = useState<string | null>(null);
  const [imageDataUrl,    setImageDataUrl]    = useState<string | null>(null);
  const [imageError,      setImageError]      = useState<string | null>(null);

  const [guestMessages,  setGuestMessages]  = useState<ChupChuMessage[]>([]);
  const [guestLoading,   setGuestLoading]   = useState(false);
  const [showGuestWall,  setShowGuestWall]  = useState(() => !user && getGuestCount() >= GUEST_LIMIT);

  // Plant confirm queue — populated by ChupChu photo identification flow
  const [confirmQueue, setConfirmQueue] = useState<ConfirmItem[]>([]);

  const displayMessages = user ? messages : guestMessages;
  const showLoading     = user ? isLoading : guestLoading;
  const displayPending  = user ? pendingMessage : null;

  useEffect(() => {
    if (initialMessage) {
      setInput(initialMessage);
      onInitialMessageConsumed?.();
      textareaRef.current?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, guestMessages, isLoading, guestLoading]);

  useEffect(() => {
    loadMemory().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for plant-confirm events dispatched after ChupChu photo AI identification
  useEffect(() => {
    function handlePlantConfirm(e: Event) {
      const detail = (e as CustomEvent).detail as ConfirmItem;
      if (detail?.photoId) {
        setConfirmQueue(prev => [...prev, detail]);
      }
    }
    window.addEventListener('chupchu:plant-confirm', handlePlantConfirm);
    return () => window.removeEventListener('chupchu:plant-confirm', handlePlantConfirm);
  }, []);

  // Trigger memory summarisation at most once every SUMMARIZE_INTERVAL messages
  // after the initial threshold. lastSummarizedAtRef is a useRef so a re-render
  // cannot reset the marker and re-fire the same window. Fires at counts 6, 10,
  // 14, 18, … (interval=4 means 2 full turns between each call).
  const SUMMARIZE_INTERVAL = 4;
  useEffect(() => {
    if (!user || messages.length < 6) return;
    const last = messages[messages.length - 1];
    if (last?.role !== 'assistant') return;
    if (messages.length - lastSummarizedAtRef.current < SUMMARIZE_INTERVAL) return;
    lastSummarizedAtRef.current = messages.length;
    triggerSummarize(lang).catch((err: any) => {
      console.error('[ChupChu] triggerSummarize threw unexpectedly:', err?.message);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const clearImageSelection = () => {
    setImageFile(null);
    setImageBase64(null);
    setImageDataUrl(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError(isHe ? 'יש לבחור קובץ תמונה בלבד' : 'Please select an image file');
      return;
    }
    setImageError(null);
    setImageFile(file);
    try {
      const { base64, dataUrl } = await compressImageToBase64(file);
      setImageBase64(base64);
      setImageDataUrl(dataUrl);
    } catch {
      setImageError(isHe ? 'שגיאה בעיבוד התמונה' : 'Error processing image');
      setImageFile(null);
    }
  };

  const handleSend = (forceText?: string) => {
    const text = (forceText ?? input).trim();
    const hasImg = !!imageBase64;
    if ((!text && !hasImg) || showLoading) return;

    if (isGuest) {
      if (showGuestWall) return;
      if (!forceText) { setInput(''); if (textareaRef.current) textareaRef.current.style.height = 'auto'; }
      clearImageSelection();

      const newCount = incrementGuestCount();
      const userMsg: ChupChuMessage = { role: 'user', content: text || '🌿 [תמונה]', timestamp: new Date().toISOString() };
      setGuestMessages(prev => [...prev, userMsg]);
      setGuestLoading(true);

      setTimeout(() => {
        const reply: ChupChuMessage = {
          role:      'assistant',
          content:   GUEST_TIPS[(newCount - 1) % GUEST_TIPS.length],
          timestamp: new Date().toISOString(),
        };
        setGuestMessages(prev => [...prev, reply]);
        setGuestLoading(false);
        if (newCount >= GUEST_LIMIT) setShowGuestWall(true);
      }, 900 + Math.random() * 500);
      return;
    }

    if (rateLimited) return;
    if (!forceText) { setInput(''); if (textareaRef.current) textareaRef.current.style.height = 'auto'; }
    const imgB64   = imageBase64 ?? undefined;
    const imgDUrl  = imageDataUrl ?? undefined;
    clearImageSelection();
    sendMessage(text, undefined, imgB64, imgDUrl);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (quickSend) {
      handleSend(quickSend);
      onQuickSendConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    if (error) clearError();
  };

  const canSend = (input.trim().length > 0 || !!imageBase64) && !showLoading && !(isGuest ? showGuestWall : rateLimited);

  return (
    <div dir={dir} className="chupchu-container" style={{
      display:         'flex',
      flexDirection:   'column',
      backgroundColor: NIGHT_CARD,
      border:          '1px solid rgba(0,229,195,0.1)',
      borderRadius:    '16px',
      overflow:        'hidden',
    }}>

      {/* Top bar */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        gap:             '10px',
        padding:         '12px 18px',
        backgroundColor: NIGHT_MID,
        borderBottom:    '1px solid rgba(0,229,195,0.1)',
      }}>
        <ChupChuAvatar expression={expression} size={40} />
        <div>
          <h2 style={{
            fontFamily: FRANK,
            fontWeight: 700,
            fontSize:   '16px',
            color:      BIO_CYAN,
            margin:     0,
            lineHeight: 1.2,
          }}>
            {t('title')}
          </h2>
          <p style={{
            fontFamily: DM_SANS,
            fontSize:   '11px',
            fontWeight: 300,
            color:      `${TEXT_MID}55`,
            margin:     0,
          }}>
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Message list */}
      <div
        className="chupchu-scroll"
        style={{
          flex:          1,
          minHeight:     compact ? 0 : '400px',
          maxHeight:     compact ? 'none' : '520px',
          overflowY:     'auto',
          padding:       '20px 16px',
          display:       'flex',
          flexDirection: 'column',
          gap:           '12px',
        }}
      >
        {displayMessages.length === 0 && !showLoading && (
          <>
            <ChupChuGreeting />
            <p style={{
              fontFamily: "'Caveat', cursive",
              fontSize:   '16px',
              color:      'rgba(0,229,195,0.35)',
              textAlign:  'center',
              margin:     '6px 0 0',
              direction:  'rtl',
              userSelect: 'none',
            }}>
              ...שאל אותי כל דבר על הגינה שלך
            </p>
          </>
        )}

        {displayMessages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} isRTL={isRTL} />
        ))}

        {displayPending && (
          <div style={{ opacity: 0.6 }}>
            {pendingImageDataUrl && (
              <div style={{ display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end', marginBottom: '4px' }}>
                <img
                  src={pendingImageDataUrl}
                  alt=""
                  style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(0,229,195,0.3)' }}
                />
              </div>
            )}
            <MessageBubble message={displayPending} isRTL={isRTL} />
          </div>
        )}

        {showLoading && <TypingDots isRTL={isRTL} expression={isGuest ? 'default' : expression} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Plant confirm queue — shown above task proposal */}
      {confirmQueue.length > 0 && (
        <PlantConfirmBubble
          item={confirmQueue[0]}
          onDone={() => setConfirmQueue(prev => prev.slice(1))}
          onDismiss={() => setConfirmQueue(prev => prev.slice(1))}
        />
      )}

      {/* Task proposal card */}
      {proposedTasks && proposedTasks.length > 0 && (
        <div style={{ padding: '0 16px 8px' }}>
          <TaskProposalCard
            tasks={proposedTasks}
            isRTL={isRTL}
            isHe={isHe}
            onDismiss={clearProposedTasks}
          />
        </div>
      )}

      {/* Rate limit banner */}
      {rateLimited && <RateLimitBanner tier={rateLimitTier} />}

      {/* Error */}
      {error && (
        <p style={{
          fontFamily: DM_SANS,
          fontSize:   '12px',
          textAlign:  isRTL ? 'right' : 'left',
          color:      '#ff5c8a',
          padding:    '6px 16px 0',
          margin:     0,
        }}>
          {error}
        </p>
      )}

      {/* Disclaimer */}
      <p style={{
        fontFamily: DM_SANS,
        fontWeight: 300,
        fontSize:   '11px',
        textAlign:  isRTL ? 'right' : 'left',
        color:      `${TEXT_MID}40`,
        padding:    '6px 16px 0',
        margin:     0,
      }}>
        {t('disclaimer')}
      </p>

      {/* Guest signup wall — replaces input bar when limit reached */}
      {isGuest && showGuestWall ? <GuestSignupWall /> : (

      /* Input bar */
      <div style={{
        flexShrink:      0,
        position:        'sticky',
        bottom:          0,
        padding:         '12px 14px 14px',
        backgroundColor: NIGHT_MID,
        borderTop:       '1px solid rgba(0,229,195,0.1)',
      }}>
        {/* Image preview strip */}
        {imageDataUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <img
                src={imageDataUrl}
                alt=""
                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(0,229,195,0.35)' }}
              />
              <button
                onClick={clearImageSelection}
                aria-label="הסר תמונה"
                style={{
                  position:        'absolute',
                  top:             '-6px',
                  insetInlineEnd:  '-6px',
                  width:           '18px',
                  height:          '18px',
                  borderRadius:    '50%',
                  border:          'none',
                  backgroundColor: '#E05555',
                  color:           '#fff',
                  fontSize:        '10px',
                  cursor:          'pointer',
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  lineHeight:      1,
                }}
              >
                ✕
              </button>
            </div>
            <span style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}99` }}>
              {imageFile?.name ?? (isHe ? 'תמונה נבחרה' : 'Image selected')}
            </span>
          </div>
        )}

        {imageError && (
          <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: '#ff5c8a', margin: '0 0 6px' }}>
            {imageError}
          </p>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleImageSelect(file);
          }}
        />

        <div className="chupchu-input-wrapper" style={{
          display:         'flex',
          alignItems:      'flex-end',
          gap:             '10px',
          backgroundColor: NIGHT_CARD,
          border:          '1px solid rgba(0,229,195,0.2)',
          borderRadius:    '12px',
          padding:         '10px 12px',
          transition:      'border-color 0.2s',
        }}>
          {/* Camera button */}
          {!isGuest && !rateLimited && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={showLoading}
              aria-label={isHe ? 'העלה תמונת צמח' : 'Upload plant image'}
              title={isHe ? 'זהה צמח מתמונה' : 'Identify plant from photo'}
              style={{
                flexShrink:      0,
                width:           '36px',
                height:          '36px',
                borderRadius:    '8px',
                border:          imageDataUrl ? `1px solid ${BIO_CYAN}` : '1px solid rgba(0,229,195,0.3)',
                backgroundColor: imageDataUrl ? 'rgba(0,229,195,0.12)' : 'transparent',
                color:           imageDataUrl ? BIO_CYAN : `${TEXT_MID}88`,
                fontSize:        '17px',
                cursor:          showLoading ? 'default' : 'pointer',
                opacity:         showLoading ? 0.4 : 1,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                transition:      'border-color 0.2s, background-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { if (!showLoading) (e.currentTarget as HTMLElement).style.color = BIO_CYAN; }}
              onMouseLeave={e => { if (!imageDataUrl) (e.currentTarget as HTMLElement).style.color = `${TEXT_MID}88`; }}
            >
              📷
            </button>
          )}

          <textarea
            ref={textareaRef}
            className="chupchu-textarea"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              isGuest ? "שאל את צ'ופצ'ו... (3 הודעות חינם)" :
              rateLimited ? '' :
              imageDataUrl ? (isHe ? 'הוסף תיאור (אופציונלי)...' : 'Add description (optional)...') :
              t('inputPlaceholder')
            }
            disabled={showLoading || (isGuest ? false : rateLimited)}
            rows={1}
            style={{
              flex:       '1 1 auto',
              resize:     'none',
              border:     'none',
              outline:    'none',
              background: 'transparent',
              fontFamily: DM_SANS,
              fontSize:   '14px',
              color:      TEXT_MID,
              lineHeight: '1.5',
              maxHeight:  '120px',
              cursor:     (!isGuest && rateLimited) ? 'not-allowed' : 'text',
              direction:  isRTL ? 'rtl' : 'ltr',
              textAlign:  isRTL ? 'right' : 'left',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!canSend}
            aria-label={t('sendButton')}
            style={{
              flexShrink:      0,
              width:           '44px',
              height:          '44px',
              borderRadius:    '8px',
              border:          'none',
              backgroundColor: BIO_CYAN,
              color:           NIGHT,
              fontFamily:      FRANK,
              fontWeight:      700,
              fontSize:        '16px',
              cursor:          canSend ? 'pointer' : 'default',
              opacity:         canSend ? 1 : 0.4,
              transition:      'opacity 0.2s, filter 0.2s',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
            }}
            onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            →
          </button>
        </div>
      </div>

      )} {/* end guest wall ternary */}

    </div>
  );
}
