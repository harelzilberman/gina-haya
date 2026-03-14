import { useTier } from '../../hooks/useTier';

export function AdBanner() {
  const { isAdFree } = useTier();

  // Hidden entirely for ad-free tiers
  if (isAdFree) return null;

  return (
    <div className="w-full flex justify-center my-4 px-4">
      {/* Desktop leaderboard 728×90 */}
      <div
        className="hidden sm:flex items-center justify-center rounded-lg"
        style={{
          width: '728px',
          height: '90px',
          backgroundColor: '#F9FAFB',
          border: '1px dashed #D1D5DB',
        }}
      >
        <p className="text-sm" style={{ color: '#9CA3AF' }}>פרסומת — Google AdSense</p>
      </div>

      {/* Mobile banner 320×50 */}
      <div
        className="flex sm:hidden items-center justify-center rounded-lg"
        style={{
          width: '320px',
          height: '50px',
          backgroundColor: '#F9FAFB',
          border: '1px dashed #D1D5DB',
        }}
      >
        <p className="text-xs" style={{ color: '#9CA3AF' }}>פרסומת — Google AdSense</p>
      </div>
    </div>
  );
}
