import { useState } from 'react';
import type { PlantAnalysis, GrowingPlan } from '../../stores/trackerStore';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const HEALTH_COLOURS: Record<string, string> = {
  excellent: '#5cb85c',
  good:      '#4A9C68',
  fair:      '#e6a817',
  poor:      '#d9534f',
};

const SEVERITY_COLOURS: Record<string, string> = {
  high:   '#d9534f',
  medium: '#e6a817',
  low:    '#4A9C68',
};

const GROWTH_STAGE_HE_MAP: Record<string, string> = {
  seed:       'זרע',
  seedling:   'נבט',
  vegetative: 'צמיחה',
  flowering:  'פריחה',
  fruiting:   'הבשלת פרי',
  harvest:    'קציר',
  dormant:    'מנוחה',
};

interface Props {
  analysis: PlantAnalysis;
  growingPlan: GrowingPlan;
  checkinDate?: string;
  suggestedTasksCount?: number;
  wasAutoIdentified?: boolean;
  onConfirmIdentification?: (nameHe: string, nameEn: string) => void;
  onReviewTasks?: () => void;
  onRetry?: () => void;
  onClose: () => void;
}

export function AnalysisResult({ analysis, growingPlan, checkinDate, suggestedTasksCount, wasAutoIdentified, onConfirmIdentification, onReviewTasks, onRetry, onClose }: Props) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [identBannerState, setIdentBannerState] = useState<'pending' | 'editing' | 'confirmed'>(
    wasAutoIdentified ? 'pending' : 'confirmed'
  );
  const [editNameHe, setEditNameHe] = useState(analysis?.plantIdentified ?? '');
  const [editNameEn, setEditNameEn] = useState(analysis?.plantIdentifiedEn ?? '');

  if (!analysis || !growingPlan) {
    return (
      <div role="dialog" aria-modal="true" style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px',
      }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{
          backgroundColor: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.2)',
          borderRadius: '12px', padding: '32px 24px', maxWidth: '400px', width: '100%',
          direction: 'rtl', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: BIO_CYAN, marginBottom: '12px' }}>
            שגיאה בניתוח
          </h2>
          <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: `${TEXT_MID}70`, lineHeight: 1.6 }}>
            לא ניתן להציג את תוצאות הניתוח. אנא נסה שנית.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
            {onRetry && (
              <button onClick={onRetry} style={{
                padding: '10px 24px',
                backgroundColor: BIO_CYAN, color: '#050d0a',
                border: 'none', borderRadius: '8px',
                fontFamily: FRANK, fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              }}>
                נסה שנית
              </button>
            )}
            <button onClick={onClose} style={{
              padding: '10px 24px',
              backgroundColor: 'transparent', color: `${TEXT_MID}60`,
              border: '1px solid rgba(176,207,191,0.2)', borderRadius: '8px',
              fontFamily: FRANK, fontSize: '15px', cursor: 'pointer',
            }}>
              סגור
            </button>
          </div>
        </div>
      </div>
    );
  }

  function toggleWeek(week: number) {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      next.has(week) ? next.delete(week) : next.add(week);
      return next;
    });
  }

  function handlePrint() {
    const win = window.open('', '_blank');
    if (!win) return;

    const healthColor = HEALTH_COLOURS[analysis.health] ?? '#4A9C68';
    const stageHe = analysis.growthStageHe || GROWTH_STAGE_HE_MAP[analysis.growthStage] || analysis.growthStage;
    const dateStr = checkinDate ? new Date(checkinDate).toLocaleDateString('he-IL') : '';

    const stepsHtml = (growingPlan.steps ?? []).map(step => `
      <div class="week-card">
        <h4>שבוע ${step.week}: ${step.title}</h4>
        <ul>${step.actions.map(a => `<li>${a}</li>`).join('')}</ul>
        ${step.biodynamicTip ? `<p class="bio-tip">🌙 ${step.biodynamicTip}</p>` : ''}
        ${step.preparations.length > 0 ? `<p class="preps">פרפרטים: ${step.preparations.join(', ')}</p>` : ''}
      </div>
    `).join('');

    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>תכנית גידול — ${analysis.plantIdentified}</title>
<style>
  body { font-family: 'Assistant', Arial, sans-serif; direction: rtl; padding: 32px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 28px; color: #2d5a1b; border-bottom: 2px solid #2d5a1b; padding-bottom: 8px; }
  h2 { font-size: 20px; color: #2d5a1b; margin-top: 28px; }
  h3 { font-size: 16px; color: #333; }
  h4 { font-size: 15px; color: #2d5a1b; }
  .meta { font-size: 13px; color: #666; margin-bottom: 20px; }
  .badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; margin: 2px; }
  .health { background-color: ${healthColor}22; color: ${healthColor}; border: 1px solid ${healthColor}; }
  .stage  { background-color: #2d5a1b22; color: #2d5a1b; border: 1px solid #2d5a1b; }
  .issue-card { border-right: 4px solid #e6a817; padding: 12px; margin: 8px 0; background: #fafafa; border-radius: 4px; }
  .issue-card.high { border-right-color: #d9534f; }
  .issue-card.low  { border-right-color: #4A9C68; }
  .solution { color: #2d5a1b; font-weight: 500; }
  .week-card { border: 1px solid #ddd; padding: 12px; margin: 8px 0; border-radius: 6px; }
  .bio-tip { font-style: italic; color: #c8900a; }
  .preps { font-size: 12px; color: #666; }
  ul { margin: 6px 0; padding-right: 20px; }
  li { margin: 4px 0; }
  .section { margin-top: 24px; }
  .watering, .fertilising { background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 8px 0; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<h1>תכנית גידול — ${analysis.plantIdentified}</h1>
<p class="meta">${analysis.plantIdentifiedEn}${dateStr ? ` | ${dateStr}` : ''}</p>

<span class="badge stage">${stageHe}</span>
<span class="badge health">${analysis.healthHe}</span>

<div class="section">
<h2>תצפיות</h2>
<p>${analysis.observations}</p>
</div>

${(analysis.issues ?? []).length > 0 ? `
<div class="section">
<h2>בעיות שזוהו</h2>
${(analysis.issues ?? []).map(issue => `
<div class="issue-card ${issue.severity}">
  <strong>${issue.type}</strong> (${issue.severity === 'high' ? 'חמור' : issue.severity === 'medium' ? 'בינוני' : 'קל'})
  <p>${issue.description}</p>
  <p class="solution">🌿 פתרון: ${issue.naturalSolution}</p>
</div>
`).join('')}
</div>
` : ''}

${(analysis.immediateActions ?? []).length > 0 ? `
<div class="section">
<h2>פעולות מיידיות</h2>
<ol>${(analysis.immediateActions ?? []).map(a => `<li>${a}</li>`).join('')}</ol>
</div>
` : ''}

<div class="section">
<h2>תכנית גידול</h2>
<p>${growingPlan.summary}</p>
${growingPlan.estimatedHarvestWeeks ? `<p><strong>צפי לקציר: ~${growingPlan.estimatedHarvestWeeks} שבועות</strong></p>` : ''}
${stepsHtml}
</div>

<div class="section">
<h2>לוח השקיה</h2>
<div class="watering">
  <p><strong>תדירות:</strong> כל ${growingPlan.wateringSchedule.frequencyDays} ימים</p>
  <p>${growingPlan.wateringSchedule.amountDescription}</p>
  ${growingPlan.wateringSchedule.specialNotes ? `<p><em>${growingPlan.wateringSchedule.specialNotes}</em></p>` : ''}
</div>
</div>

<div class="section">
<h2>הדשנה</h2>
<div class="fertilising">
  <p><strong>קומפוסט:</strong> ${growingPlan.fertilising.compostAmount}</p>
  <p><strong>תזמון:</strong> ${growingPlan.fertilising.timing}</p>
  ${growingPlan.fertilising.preparations.length > 0 ? `<p>פרפרטים: ${growingPlan.fertilising.preparations.join(', ')}</p>` : ''}
</div>
</div>

${(growingPlan.pestPrevention ?? []).length > 0 ? `
<div class="section">
<h2>מניעת מזיקים</h2>
<ul>${(growingPlan.pestPrevention ?? []).map(p => `<li>${p}</li>`).join('')}</ul>
</div>
` : ''}

${(growingPlan.naturalFertilizers ?? []).length > 0 ? `
<div class="section">
<h2>דשנים טבעיים</h2>
<ul>${(growingPlan.naturalFertilizers ?? []).map(f => `<li>${f}</li>`).join('')}</ul>
</div>
` : ''}

<p style="font-size:11px;color:#999;margin-top:40px;border-top:1px solid #ddd;padding-top:8px;">
  נוצר על ידי גינה חיה — צ'ופצ'ו 🌱 | הניתוח אינו מחליף ייעוץ אגרונומי מקצועי
</p>
</body>
</html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }

  const stageHe = analysis.growthStageHe || GROWTH_STAGE_HE_MAP[analysis.growthStage] || analysis.growthStage;
  const healthColor = HEALTH_COLOURS[analysis.health] ?? '#4A9C68';

  const sectionTitle = (text: string) => (
    <h3 style={{ fontFamily: FRANK, fontSize: '16px', color: BIO_CYAN, margin: '24px 0 12px', borderBottom: '1px solid rgba(0,229,195,0.15)', paddingBottom: '6px' }}>
      {text}
    </h3>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: NIGHT_CARD,
          border: '1px solid rgba(0,229,195,0.2)',
          borderRadius: '12px',
          padding: '28px 24px',
          width: '100%',
          maxWidth: '620px',
          direction: 'rtl',
          margin: '16px auto',
        }}
      >
        {/* Auto-identification banner */}
        {wasAutoIdentified && identBannerState !== 'confirmed' && (
          <div style={{
            backgroundColor: 'rgba(0,229,195,0.08)',
            border: '1px solid rgba(0,229,195,0.35)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px',
          }}>
            <p style={{ fontFamily: FRANK, fontSize: '14px', color: BIO_CYAN, margin: '0 0 6px', textAlign: 'right' }}>
              🔍 זיהינו את הצמח אוטומטית
            </p>
            {identBannerState === 'pending' ? (
              <>
                <p style={{ fontFamily: DM_SANS, fontSize: '16px', color: TEXT_MID, margin: '0 0 12px', textAlign: 'right', fontWeight: 600 }}>
                  {analysis.plantIdentifiedEn} ({analysis.plantIdentified})
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setIdentBannerState('editing')}
                    style={{
                      padding: '7px 14px', borderRadius: '6px', fontFamily: DM_SANS, fontSize: '13px',
                      backgroundColor: 'transparent', border: '1px solid rgba(0,229,195,0.35)',
                      color: BIO_CYAN, cursor: 'pointer',
                    }}
                  >
                    תיקון שם
                  </button>
                  <button
                    onClick={() => {
                      setIdentBannerState('confirmed');
                      onConfirmIdentification?.(analysis.plantIdentified, analysis.plantIdentifiedEn);
                    }}
                    style={{
                      padding: '7px 14px', borderRadius: '6px', fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                      backgroundColor: BIO_CYAN, border: 'none', color: '#050d0a', cursor: 'pointer',
                    }}
                  >
                    אישור
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                  <input
                    value={editNameHe}
                    onChange={e => setEditNameHe(e.target.value)}
                    placeholder="שם בעברית"
                    dir="rtl"
                    style={{
                      backgroundColor: 'rgba(9,20,16,0.85)', border: '1px solid rgba(0,229,195,0.3)',
                      borderRadius: '6px', padding: '8px 10px', fontFamily: DM_SANS, fontSize: '14px',
                      color: TEXT_MID, outline: 'none',
                    }}
                  />
                  <input
                    value={editNameEn}
                    onChange={e => setEditNameEn(e.target.value)}
                    placeholder="English name"
                    dir="ltr"
                    style={{
                      backgroundColor: 'rgba(9,20,16,0.85)', border: '1px solid rgba(0,229,195,0.3)',
                      borderRadius: '6px', padding: '8px 10px', fontFamily: DM_SANS, fontSize: '14px',
                      color: TEXT_MID, outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setIdentBannerState('pending')}
                    style={{
                      padding: '7px 14px', borderRadius: '6px', fontFamily: DM_SANS, fontSize: '13px',
                      backgroundColor: 'transparent', border: '1px solid rgba(176,207,191,0.25)',
                      color: `${TEXT_MID}60`, cursor: 'pointer',
                    }}
                  >
                    ביטול
                  </button>
                  <button
                    onClick={() => {
                      setIdentBannerState('confirmed');
                      onConfirmIdentification?.(editNameHe.trim() || analysis.plantIdentified, editNameEn.trim() || analysis.plantIdentifiedEn);
                    }}
                    style={{
                      padding: '7px 14px', borderRadius: '6px', fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                      backgroundColor: BIO_CYAN, border: 'none', color: '#050d0a', cursor: 'pointer',
                    }}
                  >
                    שמור שם
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontFamily: FRANK, fontSize: '26px', color: BIO_CYAN, margin: '0 0 4px' }}>
              {analysis.plantIdentified}
            </h2>
            <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: `${TEXT_MID}60`, margin: 0, fontStyle: 'italic' }}>
              {analysis.plantIdentifiedEn}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: `${TEXT_MID}50`, cursor: 'pointer', fontSize: '22px', marginTop: '4px', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{
            padding: '4px 14px', borderRadius: '16px', fontFamily: DM_SANS, fontSize: '13px', fontWeight: 600,
            backgroundColor: 'rgba(0,229,195,0.1)', border: '1px solid rgba(0,229,195,0.35)', color: BIO_CYAN,
          }}>
            {stageHe}
          </span>
          <span style={{
            padding: '4px 14px', borderRadius: '16px', fontFamily: DM_SANS, fontSize: '13px', fontWeight: 600,
            backgroundColor: `${healthColor}22`, border: `1px solid ${healthColor}88`, color: healthColor,
          }}>
            {analysis.healthHe}
          </span>
          <span style={{
            padding: '4px 14px', borderRadius: '16px', fontFamily: DM_SANS, fontSize: '12px',
            backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(176,207,191,0.12)',
            color: `${TEXT_MID}50`,
          }}>
            ביטחון: {analysis.confidence === 'high' ? 'גבוה' : analysis.confidence === 'medium' ? 'בינוני' : 'נמוך'}
          </span>
        </div>

        {/* Suggested tasks banner */}
        {suggestedTasksCount != null && suggestedTasksCount > 0 && onReviewTasks && (
          <button
            onClick={onReviewTasks}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              width: '100%', textAlign: 'right',
              backgroundColor: 'rgba(0,229,195,0.07)', border: '1px solid rgba(0,229,195,0.3)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', cursor: 'pointer',
            }}
          >
            <span style={{ fontFamily: DM_SANS, fontSize: '12px', color: BIO_CYAN }}>אישור משימות ←</span>
            <span style={{ fontFamily: DM_SANS, fontSize: '13px', color: BIO_CYAN, fontWeight: 600 }}>
              🗒️ {suggestedTasksCount} משימות מוצעות לאישור
            </span>
          </button>
        )}

        {/* Observations */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px',
          marginBottom: '4px', border: '1px solid rgba(176,207,191,0.08)',
        }}>
          <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: TEXT_MID, lineHeight: 1.7, margin: 0 }}>
            {analysis.observations}
          </p>
        </div>

        {/* Section 2: Issues */}
        {(analysis.issues ?? []).length > 0 && (
          <>
            {sectionTitle('⚠️ בעיות שזוהו')}
            {(analysis.issues ?? []).map((issue, i) => (
              <div
                key={i}
                style={{
                  borderRight: `4px solid ${SEVERITY_COLOURS[issue.severity] ?? '#e6a817'}`,
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  padding: '12px 14px',
                  marginBottom: '10px',
                  border: '1px solid rgba(176,207,191,0.08)',
                  borderRightWidth: '4px',
                  borderRightStyle: 'solid',
                  borderRightColor: SEVERITY_COLOURS[issue.severity] ?? '#e6a817',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    fontFamily: DM_SANS, fontSize: '12px', fontWeight: 600,
                    color: SEVERITY_COLOURS[issue.severity],
                    backgroundColor: `${SEVERITY_COLOURS[issue.severity]}22`,
                    padding: '2px 8px', borderRadius: '10px',
                  }}>
                    {issue.severity === 'high' ? 'חמור' : issue.severity === 'medium' ? 'בינוני' : 'קל'}
                  </span>
                  <strong style={{ fontFamily: FRANK, fontSize: '15px', color: TEXT_MID }}>{issue.type}</strong>
                </div>
                <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}80`, margin: '0 0 8px', lineHeight: 1.6 }}>
                  {issue.description}
                </p>
                <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: MUTED, margin: 0, lineHeight: 1.6 }}>
                  🌿 {issue.naturalSolution}
                </p>
              </div>
            ))}
          </>
        )}

        {/* Section 3: Immediate actions */}
        {(analysis.immediateActions ?? []).length > 0 && (
          <>
            {sectionTitle('✅ פעולות מיידיות')}
            <ol style={{ margin: 0, padding: '0 20px 0 0', listStyle: 'decimal' }}>
              {(analysis.immediateActions ?? []).map((action, i) => (
                <li key={i} style={{
                  fontFamily: DM_SANS, fontSize: '14px', color: TEXT_MID, lineHeight: 1.7,
                  marginBottom: '8px',
                }}>
                  <span style={{ marginRight: '8px' }}>
                    <input type="checkbox" style={{ marginLeft: '8px', accentColor: BIO_CYAN }} readOnly />
                    {action}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}

        {/* Section 4: Growing plan */}
        {sectionTitle('🌱 תכנית גידול')}
        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid rgba(176,207,191,0.08)' }}>
          <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: TEXT_MID, lineHeight: 1.7, margin: '0 0 8px' }}>
            {growingPlan.summary}
          </p>
          {growingPlan.estimatedHarvestWeeks !== null && (
            <p style={{ fontFamily: FRANK, fontSize: '14px', color: BIO_CYAN, margin: 0 }}>
              🌾 צפי לקציר: ~{growingPlan.estimatedHarvestWeeks} שבועות
            </p>
          )}
        </div>

        {/* Week timeline */}
        {(growingPlan.steps ?? []).map(step => (
          <div
            key={step.week}
            style={{
              border: '1px solid rgba(0,229,195,0.15)',
              borderRadius: '8px',
              marginBottom: '8px',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => toggleWeek(step.week)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: expandedWeeks.has(step.week) ? 'rgba(0,229,195,0.07)' : 'rgba(255,255,255,0.02)',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              <span style={{ fontFamily: DM_SANS, fontSize: '16px', color: `${TEXT_MID}60` }}>
                {expandedWeeks.has(step.week) ? '▲' : '▼'}
              </span>
              <span style={{ fontFamily: FRANK, fontSize: '15px', color: TEXT_MID, textAlign: 'right' }}>
                שבוע {step.week}: {step.title}
              </span>
            </button>
            {expandedWeeks.has(step.week) && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,229,195,0.1)' }}>
                <ul style={{ margin: '0 0 10px', padding: '0 18px 0 0' }}>
                  {step.actions.map((action, i) => (
                    <li key={i} style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, lineHeight: 1.7, marginBottom: '4px' }}>
                      {action}
                    </li>
                  ))}
                </ul>
                {step.biodynamicTip && (
                  <p style={{ fontFamily: DM_SANS, fontSize: '13px', fontStyle: 'italic', color: BIO_CYAN, margin: '8px 0 4px', lineHeight: 1.6 }}>
                    🌙 {step.biodynamicTip}
                  </p>
                )}
                {(step.preparations ?? []).length > 0 && (
                  <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: MUTED, margin: '4px 0 0' }}>
                    פרפרטים: {(step.preparations ?? []).join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Watering schedule */}
        {sectionTitle('💧 לוח השקיה')}
        <div style={{ backgroundColor: 'rgba(0,100,130,0.15)', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid rgba(0,150,180,0.25)' }}>
          <p style={{ fontFamily: FRANK, fontSize: '14px', color: '#7bd4e8', margin: '0 0 6px' }}>
            כל {growingPlan.wateringSchedule.frequencyDays} ימים
          </p>
          <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, margin: '0 0 4px', lineHeight: 1.6 }}>
            {growingPlan.wateringSchedule.amountDescription}
          </p>
          {growingPlan.wateringSchedule.specialNotes && (
            <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}60`, margin: 0, fontStyle: 'italic' }}>
              {growingPlan.wateringSchedule.specialNotes}
            </p>
          )}
        </div>

        {/* Fertilising */}
        {sectionTitle('🌱 הדשנה')}
        <div style={{ backgroundColor: 'rgba(0,229,195,0.06)', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid rgba(0,229,195,0.2)' }}>
          <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, margin: '0 0 4px' }}>
            <strong>קומפוסט:</strong> {growingPlan.fertilising.compostAmount}
          </p>
          <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, margin: '0 0 4px' }}>
            <strong>תזמון:</strong> {growingPlan.fertilising.timing}
          </p>
          {(growingPlan.fertilising?.preparations ?? []).length > 0 && (
            <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: MUTED, margin: 0 }}>
              פרפרטים: {(growingPlan.fertilising?.preparations ?? []).join(', ')}
            </p>
          )}
        </div>

        {/* Pest prevention */}
        {(growingPlan.pestPrevention ?? []).length > 0 && (
          <>
            {sectionTitle('🐛 מניעת מזיקים')}
            <ul style={{ margin: '0 0 16px', padding: '0 18px 0 0' }}>
              {(growingPlan.pestPrevention ?? []).map((tip, i) => (
                <li key={i} style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, lineHeight: 1.7, marginBottom: '4px' }}>
                  {tip}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Natural fertilizers */}
        {(growingPlan.naturalFertilizers ?? []).length > 0 && (
          <>
            {sectionTitle('🌿 דשנים טבעיים')}
            <ul style={{ margin: '0 0 24px', padding: '0 18px 0 0' }}>
              {(growingPlan.naturalFertilizers ?? []).map((fert, i) => (
                <li key={i} style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID, lineHeight: 1.7, marginBottom: '4px' }}>
                  {fert}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Download / Print button */}
        <button
          onClick={handlePrint}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'transparent',
            color: BIO_CYAN,
            border: `1.5px solid ${BIO_CYAN}`,
            borderRadius: '8px',
            fontFamily: FRANK,
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '8px',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = 'rgba(0,229,195,0.08)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = 'transparent';
          }}
        >
          הורד תכנית גידול PDF 📄
        </button>
      </div>
    </div>
  );
}
