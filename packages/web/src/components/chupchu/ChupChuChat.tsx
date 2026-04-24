import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import type { ChupChuMessage } from '@gina-haya/shared';
import { useChupChu } from '../../hooks/useChupChu';
import { ChupChuGreeting } from './ChupChuGreeting';
import { RateLimitBanner } from './RateLimitBanner';

// ── Design tokens ────────────────────────────────────────────────────────────
const GOLD     = '#F5C840';
const PARCH    = '#EDE0C4';
const SAGE     = '#7DC084';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST   = '"Assistant", "Heebo", sans-serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

const CHAT_CSS = `
@keyframes chupchu-bounce {
  0%, 80%, 100% { transform: translateY(0);   }
  40%           { transform: translateY(-5px); }
}
@keyframes chupchu-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(245,200,64,0.25); }
  50%      { box-shadow: 0 0 18px rgba(245,200,64,0.5); }
}
.chupchu-dot { animation: chupchu-bounce 1.4s ease-in-out infinite; }
.chupchu-avatar-pulse { animation: chupchu-glow 3s ease-in-out infinite; }
.chupchu-textarea::placeholder { color: rgba(237,224,196,0.3); }
.chupchu-textarea:focus { border-color: rgba(245,200,64,0.4) !important; outline: none; }
.chupchu-scroll::-webkit-scrollbar { width: 4px; }
.chupchu-scroll::-webkit-scrollbar-track { background: transparent; }
.chupchu-scroll::-webkit-scrollbar-thumb { background: rgba(125,192,132,0.2); border-radius: 2px; }
`;

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots({ isRTL }: { isRTL: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        <div
          style={{
            flexShrink:      0,
            width:           '28px',
            height:          '28px',
            borderRadius:    '50%',
            background:      `radial-gradient(circle at 40% 40%, #F5D060, ${GOLD}, #C8960A)`,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        '14px',
            lineHeight:      1,
          }}
          aria-hidden="true"
        >
          🌕
        </div>
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

  // In RTL: start = right, end = left
  // User on RIGHT (start in RTL), ChupChu on LEFT (end in RTL)
  const rowJustify = isRTL
    ? (isUser ? 'flex-start' : 'flex-end')
    : (isUser ? 'flex-end'   : 'flex-start');

  // Corner closest to the edge the bubble sits on — remove it for "tail" effect
  const userCorner  = isRTL
    ? { borderTopRightRadius: '4px' }   // user on right in RTL
    : { borderTopLeftRadius:  '4px' };  // user on right in LTR
  const chupChuCorner = isRTL
    ? { borderTopLeftRadius:  '4px' }   // chupchu on left in RTL
    : { borderTopRightRadius: '4px' };  // chupchu on left in LTR

  return (
    <div style={{ display: 'flex', justifyContent: rowJustify }}>
      <div style={{
        display:    'flex',
        alignItems: 'flex-end',
        gap:        '8px',
        maxWidth:   '80%',
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

// ── Main chat ─────────────────────────────────────────────────────────────────
interface ChupChuChatProps {
  compact?: boolean;
  initialMessage?: string;
  onInitialMessageConsumed?: () => void;
}

export function ChupChuChat({ compact, initialMessage, onInitialMessageConsumed }: ChupChuChatProps = {}) {
  const { t } = useTranslation('chupchu');
  const { dir, isRTL } = useDirection();

  const {
    messages,
    isLoading,
    error,
    rateLimited,
    rateLimitTier,
    sendMessage,
    clearError,
  } = useChupChu();

  const [input, setInput]      = useState('');
  const messagesEndRef         = useRef<HTMLDivElement>(null);
  const textareaRef            = useRef<HTMLTextAreaElement>(null);

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
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || rateLimited) return;
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

  const canSend = input.trim().length > 0 && !isLoading && !rateLimited;

  return (
    <>
      <style>{CHAT_CSS}</style>

      <div dir={dir} style={{
        display:       'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(28,58,30,0.5)',
        border:        '1px solid rgba(125,192,132,0.1)',
        borderRadius:  '16px',
        overflow:      'hidden',
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
          <div
            className="chupchu-avatar-pulse"
            aria-hidden="true"
            style={{
              flexShrink:      0,
              width:           '40px',
              height:          '40px',
              borderRadius:    '50%',
              background:      `radial-gradient(circle at 40% 40%, #F5D060, ${GOLD}, #C8960A)`,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontSize:        '20px',
              lineHeight:      1,
            }}
          >
            🌕
          </div>
          <div>
            <h2 style={{
              fontFamily:  FRANK,
              fontWeight:  700,
              fontSize:    '16px',
              color:       GOLD,
              margin:      0,
              lineHeight:  1.2,
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
            flex:      '1 1 auto',
            overflowY: 'auto',
            padding:   '20px 16px',
            minHeight: compact ? '160px' : '400px',
            maxHeight: compact ? '280px' : '520px',
            display:   'flex',
            flexDirection: 'column',
            gap:       '12px',
          }}
        >
          {messages.length === 0 && !isLoading && <ChupChuGreeting />}

          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} isRTL={isRTL} />
          ))}

          {isLoading && <TypingDots isRTL={isRTL} />}

          <div ref={messagesEndRef} />
        </div>

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
          fontFamily:  ASSIST,
          fontWeight:  300,
          fontSize:    '11px',
          textAlign:   isRTL ? 'right' : 'left',
          color:       `${PARCH}40`,
          padding:     '6px 16px 0',
          margin:      0,
        }}>
          {t('disclaimer')}
        </p>

        {/* Input bar */}
        <div style={{
          padding:         '12px 14px 14px',
          backgroundColor: 'rgba(20,43,22,0.9)',
          borderTop:       '1px solid rgba(125,192,132,0.1)',
        }}>
          <div style={{
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
              placeholder={rateLimited ? '' : t('inputPlaceholder')}
              disabled={isLoading || rateLimited}
              rows={1}
              style={{
                flex:        '1 1 auto',
                resize:      'none',
                border:      'none',
                outline:     'none',
                background:  'transparent',
                fontFamily:  ASSIST,
                fontSize:    '14px',
                color:       PARCH,
                lineHeight:  '1.5',
                maxHeight:   '120px',
                cursor:      rateLimited ? 'not-allowed' : 'text',
                direction:   isRTL ? 'rtl' : 'ltr',
                textAlign:   isRTL ? 'right' : 'left',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              aria-label={t('sendButton')}
              style={{
                flexShrink:      0,
                width:           '36px',
                height:          '36px',
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

      </div>
    </>
  );
}
