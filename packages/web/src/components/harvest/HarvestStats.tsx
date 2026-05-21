import type { HarvestStats } from '../../stores/harvestStore';

const GOLD   = '#00e5c3';
const PARCH  = '#b0cfbf';
const SAGE   = '#4A9C68';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const DAY_TYPE_COLOURS: Record<string, string> = {
  fruit:  '#C8A040',
  root:   '#8B6340',
  flower: '#C878A0',
  leaf:   '#4A9C68',
};
const DAY_TYPE_HE: Record<string, string> = {
  fruit: 'פרי', root: 'שורש', flower: 'פרח', leaf: 'עלה',
};

interface Props {
  stats: HarvestStats;
}

export function HarvestStats({ stats }: Props) {
  const total = stats.byDayType.fruit + stats.byDayType.root + stats.byDayType.flower + stats.byDayType.leaf;
  const top3  = stats.topPlants.slice(0, 3);

  return (
    <div dir="rtl" style={{
      background:    'linear-gradient(145deg, rgba(9,20,16,0.8) 0%, rgba(9,20,16,0.9) 100%)',
      border:        '1px solid rgba(0,229,195,0.2)',
      borderRadius:  '14px',
      padding:       '18px 20px',
      marginBottom:  '16px',
    }}>
      {/* Top row: totals */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: FRANK, fontSize: '2.2rem', fontWeight: 700, color: GOLD, lineHeight: 1 }}>
            {stats.totalHarvests}
          </div>
          <div style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}77`, marginTop: '2px' }}>
            סה"כ קצירים
          </div>
        </div>
        <div>
          <div style={{ fontFamily: FRANK, fontSize: '2.2rem', fontWeight: 700, color: SAGE, lineHeight: 1 }}>
            {stats.thisMonth}
          </div>
          <div style={{ fontFamily: ASSIST, fontSize: '11px', color: `${PARCH}77`, marginTop: '2px' }}>
            החודש
          </div>
        </div>
        {stats.lastMonth > 0 && (
          <div style={{ alignSelf: 'center' }}>
            <div style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}55` }}>
              {stats.lastMonth > stats.thisMonth ? '▼' : stats.lastMonth < stats.thisMonth ? '▲' : '—'}{' '}
              {stats.lastMonth} חודש שעבר
            </div>
          </div>
        )}
        {stats.recentStreak > 1 && (
          <div style={{ marginInlineStart: 'auto', alignSelf: 'center' }}>
            <div style={{ fontFamily: ASSIST, fontSize: '12px', color: GOLD }}>
              🔥 {stats.recentStreak} ימים ברצף
            </div>
          </div>
        )}
      </div>

      {/* Top plants */}
      {top3.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontFamily: ASSIST, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: `${PARCH}44`, marginBottom: '8px' }}>
            הכי הרבה
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {top3.map(p => (
              <span key={p.nameHe} style={{
                fontFamily: ASSIST,
                fontSize: '12px',
                padding: '3px 10px',
                borderRadius: '50px',
                backgroundColor: 'rgba(0,229,195,0.08)',
                border: '1px solid rgba(0,229,195,0.2)',
                color: PARCH,
              }}>
                {p.nameHe} <span style={{ color: GOLD, fontWeight: 600 }}>{p.count}×</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Day type distribution bar */}
      {total > 0 && (
        <div>
          <div style={{ fontFamily: ASSIST, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: `${PARCH}44`, marginBottom: '6px' }}>
            לפי סוג יום
          </div>
          <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', height: '8px', gap: '1px' }}>
            {(['fruit', 'root', 'flower', 'leaf'] as const).map(dt => {
              const count = stats.byDayType[dt];
              if (count === 0) return null;
              return (
                <div
                  key={dt}
                  title={`${DAY_TYPE_HE[dt]}: ${count}`}
                  style={{
                    flex: count,
                    backgroundColor: DAY_TYPE_COLOURS[dt],
                    borderRadius: '2px',
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
            {(['fruit', 'root', 'flower', 'leaf'] as const).map(dt => {
              const count = stats.byDayType[dt];
              if (count === 0) return null;
              return (
                <span key={dt} style={{ fontFamily: ASSIST, fontSize: '10px', color: DAY_TYPE_COLOURS[dt], display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: DAY_TYPE_COLOURS[dt], display: 'inline-block' }} />
                  {DAY_TYPE_HE[dt]} {count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
