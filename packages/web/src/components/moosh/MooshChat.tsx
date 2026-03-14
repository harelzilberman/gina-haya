import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { MooshMessage } from '@gina-haya/shared';
import { useMoosh } from '../../hooks/useMoosh';
import { MooshGreeting } from './MooshGreeting';
import { RateLimitBanner } from './RateLimitBanner';

const MOON_GOLD   = '#B7924A';
const NAVY        = '#1B2A4A';
const SAGE        = '#4A7C59';

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ backgroundColor: MOON_GOLD }}
          aria-hidden="true"
        >
          🌕
        </div>
        <div
          className="rounded-2xl rounded-bl-none px-4 py-3"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(74,124,89,0.3)' }}
          aria-label="מוש חושב"
        >
          <div className="flex gap-1 items-center h-4">
            {[0, 150, 300].map(delay => (
              <span
                key={delay}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: SAGE, animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({
  message,
  isRTL,
}: {
  message: MooshMessage;
  isRTL: boolean;
}) {
  const isUser = message.role === 'user';

  // In RTL: user = flex-end (visual left), moosh = flex-start (visual right)
  // In LTR: user = flex-end (visual right), moosh = flex-start (visual left)
  // justify-end / justify-start handle this automatically with CSS direction
  const rowJustify = isUser ? 'justify-end' : 'justify-start';

  // Bubble corner: remove the corner closest to the edge the bubble sits on
  // RTL: user is at left  → remove top-right corner (closest to center gap)
  //       moosh is at right → remove top-left corner
  // LTR: user is at right → remove top-left corner
  //       moosh is at left  → remove top-right corner
  const userCorner  = isRTL ? 'rounded-tr-none' : 'rounded-tl-none';
  const mooshCorner = isRTL ? 'rounded-tl-none' : 'rounded-tr-none';
  const cornerClass = isUser ? userCorner : mooshCorner;

  return (
    <div className={`flex ${rowJustify}`}>
      <div className={`flex items-end gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Moosh avatar — only on assistant messages */}
        {!isUser && (
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm mb-0.5"
            style={{ backgroundColor: MOON_GOLD }}
            aria-hidden="true"
          >
            🌕
          </div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl ${cornerClass} px-4 py-2.5 text-sm leading-relaxed`}
          style={
            isUser
              ? { backgroundColor: NAVY, color: '#FFFFFF' }
              : {
                  backgroundColor: '#FFFFFF',
                  border:          '1px solid rgba(74,124,89,0.3)',
                  color:           NAVY,
                }
          }
        >
          {/* Preserve line breaks from Shift+Enter */}
          {message.content.split('\n').map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main chat component ───────────────────────────────────────────────────────
export function MooshChat() {
  const { t, i18n } = useTranslation('moosh');
  const isRTL = i18n.language === 'he';

  const {
    messages,
    isLoading,
    error,
    rateLimited,
    rateLimitTier,
    sendMessage,
    clearError,
  } = useMoosh();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom whenever messages update or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || rateLimited) return;
    setInput('');
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea up to ~5 lines
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    if (error) clearError();
  };

  const canSend = input.trim().length > 0 && !isLoading && !rateLimited;

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: '#F8F9FA' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 bg-white"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{ backgroundColor: MOON_GOLD }}
          aria-hidden="true"
        >
          🌕
        </div>
        <div>
          <h2 className="font-bold text-sm leading-none" style={{ color: NAVY }}>
            {t('title')}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* ── Message list ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && !isLoading && <MooshGreeting />}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} isRTL={isRTL} />
        ))}

        {isLoading && <TypingDots />}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Rate limit banner ────────────────────────────────────────────── */}
      {rateLimited && <RateLimitBanner tier={rateLimitTier} />}

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <p className="mx-4 mb-2 text-xs text-center" style={{ color: '#A33030' }}>
          {error}
        </p>
      )}

      {/* ── Disclaimer ──────────────────────────────────────────────────── */}
      <p className="text-xs text-center px-4 py-1.5" style={{ color: '#9CA3AF' }}>
        {t('disclaimer')}
      </p>

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <div
          className="flex items-end gap-2 bg-white rounded-xl px-3 py-2"
          style={{
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            border:    '1px solid rgba(74,124,89,0.2)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={rateLimited ? '' : t('inputPlaceholder')}
            disabled={isLoading || rateLimited}
            rows={1}
            className="flex-1 resize-none outline-none text-sm bg-transparent py-1"
            style={{
              color:           NAVY,
              lineHeight:      '1.5',
              maxHeight:       '120px',
              cursor:          rateLimited ? 'not-allowed' : 'text',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label={t('sendButton')}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-base transition-opacity"
            style={{
              backgroundColor: SAGE,
              opacity:         canSend ? 1 : 0.4,
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
