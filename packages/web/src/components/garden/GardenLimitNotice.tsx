import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EN_HEADING } from '../../styles/fonts';

const BIO_CYAN = '#00e5c3';
const TEXT_MID = '#b0cfbf';

interface Props {
  /** The plan's garden limit (limits.maxGardens). */
  max: number;
  /** Called when the pricing link is followed (e.g. to close a dropdown). */
  onNavigate?: () => void;
  compact?: boolean;
}

/** Shown instead of "+ Add garden" when the user's plan garden limit is reached. */
export function GardenLimitNotice({ max, onNavigate, compact = false }: Props) {
  const { t } = useTranslation('garden');
  return (
    <div
      role="status"
      style={{
        fontFamily: EN_HEADING,
        fontSize: compact ? '11px' : '13px',
        color: `${TEXT_MID}AA`,
        lineHeight: 1.5,
        padding: compact ? '6px 8px' : '8px 12px',
        border: '1px solid rgba(0,229,195,0.2)',
        borderRadius: compact ? '6px' : '8px',
        textAlign: compact ? 'center' : 'start',
      }}
    >
      {t('gardenLimit.message', { max })}{' '}
      <Link
        to="/pricing"
        onClick={onNavigate}
        style={{ color: BIO_CYAN, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
      >
        {t('gardenLimit.upgrade')} ↗
      </Link>
    </div>
  );
}
