import { useTranslation } from 'react-i18next';

interface Props {
  search:          string;
  onSearchChange:  (v: string) => void;
  category:        string;
  onCategoryChange:(v: string) => void;
  dayTypeFilter:   string;
  onDayTypeChange: (v: string) => void;
}

const CATEGORIES = ['all', 'vegetables', 'herbs', 'fruit_trees', 'flowers', 'house_plant', 'succulent', 'cactus', 'medicinal'] as const;

const DAY_TYPES = [
  { key: 'fruit',  emoji: '🍅' },
  { key: 'root',   emoji: '🥕' },
  { key: 'flower', emoji: '🌸' },
  { key: 'leaf',   emoji: '🌿' },
] as const;

const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const ASSIST = '"Assistant", "Heebo", sans-serif';

export function PlantSearch({
  search,         onSearchChange,
  category,       onCategoryChange,
  dayTypeFilter,  onDayTypeChange,
}: Props) {
  const { t } = useTranslation('garden');

  return (
    <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Search input with icon */}
      <div style={{ position: 'relative' }}>
        <input
          type="search"
          className="plant-search-input"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t('encyclopedia.search')}
          style={{
            width:           '100%',
            boxSizing:       'border-box',
            backgroundColor: 'rgba(28,58,30,0.8)',
            border:          '1px solid rgba(125,192,132,0.2)',
            borderRadius:    '12px',
            padding:         '13px 18px',
            paddingInlineEnd:'48px',
            fontFamily:      ASSIST,
            fontSize:        '14px',
            fontWeight:      400,
            color:           PARCH,
            transition:      'border-color 0.2s, box-shadow 0.2s',
          }}
        />
        {/* Search icon — logical end = left in RTL, right in LTR */}
        <span
          aria-hidden="true"
          style={{
            position:       'absolute',
            top:            '50%',
            insetInlineEnd: '16px',
            transform:      'translateY(-50%)',
            fontSize:       '16px',
            color:          `${PARCH}40`,
            pointerEvents:  'none',
            lineHeight:     1,
          }}
        >
          🔍
        </span>
      </div>

      {/* Category tabs — flow right-to-left in RTL naturally */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {CATEGORIES.map(cat => {
          const active = cat === 'all' ? category === '' : category === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat === 'all' ? '' : cat)}
              style={{
                fontFamily:      ASSIST,
                fontSize:        '13px',
                fontWeight:      active ? 600 : 400,
                padding:         '6px 16px',
                borderRadius:    '50px',
                border:          active
                  ? `1px solid rgba(245,200,64,0.5)`
                  : '1px solid rgba(125,192,132,0.2)',
                backgroundColor: active
                  ? 'rgba(245,200,64,0.15)'
                  : 'rgba(28,58,30,0.6)',
                color:           active ? GOLD : `${PARCH}99`,
                cursor:          'pointer',
                transition:      'background-color 0.15s, border-color 0.15s, color 0.15s',
                whiteSpace:      'nowrap',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125,192,132,0.4)';
                  (e.currentTarget as HTMLElement).style.color = PARCH;
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125,192,132,0.2)';
                  (e.currentTarget as HTMLElement).style.color = `${PARCH}99`;
                }
              }}
            >
              {t(`encyclopedia.categories.${cat}`)}
            </button>
          );
        })}
      </div>

      {/* Day type filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {DAY_TYPES.map(({ key, emoji }) => {
          const active = dayTypeFilter === key;
          return (
            <button
              key={key}
              onClick={() => onDayTypeChange(active ? '' : key)}
              style={{
                fontFamily:      ASSIST,
                fontSize:        '12px',
                fontWeight:      active ? 600 : 400,
                padding:         '5px 14px',
                borderRadius:    '50px',
                border:          active
                  ? `1px solid rgba(245,200,64,0.5)`
                  : '1px solid rgba(125,192,132,0.15)',
                backgroundColor: active
                  ? 'rgba(245,200,64,0.15)'
                  : 'rgba(28,58,30,0.5)',
                color:           active ? GOLD : `${PARCH}77`,
                cursor:          'pointer',
                transition:      'background-color 0.15s, border-color 0.15s, color 0.15s',
                whiteSpace:      'nowrap',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125,192,132,0.35)';
                  (e.currentTarget as HTMLElement).style.color = `${PARCH}CC`;
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125,192,132,0.15)';
                  (e.currentTarget as HTMLElement).style.color = `${PARCH}77`;
                }
              }}
            >
              {emoji} {t(`encyclopedia.dayTypes.${key}`)}
            </button>
          );
        })}
      </div>

    </div>
  );
}
