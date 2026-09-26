import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTrackerStore, type CheckinResult } from '../../stores/trackerStore';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { MAX_PHOTO_SIZE_BYTES, MAX_PHOTO_SIZE_LABEL } from '@gina-haya/shared';
import { UpgradeModal } from '../upgrade/UpgradeModal';
import { compressImage } from '../../utils/compressImage';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const CHUPCHU_PULSE_CSS = `
@keyframes monPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.12); opacity: 0.8; }
}
.mon-pulse { animation: monPulse 1.6s ease-in-out infinite; }
`;

interface Props {
  trackerId:   string;
  plantNameHe: string;
  onClose:     () => void;
  onComplete:  (result: CheckinResult) => void;
}

export function PhotoUpload({ trackerId, plantNameHe, onClose, onComplete }: Props) {
  const { t } = useTranslation('tracker');
  const { createCheckin, analyzeCheckin, isAnalyzing } = useTrackerStore();
  const { profile } = useAuthStore();
  const { show: showToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const [preview,      setPreview]      = useState<string | null>(null);
  const [imageBase64,  setImageBase64]  = useState<string | null>(null);
  const [notes,        setNotes]        = useState('');
  const [error,        setError]        = useState('');
  const [dragOver,     setDragOver]     = useState(false);
  const [upgradeOpen,    setUpgradeOpen]    = useState(false);
  const [upgradeResetsAt, setUpgradeResetsAt] = useState<string | undefined>();
  const [upgradeScope,   setUpgradeScope]   = useState<'daily' | 'monthly'>('monthly');
  // Retry state after analysis failure
  const [pendingCheckinId, setPendingCheckinId] = useState<string | null>(null);
  const [pendingCredit,    setPendingCredit]    = useState(false);

  async function processFile(file: File) {
    setError('');
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('קבצים מותרים: JPG, PNG, WEBP בלבד');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setError(`התמונה גדולה מדי. אנא בחר תמונה קטנה מ-${MAX_PHOTO_SIZE_LABEL}`);
      return;
    }
    try {
      const { dataUrl, base64 } = await compressImage(file);
      setPreview(dataUrl);
      setImageBase64(base64);
      setPendingCheckinId(null); // clear retry when new image chosen
    } catch {
      setError(t('errors.image_decode'));
    }
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

  function friendlyError(err: any): string {
    if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      return t('errors.network');
    }
    const code = err.errorCode ?? '';
    const MAP: Record<string, string> = {
      timeout:                t('errors.timeout'),
      api_unavailable:        t('errors.api_unavailable'),
      analysis_failed:        t('errors.analysis_failed'),
      image_too_large:        t('errors.image_too_large'),
      analysis_limit_reached: t('errors.analysis_limit_reached'),
    };
    return MAP[code] ?? t('errors.unknown');
  }

  async function runAnalysis(checkinId: string, base64: string, priorCredit: boolean) {
    try {
      const result = await analyzeCheckin(trackerId, checkinId, base64, 'image/jpeg', priorCredit);
      if (result.used_credit) {
        showToast('השתמשת במגבלה החודשית — משתמש בקרדיט שרכשת 🔬', 'info');
      }
      onComplete(result);
    } catch (err: any) {
      console.error('[PhotoUpload] analysis failed', err);
      setError(friendlyError(err));
      // pendingCheckinId stays set so the retry button appears
    }
  }

  async function handleSubmit() {
    if (!imageBase64) { setError('יש לבחור תמונה תחילה'); return; }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    try {
      // Phase 1: upload photo + create checkin
      let checkinId: string;
      let usedCredit: boolean;
      try {
        const phase1 = await createCheckin(trackerId, imageBase64, 'image/jpeg', notes || undefined);
        checkinId  = phase1.checkin_id;
        usedCredit = phase1.used_credit;
        setPendingCheckinId(checkinId);
        setPendingCredit(usedCredit);
      } catch (err: any) {
        if (err.errorCode === 'analysis_limit_reached') {
          setUpgradeResetsAt(err.limitData?.resetsAt);
          setUpgradeScope(err.limitData?.scope ?? 'monthly');
          setUpgradeOpen(true);
        } else if (err.message === 'limit_exceeded') {
          setError(t('errors.limit_exceeded'));
        } else {
          setError(friendlyError(err));
        }
        return;
      }

      // Phase 2: AI analysis
      await runAnalysis(checkinId, imageBase64, usedCredit);
    } finally {
      submittingRef.current = false;
    }
  }

  async function retryAnalysis() {
    if (!pendingCheckinId || !imageBase64) return;
    setError('');
    await runAnalysis(pendingCheckinId, imageBase64, pendingCredit);
  }

  const canRetry = !isAnalyzing && !!pendingCheckinId && !!error;

  return (
    <>
      <style>{CHUPCHU_PULSE_CSS}</style>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          200,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter:  'blur(4px)',
          padding:         '16px',
        }}
        onClick={e => { if (!isAnalyzing && e.target === e.currentTarget) onClose(); }}
      >
        <div
          style={{
            backgroundColor: NIGHT_CARD,
            border:          '1px solid rgba(0,229,195,0.2)',
            borderRadius:    '12px',
            padding:         '28px 24px',
            width:           '100%',
            maxWidth:        '460px',
            maxHeight:       '90vh',
            overflowY:       'auto',
            direction:       'rtl',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: FRANK, fontSize: '18px', color: BIO_CYAN, margin: 0 }}>
              בדיקת {plantNameHe}
            </h2>
            {!isAnalyzing && (
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: `${TEXT_MID}50`, cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Analyzing state */}
          {isAnalyzing ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div className="mon-pulse" style={{ fontSize: '64px', marginBottom: '20px' }}>🌱</div>
              <p style={{ fontFamily: FRANK, fontSize: '20px', color: BIO_CYAN, marginBottom: '8px' }}>
                {t('checkin.analyzing')}
              </p>
              <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: `${TEXT_MID}60`, marginBottom: '4px' }}>
                ניתוח חכם עם בינה מלאכותית
              </p>
              <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}40` }}>
                זה לוקח כ-15 שניות
              </p>
            </div>
          ) : canRetry ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: '#e06060', marginBottom: '16px' }}>
                {error}
              </p>
              <button
                onClick={retryAnalysis}
                style={{
                  padding: '10px 28px', borderRadius: '8px', border: 'none',
                  background: BIO_CYAN, color: '#050d0a',
                  fontFamily: FRANK, fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                }}
              >
                {t('checkin.retryButton')}
              </button>
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
                  border:          `2px dashed ${dragOver ? BIO_CYAN : preview ? 'rgba(0,229,195,0.4)' : 'rgba(0,229,195,0.25)'}`,
                  borderRadius:    '10px',
                  padding:         '0',
                  cursor:          'pointer',
                  marginBottom:    '16px',
                  overflow:        'hidden',
                  transition:      'border-color 0.2s',
                  minHeight:       '180px',
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  backgroundColor: dragOver ? 'rgba(0,229,195,0.04)' : 'rgba(255,255,255,0.02)',
                  position:        'relative',
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
                      position:        'absolute',
                      bottom:          '8px',
                      right:           '8px',
                      backgroundColor: 'rgba(9,20,16,0.85)',
                      borderRadius:    '6px',
                      padding:         '4px 8px',
                    }}>
                      <span style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}70` }}>
                        לחץ להחלפת תמונה
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📸</div>
                    <p style={{ fontFamily: FRANK, fontSize: '15px', color: TEXT_MID, marginBottom: '6px' }}>
                      צלם או העלה תמונה של הצמח
                    </p>
                    <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}45` }}>
                      {`JPG / PNG / WEBP עד ${MAX_PHOTO_SIZE_LABEL}`}
                    </p>
                    <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}45`, marginTop: '4px' }}>
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
                <label style={{ display: 'block', fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}70`, marginBottom: '6px', textAlign: 'right' }}>
                  הערות נוספות (אופציונלי)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="מה שמת לב? האם יש בעיה ספציפית שמטרידה אותך?"
                  rows={3}
                  style={{
                    width:           '100%',
                    backgroundColor: 'rgba(9,20,16,0.85)',
                    border:          '1px solid rgba(0,229,195,0.2)',
                    borderRadius:    '6px',
                    padding:         '10px 12px',
                    fontFamily:      DM_SANS,
                    fontSize:        '14px',
                    color:           TEXT_MID,
                    outline:         'none',
                    direction:       'rtl',
                    resize:          'vertical',
                    boxSizing:       'border-box',
                  }}
                />
              </div>

              {error && !canRetry && (
                <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: '#e06060', textAlign: 'right', marginBottom: '16px' }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!imageBase64 || isAnalyzing}
                style={{
                  width:           '100%',
                  padding:         '13px',
                  backgroundColor: (imageBase64 && !isAnalyzing) ? BIO_CYAN : 'rgba(0,229,195,0.3)',
                  color:           '#050d0a',
                  border:          'none',
                  borderRadius:    '8px',
                  fontFamily:      FRANK,
                  fontSize:        '16px',
                  fontWeight:      700,
                  cursor:          (imageBase64 && !isAnalyzing) ? 'pointer' : 'not-allowed',
                  transition:      'filter 0.2s',
                }}
                onMouseEnter={e => { if (imageBase64 && !isAnalyzing) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                נתח עם צ'ופצ'ו 🌱
              </button>
            </>
          )}
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => { setUpgradeOpen(false); onClose(); }}
        limitType="analysis"
        currentTier={profile?.subscription_tier ?? 'free'}
        resetsAt={upgradeResetsAt}
        scope={upgradeScope}
      />
    </>
  );
}
