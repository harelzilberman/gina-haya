import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTrackerStore, type CheckinResult } from '../../stores/trackerStore';
import { MAX_PHOTO_SIZE_BYTES, MAX_PHOTO_SIZE_LABEL } from '@gina-haya/shared';

const EARTH = '#142B16';
const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = '"Assistant", "Heebo", sans-serif';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MOOSH_PULSE_CSS = `
@keyframes monPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.12); opacity: 0.8; }
}
.mon-pulse { animation: monPulse 1.6s ease-in-out infinite; }
`;

interface Props {
  trackerId: string;
  plantNameHe: string;
  onClose: () => void;
  onComplete: (result: CheckinResult) => void;
}

export function PhotoUpload({ trackerId, plantNameHe, onClose, onComplete }: Props) {
  const { addCheckin, isAnalyzing } = useTrackerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [analysisLimitError, setAnalysisLimitError] = useState<{ resetDate: string } | null>(null);

  function processFile(file: File) {
    setError('');
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('קבצים מותרים: JPG, PNG, WEBP בלבד');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setError(`התמונה גדולה מדי. אנא בחר תמונה קטנה מ-${MAX_PHOTO_SIZE_LABEL}`);
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      // Extract raw base64 (after the "data:image/xxx;base64," prefix)
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
      setMimeType(file.type);
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleSubmit() {
    if (!imageBase64 || !mimeType) {
      setError('יש לבחור תמונה תחילה');
      return;
    }
    setError('');
    try {
      const result = await addCheckin(trackerId, imageBase64, mimeType, notes || undefined);
      onComplete(result);
    } catch (err: any) {
      if (err.errorCode === 'analysis_limit_reached') {
        const resetsAt = err.limitData?.resetsAt;
        const resetDate = resetsAt
          ? new Date(resetsAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })
          : 'תחילת החודש הבא';
        setAnalysisLimitError({ resetDate });
      } else if (err.message === 'limit_exceeded') {
        const { tier, limit, limitType } = err.limitData ?? {};
        if (limitType === 'checkins' || limitType === 'checkins_monthly') {
          setError(`הגעת למגבלת הבדיקות בתכנית ${tier}. שדרג לקבלת עוד ניתוחים.`);
        } else {
          setError('הגעת למגבלת המעקבים. שדרג לקבלת עוד מעקבים.');
        }
      } else {
        const isNetworkError = !navigator.onLine
          || err.message?.includes('Failed to fetch')
          || err.message?.includes('NetworkError')
          || err.message?.includes('net::');
        if (isNetworkError) {
          setError('לא ניתן להתחבר לשרת. בדוק את החיבור לאינטרנט ונסה שוב.');
        } else {
          const ERROR_MESSAGES: Record<string, string> = {
            api_unavailable: 'השירות אינו זמין כרגע. נסה שוב מאוחר יותר.',
            image_too_large: 'התמונה גדולה מדי לניתוח.',
            analysis_failed: 'לא הצלחנו לנתח את התמונה. נסה תמונה אחרת.',
            unknown:         'אירעה שגיאה. נסה שוב.',
          };
          setError(ERROR_MESSAGES[err.errorCode] ?? err.message ?? ERROR_MESSAGES.unknown);
        }
      }
    }
  }

  return (
    <>
      <style>{MOOSH_PULSE_CSS}</style>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          padding: '16px',
        }}
        onClick={e => { if (!isAnalyzing && e.target === e.currentTarget) onClose(); }}
      >
        <div
          style={{
            backgroundColor: '#1a3a1c',
            border: '1px solid rgba(245,200,64,0.2)',
            borderRadius: '12px',
            padding: '28px 24px',
            width: '100%',
            maxWidth: '460px',
            maxHeight: '90vh',
            overflowY: 'auto',
            direction: 'rtl',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
              בדיקת {plantNameHe}
            </h2>
            {!isAnalyzing && (
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'rgba(237,224,196,0.5)', cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Analyzing state */}
          {analysisLimitError ? (
            <div style={{
              textAlign: 'center', padding: '24px 8px',
              display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center',
            }}>
              <div style={{ fontSize: '48px' }}>🔬</div>
              <p style={{ fontFamily: FRANK, fontSize: '18px', color: GOLD, margin: 0 }}>
                הגעת למגבלת 30 ניתוחי AI לחודש זה
              </p>
              <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}80`, margin: 0, lineHeight: 1.6 }}>
                המגבלה מתאפסת ב-{analysisLimitError.resetDate}.
                <br />
                רוצה ניתוחים נוספים? רכוש חבילה בחנות.
              </p>
              <Link
                to="/shop"
                onClick={onClose}
                style={{
                  fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
                  color: '#142B16', background: GOLD,
                  borderRadius: '8px', padding: '11px 28px',
                  textDecoration: 'none', marginTop: '4px',
                  display: 'inline-block', transition: 'filter 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                לחנות →
              </Link>
            </div>
          ) : isAnalyzing ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div className="mon-pulse" style={{ fontSize: '64px', marginBottom: '20px' }}>🌕</div>
              <p style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, marginBottom: '8px' }}>
                צ'ופצ'ו בודק את הצמח שלך...
              </p>
              <p style={{ fontFamily: ASST, fontSize: '14px', color: 'rgba(237,224,196,0.6)', marginBottom: '4px' }}>
                ניתוח חכם עם בינה מלאכותית
              </p>
              <p style={{ fontFamily: ASST, fontSize: '13px', color: 'rgba(237,224,196,0.4)' }}>
                זה לוקח כ-15 שניות
              </p>
            </div>
          ) : (
            <>
              {/* Upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragOver ? GOLD : preview ? 'rgba(245,200,64,0.4)' : 'rgba(245,200,64,0.25)'}`,
                  borderRadius: '10px',
                  padding: '0',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                  minHeight: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: dragOver ? 'rgba(245,200,64,0.05)' : 'rgba(255,255,255,0.02)',
                  position: 'relative',
                }}
              >
                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt="תצוגה מקדימה"
                      style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: '8px', right: '8px',
                      backgroundColor: 'rgba(20,43,22,0.85)', borderRadius: '6px', padding: '4px 8px',
                    }}>
                      <span style={{ fontFamily: ASST, fontSize: '11px', color: 'rgba(237,224,196,0.7)' }}>
                        לחץ להחלפת תמונה
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📸</div>
                    <p style={{ fontFamily: FRANK, fontSize: '15px', color: PARCH, marginBottom: '6px' }}>
                      צלם או העלה תמונה של הצמח
                    </p>
                    <p style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(237,224,196,0.45)' }}>
                      {`JPG / PNG / WEBP עד ${MAX_PHOTO_SIZE_LABEL}`}
                    </p>
                    <p style={{ fontFamily: ASST, fontSize: '12px', color: 'rgba(237,224,196,0.45)', marginTop: '4px' }}>
                      גרור ושחרר כאן
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontFamily: ASST, fontSize: '13px', color: 'rgba(237,224,196,0.7)', marginBottom: '6px', textAlign: 'right' }}>
                  הערות נוספות (אופציונלי)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="מה שמת לב? האם יש בעיה ספציפית שמטרידה אותך?"
                  rows={3}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(245,200,64,0.25)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontFamily: ASST,
                    fontSize: '14px',
                    color: PARCH,
                    outline: 'none',
                    direction: 'rtl',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {error && (
                <p style={{ fontFamily: ASST, fontSize: '13px', color: '#e06060', textAlign: 'right', marginBottom: '16px' }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!imageBase64}
                style={{
                  width: '100%',
                  padding: '13px',
                  backgroundColor: imageBase64 ? GOLD : 'rgba(245,200,64,0.3)',
                  color: EARTH,
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: FRANK,
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: imageBase64 ? 'pointer' : 'not-allowed',
                  transition: 'filter 0.2s',
                }}
                onMouseEnter={e => { if (imageBase64) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                נתח עם צ'ופצ'ו 🌕
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
