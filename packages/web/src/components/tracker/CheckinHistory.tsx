import { useState, useEffect } from 'react';
import type { TrackerCheckin, PlantAnalysis, GrowingPlan } from '../../stores/trackerStore';
import { AnalysisResult } from './AnalysisResult';
import { supabase } from '../../lib/supabase';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';

const HEALTH_COLOURS: Record<string, string> = {
  excellent: '#5cb85c',
  good:      '#4A9C68',
  fair:      '#e6a817',
  poor:      '#d9534f',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getComparisonNote(current: TrackerCheckin, previous: TrackerCheckin): string | null {
  const curAnalysis  = current.ai_analysis;
  const prevAnalysis = previous.ai_analysis;
  if (!curAnalysis || !prevAnalysis) return null;

  const parts: string[] = [];

  const healthOrder = ['poor', 'fair', 'good', 'excellent'];
  const curHealth   = healthOrder.indexOf(curAnalysis.health);
  const prevHealth  = healthOrder.indexOf(prevAnalysis.health);
  if (curHealth > prevHealth) {
    parts.push('מצב הבריאות השתפר ✨');
  } else if (curHealth < prevHealth) {
    parts.push('מצב הבריאות הידרדר ⚠️');
  }

  if (curAnalysis.growthStage !== prevAnalysis.growthStage) {
    parts.push(`עבר לשלב: ${curAnalysis.growthStageHe}`);
  }

  const curIssues  = curAnalysis.issues.length;
  const prevIssues = prevAnalysis.issues.length;
  if (curIssues < prevIssues) {
    parts.push(`בעיות פחתו מ-${prevIssues} ל-${curIssues}`);
  } else if (curIssues > prevIssues) {
    parts.push(`בעיות עלו מ-${prevIssues} ל-${curIssues}`);
  }

  return parts.length > 0 ? parts.join(' | ') : null;
}

function CheckinPhoto({ photoPath }: { photoPath: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.storage
      .from('tracker-photos')
      .createSignedUrl(photoPath, 3600)
      .then(({ data }) => { if (data?.signedUrl) setUrl(data.signedUrl); });
  }, [photoPath]);

  if (!url) return null;

  return (
    <div style={{ marginTop: '8px' }}>
      <img
        src={url}
        alt="תמונת בדיקה"
        style={{
          width:        '72px',
          height:       '72px',
          objectFit:    'cover',
          borderRadius: '6px',
          border:       '1px solid rgba(0,229,195,0.2)',
        }}
      />
    </div>
  );
}

interface Props {
  checkins: TrackerCheckin[];
}

export function CheckinHistory({ checkins }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (checkins.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: `${TEXT_MID}45` }}>
          עדיין אין בדיקות. לחץ על "הוסף בדיקה +" כדי להתחיל.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0' }}>
      {checkins.map((checkin, index) => {
        const analysis    = checkin.ai_analysis;
        const growingPlan = checkin.growing_plan;
        const healthColor = analysis ? (HEALTH_COLOURS[analysis.health] ?? NIGHT_CARD) : 'rgba(176,207,191,0.3)';
        const isExpanded  = expandedId === checkin.id;
        const previous    = checkins[index + 1] ?? null;
        const comparison  = previous ? getComparisonNote(checkin, previous) : null;

        return (
          <div
            key={checkin.id}
            style={{ position: 'relative', marginBottom: '12px' }}
          >
            {/* Timeline connector */}
            {index < checkins.length - 1 && (
              <div style={{
                position:        'absolute',
                top:             '32px',
                right:           '12px',
                width:           '2px',
                height:          'calc(100% + 12px)',
                backgroundColor: 'rgba(0,229,195,0.12)',
                zIndex:          0,
              }} />
            )}

            <div
              style={{
                position:        'relative',
                zIndex:          1,
                backgroundColor: 'rgba(255,255,255,0.03)',
                border:          `1px solid ${isExpanded ? 'rgba(0,229,195,0.3)' : 'rgba(0,229,195,0.1)'}`,
                borderRadius:    '8px',
                padding:         '12px 14px',
                cursor:          'pointer',
                transition:      'border-color 0.2s',
              }}
              onClick={() => setExpandedId(isExpanded ? null : checkin.id)}
            >
              {/* Timeline dot */}
              <div style={{
                position:        'absolute',
                top:             '14px',
                right:           '-6px',
                width:           '12px',
                height:          '12px',
                borderRadius:    '50%',
                backgroundColor: healthColor,
                border:          `2px solid ${NIGHT_CARD}`,
                zIndex:          2,
              }} />

              <div style={{ paddingRight: '12px' }}>
                {/* Date + badges row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {analysis && (
                      <>
                        <span style={{
                          padding:         '2px 10px',
                          borderRadius:    '12px',
                          fontFamily:      DM_SANS,
                          fontSize:        '11px',
                          fontWeight:      600,
                          backgroundColor: `${healthColor}22`,
                          border:          `1px solid ${healthColor}55`,
                          color:           healthColor,
                        }}>
                          {analysis.healthHe}
                        </span>
                        <span style={{
                          padding:         '2px 10px',
                          borderRadius:    '12px',
                          fontFamily:      DM_SANS,
                          fontSize:        '11px',
                          backgroundColor: 'rgba(0,229,195,0.1)',
                          border:          '1px solid rgba(0,229,195,0.25)',
                          color:           BIO_CYAN,
                        }}>
                          {analysis.growthStageHe}
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: FRANK, fontSize: '14px', color: TEXT_MID, margin: 0 }}>
                      {formatDate(checkin.checkin_date)}
                    </p>
                    <p style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${TEXT_MID}45`, margin: '2px 0 0' }}>
                      {index === 0 ? `לפני ${daysSince(checkin.checkin_date)} ימים` : ''}
                    </p>
                  </div>
                </div>

                {/* Comparison note */}
                {comparison && (
                  <p style={{
                    fontFamily:  DM_SANS,
                    fontSize:    '12px',
                    color:       `${BIO_CYAN}70`,
                    margin:      '6px 0 0',
                    paddingTop:  '6px',
                    borderTop:   '1px solid rgba(0,229,195,0.1)',
                    lineHeight:  1.5,
                  }}>
                    📊 מאז הבדיקה הקודמת: {comparison}
                  </p>
                )}

                {/* Notes */}
                {checkin.notes && (
                  <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: `${TEXT_MID}55`, margin: '6px 0 0', fontStyle: 'italic' }}>
                    💬 {checkin.notes}
                  </p>
                )}

                {/* Photo thumbnail */}
                {checkin.photo_path && <CheckinPhoto photoPath={checkin.photo_path} />}

                {/* Expand hint */}
                <div style={{ textAlign: 'left', marginTop: '6px' }}>
                  <span style={{ fontFamily: DM_SANS, fontSize: '11px', color: `${BIO_CYAN}50` }}>
                    {isExpanded ? '▲ סגור' : '▼ הצג ניתוח מלא'}
                  </span>
                </div>
              </div>
            </div>

            {/* Expanded full analysis */}
            {isExpanded && analysis && growingPlan && (
              <div style={{ marginTop: '8px' }}>
                <AnalysisResult
                  analysis={analysis}
                  growingPlan={growingPlan}
                  checkinDate={checkin.checkin_date}
                  onClose={() => setExpandedId(null)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
