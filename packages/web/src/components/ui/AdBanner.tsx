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
          backgroundColor: '#111f18',
          border: '1px dashed rgba(0,229,195,0.2)',
        }}
      >
        <p className="text-sm" style={{ color: '#6b9080' }}>פרסומת — Google AdSense</p>
      </div>

      {/* Mobile banner 320×50 */}
      <div
        className="flex sm:hidden items-center justify-center rounded-lg"
        style={{
          width: '320px',
          height: '50px',
          backgroundColor: '#111f18',
          border: '1px dashed rgba(0,229,195,0.2)',
        }}
      >
        <p className="text-xs" style={{ color: '#6b9080' }}>פרסומת — Google AdSense</p>
      </div>
    </div>
  );
}
