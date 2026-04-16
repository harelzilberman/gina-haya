import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import i18n from '../i18n';

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const FOREST = '#142B16';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = '"Assistant", "Heebo", sans-serif';

interface Video {
  id: string;
  titleHe: string;
  descHe: string;
  category: string;
  format: 'yt' | 'reel' | 'both';
  duration: string;
  youtubeId?: string;
  thumbnail?: string;
  comingSoon?: boolean;
}

const CATEGORIES = [
  { id: 'fertilizer', labelHe: '🌿 דשנים טבעיים' },
  { id: 'pest',       labelHe: '🐛 הדברה אורגנית' },
  { id: 'compost',    labelHe: '♻️ קומפוסט' },
  { id: 'bd',         labelHe: '🌕 פרפרטים ביודינמיים' },
  { id: 'companion',  labelHe: '🤝 שיתופי פעולה' },
  { id: 'technique',  labelHe: '🌱 טכניקות גינון' },
];

const VIDEOS: Video[] = [
  // Fertilizer
  { id: 'f1', titleHe: 'תה קומפוסט — הכנה ושימון', descHe: 'איך להכין תה קומפוסט ביתי ולהשתמש בו כדשן נוזלי לגינה', category: 'fertilizer', format: 'both', duration: '3:20', youtubeId: 'dQw4w9WgXcQ' },
  { id: 'f2', titleHe: 'ריסוס אצות ים', descHe: 'מתכון פשוט לנוזל ריסוס מאצות ים לחיזוק הצמחים', category: 'fertilizer', format: 'reel', duration: '1:00', comingSoon: true },
  { id: 'f3', titleHe: 'דשן ירוק — כיסוי אדמה', descHe: 'כיצד לגדל ולשלב דשן ירוק בגינה הביודינמית', category: 'fertilizer', format: 'yt', duration: '8:15', comingSoon: true },
  { id: 'f4', titleHe: 'שתן מדולל כדשן', descHe: 'השימון בשתן מדולל כדשן טבעי עשיר באזוט', category: 'fertilizer', format: 'reel', duration: '0:45', comingSoon: true },

  // Pest control
  { id: 'p1', titleHe: 'שמן נים — מתכון בסיסי', descHe: 'הכנת תרסיס שמן נים אורגני להדברת מזיקים', category: 'pest', format: 'both', duration: '2:30', youtubeId: 'dQw4w9WgXcQ' },
  { id: 'p2', titleHe: 'חיפושיות טובות לגינה', descHe: 'כיצד למשוך חיפושיות אבקניות וציד טבעיות לגינה', category: 'pest', format: 'reel', duration: '1:00', comingSoon: true },
  { id: 'p3', titleHe: 'מלכודות צהובות דביקות', descHe: 'שימון במלכודות דביקות לניטור ולכידת מזיקים', category: 'pest', format: 'reel', duration: '0:30', comingSoon: true },
  { id: 'p4', titleHe: 'צמחי מלווים להדברה', descHe: 'אילו צמחים להשתיל לידי כדי לדחות מזיקים', category: 'pest', format: 'yt', duration: '6:00', comingSoon: true },

  // Compost
  { id: 'c1', titleHe: 'ערימת קומפוסט — איך מתחילים', descHe: 'מדריך מלא לבניית ערימת קומפוסט ביתית', category: 'compost', format: 'yt', duration: '10:30', youtubeId: 'dQw4w9WgXcQ' },
  { id: 'c2', titleHe: 'ורמיקומפוסט בבית', descHe: 'גידול תולעים בבית לייצור קומפוסט עשיר', category: 'compost', format: 'both', duration: '3:00', comingSoon: true },
  { id: 'c3', titleHe: 'מה לא לשים בקומפוסט', descHe: 'הטעויות הנפוצות ואיך להימנע מהן', category: 'compost', format: 'reel', duration: '0:45', comingSoon: true },

  // BD preparations
  { id: 'bd1', titleHe: 'BD 500 — קרן הזבל', descHe: 'הכנה ושימון בפרפרט ביודינמי 500', category: 'bd', format: 'yt', duration: '12:00', youtubeId: 'dQw4w9WgXcQ' },
  { id: 'bd2', titleHe: 'BD 501 — קרן הסיליקה', descHe: 'הכנה ושימון בפרפרט ביודינמי 501', category: 'bd', format: 'yt', duration: '8:00', comingSoon: true },
  { id: 'bd3', titleHe: 'CPP — תמצית גללים', descHe: 'הכנת ושימון ב-CPP לחיזוק החיות בקרקע', category: 'bd', format: 'reel', duration: '1:00', comingSoon: true },
  { id: 'bd4', titleHe: 'הלוח הביודינמי — איך קוראים', descHe: 'מדריך מעשי לקריאת הלוח הביודינמי', category: 'bd', format: 'both', duration: '4:00', comingSoon: true },

  // Companions
  { id: 'co1', titleHe: 'עגבנייה + בזיליקום', descHe: 'שיתוף הפעולה הקלאסי — למה זה עובד', category: 'companion', format: 'reel', duration: '0:45', youtubeId: 'dQw4w9WgXcQ' },
  { id: 'co2', titleHe: '3 האחיות — תירס, שעועית, דלעת', descHe: 'השיטה העתיקה של גידול שלושה צמחים ביחד', category: 'companion', format: 'yt', duration: '7:00', comingSoon: true },
  { id: 'co3', titleHe: 'פרחים בין הירקות', descHe: 'אילו פרחים להשתיל בגינת ירק ולמה', category: 'companion', format: 'reel', duration: '1:00', comingSoon: true },

  // Techniques
  { id: 't1', titleHe: 'גיזום עצי פרי — בסיסי', descHe: 'מדריך גיזום לעצי פרי בחורף', category: 'technique', format: 'yt', duration: '15:00', youtubeId: 'dQw4w9WgXcQ' },
  { id: 't2', titleHe: 'הכנת ערוגה לזריעה', descHe: 'שלבי הכנת הקרקע לפני זריעה ושתילה', category: 'technique', format: 'both', duration: '3:00', comingSoon: true },
  { id: 't3', titleHe: 'השקיה בטפטוף — התקנה', descHe: 'כיצד להתקין מערכת טפטוף חסכונית', category: 'technique', format: 'yt', duration: '10:00', comingSoon: true },
  { id: 't4', titleHe: 'ריבוי מחוטרים', descHe: 'הכנת שתלים מחוטרים מהורים קיימים', category: 'technique', format: 'reel', duration: '1:00', comingSoon: true },
  { id: 't5', titleHe: 'מולצ׳ינג — כיסוי קרקע', descHe: 'שיטות כיסוי קרקע לשמירת לחות ועצירת עשבים', category: 'technique', format: 'reel', duration: '0:45', comingSoon: true },
];

// ── Content catalog ────────────────────────────────────────────────────────
interface GuideContent {
  video?:       { youtubeId: string; duration: string };
  article?:     { slug: string; ready: boolean };
  comingSoon?:  string[];
}

const GUIDE_CONTENT: Record<string, GuideContent> = {
  // Fertilizer
  f1:  { video: { youtubeId: 'dQw4w9WgXcQ', duration: '3:20' }, article: { slug: 'compost-tea', ready: true }, comingSoon: ['וובינר חי'] },
  f2:  { article: { slug: 'seaweed-spray', ready: true }, comingSoon: ['סרטון', 'וובינר'] },
  f3:  { article: { slug: 'green-manure', ready: true }, comingSoon: ['סרטון'] },
  f4:  { comingSoon: ['סרטון', 'מאמר'] },
  // Pest control
  p1:  { video: { youtubeId: 'dQw4w9WgXcQ', duration: '2:30' }, article: { slug: 'neem-oil', ready: true }, comingSoon: ['וובינר'] },
  p2:  { comingSoon: ['סרטון', 'מאמר'] },
  p3:  { comingSoon: ['סרטון', 'מאמר'] },
  p4:  { comingSoon: ['סרטון', 'מאמר'] },
  // Compost
  c1:  { video: { youtubeId: 'dQw4w9WgXcQ', duration: '10:30' }, article: { slug: 'compost-pile', ready: true } },
  c2:  { article: { slug: 'vermicompost', ready: true }, comingSoon: ['סרטון'] },
  c3:  { article: { slug: 'compost-dont', ready: true }, comingSoon: ['סרטון'] },
  // BD preparations
  bd1: { video: { youtubeId: 'dQw4w9WgXcQ', duration: '12:00' }, article: { slug: 'bd500', ready: true } },
  bd2: { article: { slug: 'bd501', ready: true }, comingSoon: ['סרטון'] },
  bd3: { article: { slug: 'cpp', ready: true }, comingSoon: ['סרטון'] },
  bd4: { article: { slug: 'biodynamic-calendar', ready: true }, comingSoon: ['סרטון'] },
  // Companions
  co1: { video: { youtubeId: 'dQw4w9WgXcQ', duration: '0:45' }, article: { slug: 'tomato-basil', ready: true } },
  co2: { article: { slug: 'three-sisters', ready: true }, comingSoon: ['סרטון'] },
  co3: { article: { slug: 'flowers-vegetables', ready: true }, comingSoon: ['סרטון'] },
  // Techniques
  t1:  { video: { youtubeId: 'dQw4w9WgXcQ', duration: '15:00' }, comingSoon: ['מאמר'] },
  t2:  { comingSoon: ['סרטון', 'מאמר'] },
  t3:  { comingSoon: ['סרטון', 'מאמר'] },
  t4:  { comingSoon: ['סרטון', 'מאמר'] },
  t5:  { comingSoon: ['סרטון', 'מאמר'] },
};

const SUBJECT_MODAL_CSS = `
@keyframes subjectModalIn {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

function VideoCard({ video, onClick }: { video: Video; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  const thumbnailUrl = video.youtubeId
    ? `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`
    : `https://placehold.co/320x180/142B16/F5C840?text=${encodeURIComponent(video.titleHe)}`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width: '220px',
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        position: 'relative',
        width: '220px',
        height: '124px',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'rgba(20,43,22,0.6)',
        border: `1px solid ${hovered ? 'rgba(245,200,64,0.4)' : 'rgba(245,200,64,0.1)'}`,
        transition: 'border-color 0.2s',
      }}>
        <img
          src={thumbnailUrl}
          alt={video.titleHe}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: video.comingSoon ? 0.4 : 0.9 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {/* Play button */}
        {!video.comingSoon && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(245,200,64,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 0, height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderLeft: `14px solid ${FOREST}`,
                marginInlineStart: '3px',
              }} />
            </div>
          </div>
        )}
        {/* Coming soon badge */}
        {video.comingSoon && (
          <div style={{
            position: 'absolute', top: '8px', insetInlineStart: '8px',
            background: 'rgba(20,43,22,0.9)',
            border: '1px solid rgba(245,200,64,0.3)',
            borderRadius: '4px', padding: '2px 8px',
            fontFamily: ASSIST, fontSize: '10px', color: 'rgba(237,224,196,0.7)',
          }}>
            בקרוב
          </div>
        )}
        {/* Format badge */}
        <div style={{
          position: 'absolute', bottom: '6px', insetInlineEnd: '6px',
          background: 'rgba(0,0,0,0.7)', borderRadius: '3px',
          padding: '1px 6px', fontFamily: ASSIST, fontSize: '10px',
          color: video.format === 'yt' ? '#ff6b6b' : video.format === 'reel' ? '#f9a8d4' : GOLD,
        }}>
          {video.format === 'yt' ? 'YouTube' : video.format === 'reel' ? 'Reel' : 'YT + Reel'}
        </div>
        {/* Duration */}
        <div style={{
          position: 'absolute', bottom: '6px', insetInlineStart: '6px',
          background: 'rgba(0,0,0,0.7)', borderRadius: '3px',
          padding: '1px 6px', fontFamily: ASSIST, fontSize: '10px', color: 'rgba(237,224,196,0.7)',
        }}>
          {video.duration}
        </div>
      </div>

      {/* Title */}
      <p style={{
        fontFamily: FRANK, fontSize: '13px', color: hovered ? GOLD : PARCH,
        margin: '8px 0 2px', lineHeight: 1.4,
        transition: 'color 0.2s',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {video.titleHe}
      </p>
      <p style={{
        fontFamily: ASSIST, fontSize: '11px', color: 'rgba(237,224,196,0.45)',
        margin: 0, lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {video.descHe}
      </p>
    </div>
  );
}

function VideoRow({ category, videos, onSelect }: {
  category: typeof CATEGORIES[0];
  videos: Video[];
  onSelect: (v: Video) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 'left' | 'right') {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' });
    }
  }

  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{
        fontFamily: FRANK, fontSize: '18px', color: GOLD,
        margin: '0 0 16px', fontWeight: 700,
      }}>
        {category.labelHe}
      </h2>
      <div style={{ position: 'relative' }}>
        {/* Scroll left */}
        <button
          onClick={() => scroll('left')}
          style={{
            position: 'absolute', insetInlineStart: '-16px', top: '50px',
            zIndex: 10, width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(20,43,22,0.9)', border: '1px solid rgba(245,200,64,0.2)',
            color: GOLD, cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >‹</button>
        {/* Videos row */}
        <div
          ref={rowRef}
          style={{
            display: 'flex', gap: '14px',
            overflowX: 'auto', paddingBottom: '8px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {videos.map(v => (
            <VideoCard key={v.id} video={v} onClick={() => onSelect(v)} />
          ))}
        </div>
        {/* Scroll right */}
        <button
          onClick={() => scroll('right')}
          style={{
            position: 'absolute', insetInlineEnd: '-16px', top: '50px',
            zIndex: 10, width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(20,43,22,0.9)', border: '1px solid rgba(245,200,64,0.2)',
            color: GOLD, cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >›</button>
      </div>
    </div>
  );
}

function VideoModal({ video, onClose }: { video: Video; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(8,18,10,0.92)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, rgba(24,52,26,0.99), rgba(20,43,22,0.99))',
          border: '1px solid rgba(245,200,64,0.15)',
          borderRadius: '16px', overflow: 'hidden',
          width: '100%', maxWidth: '680px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Video embed or coming soon */}
        {video.youtubeId && !video.comingSoon ? (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        ) : (
          <div style={{
            height: '240px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,25,12,0.8)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
            <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: '0 0 8px' }}>
              הסרטון בהכנה
            </p>
            <p style={{ fontFamily: ASSIST, fontSize: '13px', color: 'rgba(237,224,196,0.5)', margin: 0 }}>
              מגיע בקרוב — עוקבים אחרינו ביוטיוב?
            </p>
          </div>
        )}
        {/* Info */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <h3 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: 0 }}>
              {video.titleHe}
            </h3>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'rgba(237,224,196,0.5)', cursor: 'pointer', fontSize: '20px', flexShrink: 0 }}
            >✕</button>
          </div>
          <p style={{ fontFamily: ASSIST, fontSize: '14px', color: 'rgba(237,224,196,0.7)', margin: '10px 0 16px', lineHeight: 1.6 }}>
            {video.descHe}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: ASSIST, fontSize: '12px', padding: '4px 12px',
              borderRadius: '99px', border: '1px solid rgba(245,200,64,0.25)',
              color: GOLD, background: 'rgba(245,200,64,0.08)',
            }}>
              {video.format === 'yt' ? '▶ YouTube' : video.format === 'reel' ? '📱 Reel' : '▶ YouTube + 📱 Reel'}
            </span>
            <span style={{
              fontFamily: ASSIST, fontSize: '12px', padding: '4px 12px',
              borderRadius: '99px', border: '1px solid rgba(237,224,196,0.15)',
              color: 'rgba(237,224,196,0.6)',
            }}>
              ⏱ {video.duration}
            </span>
          </div>
          {/* YouTube subscribe CTA */}
          {video.comingSoon && (
            <a
              href="https://youtube.com/@ginahaya"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', marginTop: '16px',
                fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                color: FOREST, background: GOLD,
                padding: '10px 24px', borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              🔔 עקבו בYouTube לעדכון
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subject popup modal ─────────────────────────────────────────────────────
function SubjectModal({
  video,
  onClose,
  onPlayVideo,
  onOpenArticle,
}: {
  video: Video;
  onClose: () => void;
  onPlayVideo: (v: Video) => void;
  onOpenArticle: (slug: string) => void;
}) {
  const [articleMsg, setArticleMsg] = useState(false);

  const content    = GUIDE_CONTENT[video.id] ?? { comingSoon: ['סרטון', 'מאמר', 'וובינר'] };
  const category   = CATEGORIES.find(c => c.id === video.category);
  const thumbUrl   = video.youtubeId
    ? `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`
    : `https://placehold.co/500x280/142B16/F5C840?text=${encodeURIComponent(video.titleHe)}`;

  const rowBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 18px',
    borderRadius: '10px',
    marginBottom: '8px',
    transition: 'transform 0.15s, background 0.15s',
    border: '1px solid rgba(245,200,64,0.08)',
  };

  return (
    <>
      <style>{SUBJECT_MODAL_CSS}</style>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
      >
        {/* Modal card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(145deg, rgba(28,58,30,0.97), rgba(15,35,17,0.99))',
            border: '1px solid rgba(245,200,64,0.2)',
            borderRadius: '16px', overflow: 'hidden',
            maxWidth: '500px', width: '92%',
            maxHeight: '90vh', overflowY: 'auto',
            direction: 'rtl',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            animation: 'subjectModalIn 0.2s ease-out',
          }}
        >
          {/* Thumbnail */}
          <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
            <img
              src={thumbUrl}
              alt={video.titleHe}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
              onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(15,35,17,0) 30%, rgba(15,35,17,0.97) 100%)',
            }} />
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '12px', left: '12px',
                background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', color: PARCH, cursor: 'pointer',
                fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
            {/* Title overlay */}
            <div style={{ position: 'absolute', bottom: '16px', right: '18px', left: '18px' }}>
              <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: '0 0 6px', lineHeight: 1.2 }}>
                {video.titleHe}
              </h2>
              {category && (
                <span style={{
                  fontFamily: ASSIST, fontSize: '11px',
                  background: 'rgba(245,200,64,0.12)', color: GOLD,
                  border: '1px solid rgba(245,200,64,0.25)',
                  borderRadius: '99px', padding: '2px 10px',
                }}>
                  {category.labelHe}
                </span>
              )}
            </div>
          </div>

          {/* Content options */}
          <div style={{ padding: '20px 18px' }}>
            <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}55`, margin: '0 0 14px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              תוכן זמין
            </p>

            {/* Video row */}
            {content.video && (
              <div
                onClick={() => { onClose(); onPlayVideo(video); }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.01)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(245,200,64,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                }}
                style={{ ...rowBase, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '26px', flexShrink: 0 }}>🎬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FRANK, fontSize: '15px', color: GOLD }}>סרטון הדרכה</div>
                  <div style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}55` }}>⏱ {content.video.duration}</div>
                </div>
                <span style={{ color: GOLD, fontSize: '20px', flexShrink: 0 }}>▶</span>
              </div>
            )}

            {/* Article row */}
            {content.article && (
              <div
                onClick={() => {
                  if (content.article!.ready) {
                    onClose();
                    onOpenArticle(content.article!.slug);
                  } else {
                    setArticleMsg(true);
                    setTimeout(() => setArticleMsg(false), 2500);
                  }
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.01)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(245,200,64,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                }}
                style={{ ...rowBase, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '26px', flexShrink: 0 }}>📖</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FRANK, fontSize: '15px', color: content.article.ready ? GOLD : PARCH }}>
                    מאמר מפורט
                  </div>
                  <div style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}55` }}>על ידי צ'ופצ'ו</div>
                </div>
                {content.article.ready ? (
                  <span style={{ color: GOLD, fontSize: '20px', flexShrink: 0 }}>→</span>
                ) : (
                  <span style={{
                    fontFamily: ASSIST, fontSize: '10px',
                    background: 'rgba(245,200,64,0.1)', color: GOLD,
                    border: '1px solid rgba(245,200,64,0.2)',
                    borderRadius: '4px', padding: '2px 7px', flexShrink: 0,
                  }}>בקרוב</span>
                )}
              </div>
            )}

            {/* Article "in progress" feedback */}
            {articleMsg && (
              <div style={{
                fontFamily: ASSIST, fontSize: '12px', color: GOLD,
                textAlign: 'center', padding: '6px 0 2px',
                animation: 'subjectModalIn 0.15s ease-out',
              }}>
                ✏️ המאמר בהכנה — יגיע בקרוב!
              </div>
            )}

            {/* Coming soon rows */}
            {content.comingSoon?.map(item => (
              <div
                key={item}
                style={{ ...rowBase, background: 'rgba(255,255,255,0.02)', opacity: 0.4, cursor: 'default' }}
              >
                <span style={{ fontSize: '26px', flexShrink: 0 }}>🔜</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FRANK, fontSize: '15px', color: PARCH }}>{item}</div>
                </div>
                <span style={{
                  fontFamily: ASSIST, fontSize: '10px',
                  background: 'rgba(255,255,255,0.08)', color: `${PARCH}60`,
                  borderRadius: '4px', padding: '2px 7px', flexShrink: 0,
                }}>בקרוב</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 18px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '22px' }}>🌕</span>
              <span style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}50` }}>
                צ'ופצ'ו ממליץ על התוכן הזה 🌿
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}70`,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


function CrossNavLink({ to, label }: { to: string; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontFamily: ASSIST, fontSize: '13px',
        color: GOLD,
        background: hovered ? 'rgba(245,200,64,0.14)' : 'rgba(245,200,64,0.07)',
        border: `1px solid ${hovered ? 'rgba(245,200,64,0.4)' : 'rgba(245,200,64,0.2)'}`,
        borderRadius: '99px',
        padding: '7px 18px',
        textDecoration: 'none',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {label}
    </Link>
  );
}

export function GuidesPage() {
  const navigate = useNavigate();
  const [subjectVideo, setSubjectVideo] = useState<Video | null>(null);  // subject popup
  const [playVideo,    setPlayVideo]    = useState<Video | null>(null);  // YouTube embed
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredCategories = activeFilter === 'all'
    ? CATEGORIES
    : CATEGORIES.filter(c => c.id === activeFilter);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0e1e0f 0%, #142B16 30%, #0a1a0c 100%)',
        padding: '40px 48px 60px',
        fontFamily: ASSIST,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: FRANK, fontSize: '32px', color: GOLD, margin: '0 0 8px' }}>
          🎬 מדריכי גינה
        </h1>
        <p style={{ fontFamily: ASSIST, fontSize: '15px', color: 'rgba(237,224,196,0.6)', margin: 0 }}>
          סרטונים מעשיים לגינון ביודינמי — טבעי, חי ונושם
        </p>
      </div>

      {/* Cross-nav to articles */}
      <div style={{ marginBottom: '28px' }}>
        <CrossNavLink to="/articles" label="📖 למאמרים ←" />
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '36px' }}>
        {[{ id: 'all', labelHe: '✨ הכל' }, ...CATEGORIES].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(cat.id)}
            style={{
              fontFamily: ASSIST, fontSize: '13px',
              padding: '6px 16px', borderRadius: '99px',
              border: `1px solid ${activeFilter === cat.id ? GOLD : 'rgba(245,200,64,0.2)'}`,
              background: activeFilter === cat.id ? 'rgba(245,200,64,0.15)' : 'transparent',
              color: activeFilter === cat.id ? GOLD : 'rgba(237,224,196,0.6)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {cat.labelHe}
          </button>
        ))}
      </div>

      {/* Netflix rows */}
      {filteredCategories.map(cat => {
        const videos = VIDEOS.filter(v => v.category === cat.id);
        if (videos.length === 0) return null;
        return (
          <VideoRow
            key={cat.id}
            category={cat}
            videos={videos}
            onSelect={setSubjectVideo}
          />
        );
      })}

      {/* Subject popup */}
      {subjectVideo && (
        <SubjectModal
          video={subjectVideo}
          onClose={() => setSubjectVideo(null)}
          onPlayVideo={v => { setSubjectVideo(null); setPlayVideo(v); }}
          onOpenArticle={slug => { setSubjectVideo(null); navigate('/articles/' + slug); }}
        />
      )}

      {/* YouTube embed modal */}
      {playVideo && (
        <VideoModal video={playVideo} onClose={() => setPlayVideo(null)} />
      )}


    </div>
  );
}
