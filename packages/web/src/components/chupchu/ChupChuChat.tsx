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
import './chupchu-chat.css';

// ── Design tokens ────────────────────────────────────────────────────────────
const GOLD     = '#F5C840';
const PARCH    = '#EDE0C4';
const SAGE     = '#7DC084';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST   = '"Assistant", "Heebo", sans-serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

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
  'שלום! 🌙 שמחתי שפנית אליי. כדי לקבל עצות ביודינמיות מותאמות לגינה שלך — הצטרף לגינה חיה בחינם.',
  'שאלה מעניינת! 🌿 בביודינמיקה, הירח הוא המפתח לתזמון הנכון. הצטרף בחינם לגישה ללוח הביודינמי היומי שלנו ולמאות צמחים.',
  'הגינה שלך מחכה לי! 🌱 הצטרף לגינה חיה — שם נוכל לדבר בחופשיות על כל מה שהגינה שלך צריכה.',
];

function GuestSignupWall() {
  const navigate = useNavigate();
  return (
    <div style={{
      padding:         '22px 18px',
      backgroundColor: 'rgba(20,43,22,0.95)',
      borderTop:       '1px solid rgba(245,200,64,0.3)',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      gap:             '14px',
      textAlign:       'center',
    }}>
      <img
        src="/chupchu_final.png"
        alt="ChupChu"
        style={{ width: '60px', height: '60px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(245,200,64,0.45))' }}
      />
      <h3 style={{ fontFamily: "'Caveat', cursive", fontSize: '21px', color: GOLD, margin: 0 }}>
        רוצה להמשיך לדבר איתי?
      </h3>
      <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}CC`, margin: 0, lineHeight: 1.65, maxWidth: '280px' }}>
        הצטרפו בחינם וקבלו גישה מלאה לצ'ופצ'ו, ללוח הביודינמי ולגינה החיה שלכם
      </p>
      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
        <button
          onClick={() => navigate('/signup')}
          style={{
            flex: 1, padding: '11px 12px',
            backgroundColor: GOLD, color: '#142B16',
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
            backgroundColor: 'transparent', color: GOLD,
            border: '1px solid rgba(245,200,64,0.5)', borderRadius: '10px',
            fontFamily: FRANK, fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = GOLD;
            el.style.color = '#F0D840';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'rgba(245,200,64,0.5)';
            el.style.color = GOLD;
          }}
        >
          כניסה
        </button>
      </div>
      <p style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}50`, margin: 0 }}>
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
        background:      `radial-gradient(circle at 40% 40%, #F5D060, ${GOLD}, #C8960A)`,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        overflow:        'hidden',
        position:        'relative',
      }}
    >
      {/* emoji shows through when image fails */}
      <span style={{ position: 'absolute', fontSize: `${fontSize}px`, lineHeight: 1 }}>🌕</span>
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
            backgroundColor: 'rgba(28,58,30,0.8)',
            border:          '1px solid rgba(245,200,64,0.15)',
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
                  backgroundColor:  SAGE,
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

  // In RTL: user on RIGHT, ChupChu on LEFT
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
        {/* ChupChu avatar — assistant messages only, uses static emoji avatar */}
        {!isUser && (
          <div
            className="chupchu-avatar-pulse"
            aria-hidden="true"
            style={{
              flexShrink:      0,
              width:           '28px',
              height:          '28px',
              borderRadius:    '50%',
              background:      `radial-gradient(circle at 40% 40%, #F5D060, ${GOLD}, #C8960A)`,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontSize:        '13px',
              lineHeight:      1,
              marginBottom:    '2px',
            }}
          >
            🌕
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
                  backgroundColor: 'rgba(74,128,80,0.3)',
                  border:          '1px solid rgba(125,192,132,0.2)',
                  color:           PARCH,
                  fontFamily:      ASSIST,
                  fontWeight:      400,
                }
              : {
                  backgroundColor:  'rgba(28,58,30,0.8)',
                  border:           '1px solid rgba(245,200,64,0.15)',
                  borderInlineEnd:  `2px solid ${GOLD}`,
                  color:            PARCH,
                  fontFamily:       PLAYFAIR,
                  fontStyle:        'italic',
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
  low:    '#7DC084',
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
        backgroundColor: 'rgba(28,58,30,0.9)',
        border: `1px solid ${SAGE}`,
        borderRadius: '12px',
        padding: '14px 16px',
        textAlign: 'center',
        fontFamily: ASSIST,
        fontSize: '14px',
        color: SAGE,
      }}>
        {isHe
          ? `✓ נוספו ${checked.size} משימות ליומן שלך`
          : `✓ Added ${checked.size} tasks to your task manager`}
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'rgba(20,43,22,0.95)',
      border: `1px solid rgba(245,200,64,0.25)`,
      borderRadius: '12px',
      overflow: 'hidden',
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(245,200,64,0.12)',
        backgroundColor: 'rgba(245,200,64,0.06)',
      }}>
        <span style={{ fontFamily: FRANK, fontSize: '13px', fontWeight: 700, color: GOLD }}>
          {isHe ? '📋 משימות מוצעות' : '📋 Suggested Tasks'}
        </span>
        <button onClick={onDismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: `${PARCH}55`, fontSize: '14px', padding: '0 2px',
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
              style={{ marginTop: '3px', flexShrink: 0, accentColor: GOLD }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px' }}>{CATEGORY_ICON[task.category] ?? '📋'}</span>
                <span style={{ fontFamily: ASSIST, fontSize: '13px', color: PARCH, fontWeight: 500 }}>
                  {isHe ? task.title.he : task.title.en}
                </span>
                <span style={{
                  fontSize: '10px', fontFamily: ASSIST, fontWeight: 600,
                  color: PRIORITY_COLOR[task.priority] ?? PARCH,
                  background: `${PRIORITY_COLOR[task.priority] ?? '#888'}22`,
                  borderRadius: '4px', padding: '1px 5px',
                }}>
                  {task.priority}
                </span>
              </div>
              <div style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}66`, marginTop: '2px' }}>
                {formatDate(task.date)}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Footer button */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(245,200,64,0.12)' }}>
        <button
          onClick={handleAdd}
          disabled={saving || checked.size === 0}
          style={{
            width: '100%', padding: '9px', borderRadius: '8px', border: 'none',
            backgroundColor: checked.size > 0 ? GOLD : 'rgba(245,200,64,0.2)',
            color: checked.size > 0 ? '#142B16' : `${PARCH}44`,
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
}

export function ChupChuChat({ compact, initialMessage, onInitialMessageConsumed }: ChupChuChatProps = {}) {
  const { t, i18n } = useTranslation('chupchu');
  const isHe = i18n.language === 'he';
  const { dir, isRTL } = useDirection();

  const {
    messages,
    pendingMessage,
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
  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);

  // Guest-only state — ignored for authenticated users
  const [guestMessages,  setGuestMessages]  = useState<ChupChuMessage[]>([]);
  const [guestLoading,   setGuestLoading]   = useState(false);
  const [showGuestWall,  setShowGuestWall]  = useState(() => !user && getGuestCount() >= GUEST_LIMIT);

  // Unified display variables — switch between store state (auth) and local state (guest)
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
    loadMemory().catch(() => {/* fail silently — chat works without memory */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || 'https://powerful-embrace-production-95ea.up.railway.app';
    const handleUnload = () => {
      try {
        if (messages.length < 6) return;
        const token = useAuthStore.getState().session?.access_token;
        if (!token) return;
        const payload = JSON.stringify({ conversationHistory: messages, lang, existingMemory: memory });
        if (typeof navigator.sendBeacon === 'function') {
          navigator.sendBeacon(
            `${API_BASE}/api/chupchu/memory/summarize`,
            new Blob([payload], { type: 'application/json' }),
          );
        }
      } catch {
        // fire-and-forget — ignore failures
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [messages, lang, memory]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || showLoading) return;

    if (isGuest) {
      if (showGuestWall) return;
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      const newCount = incrementGuestCount();
      const userMsg: ChupChuMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
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
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    sendMessage(text);
  };

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

  const canSend = input.trim().length > 0 && !showLoading && !(isGuest ? showGuestWall : rateLimited);

  return (
    <div dir={dir} className="chupchu-container" style={{
      display:         'flex',
      flexDirection:   'column',
      backgroundColor: 'rgba(28,58,30,0.5)',
      border:          '1px solid rgba(125,192,132,0.1)',
      borderRadius:    '16px',
      overflow:        'hidden',
    }}>

      {/* Top bar */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        gap:             '10px',
        padding:         '12px 18px',
        backgroundColor: 'rgba(20,43,22,0.9)',
        borderBottom:    '1px solid rgba(245,200,64,0.1)',
      }}>
        <ChupChuAvatar expression={expression} size={40} />
        <div>
          <h2 style={{
            fontFamily: FRANK,
            fontWeight: 700,
            fontSize:   '16px',
            color:      GOLD,
            margin:     0,
            lineHeight: 1.2,
          }}>
            {t('title')}
          </h2>
          <p style={{
            fontFamily: ASSIST,
            fontSize:   '11px',
            fontWeight: 300,
            color:      `${PARCH}55`,
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
        {displayMessages.length === 0 && !showLoading && <ChupChuGreeting />}

        {displayMessages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} isRTL={isRTL} />
        ))}

        {displayPending && (
          <div style={{ opacity: 0.6 }}>
            <MessageBubble message={displayPending} isRTL={isRTL} />
          </div>
        )}

        {showLoading && <TypingDots isRTL={isRTL} expression={isGuest ? 'default' : expression} />}

        <div ref={messagesEndRef} />
      </div>

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
          fontFamily: ASSIST,
          fontSize:   '12px',
          textAlign:  isRTL ? 'right' : 'left',
          color:      '#E06060',
          padding:    '6px 16px 0',
          margin:     0,
        }}>
          {error}
        </p>
      )}

      {/* Disclaimer */}
      <p style={{
        fontFamily: ASSIST,
        fontWeight: 300,
        fontSize:   '11px',
        textAlign:  isRTL ? 'right' : 'left',
        color:      `${PARCH}40`,
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
        backgroundColor: 'rgba(20,43,22,0.9)',
        borderTop:       '1px solid rgba(125,192,132,0.1)',
      }}>
        <div className="chupchu-input-wrapper" style={{
          display:         'flex',
          alignItems:      'flex-end',
          gap:             '10px',
          backgroundColor: 'rgba(28,58,30,0.8)',
          border:          '1px solid rgba(125,192,132,0.2)',
          borderRadius:    '12px',
          padding:         '10px 12px',
          transition:      'border-color 0.2s',
        }}>
          <textarea
            ref={textareaRef}
            className="chupchu-textarea"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={isGuest ? "שאל את צ'ופצ'ו... (3 הודעות חינם)" : (rateLimited ? '' : t('inputPlaceholder'))}
            disabled={showLoading || (isGuest ? false : rateLimited)}
            rows={1}
            style={{
              flex:       '1 1 auto',
              resize:     'none',
              border:     'none',
              outline:    'none',
              background: 'transparent',
              fontFamily: ASSIST,
              fontSize:   '14px',
              color:      PARCH,
              lineHeight: '1.5',
              maxHeight:  '120px',
              cursor:     (!isGuest && rateLimited) ? 'not-allowed' : 'text',
              direction:  isRTL ? 'rtl' : 'ltr',
              textAlign:  isRTL ? 'right' : 'left',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label={t('sendButton')}
            style={{
              flexShrink:      0,
              width:           '44px',
              height:          '44px',
              borderRadius:    '8px',
              border:          'none',
              backgroundColor: GOLD,
              color:           '#142B16',
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
