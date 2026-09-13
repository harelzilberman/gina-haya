import { playStoreUrl } from '@/config/app-links';

interface PlayBadgeProps {
  source: string;
  loading?: 'eager' | 'lazy';
}

export function PlayBadge({ source, loading = 'eager' }: PlayBadgeProps) {
  return (
    <a
      href={playStoreUrl(source)}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-block', margin: '12px' }}
    >
      <picture>
        <source srcSet="/images/app/google-play-badge-en.svg" type="image/svg+xml" />
        <img
          src="/images/app/google-play-badge-en.png"
          alt="הורידו את גינה חיה ב-Google Play"
          width={478}
          height={142}
          loading={loading}
          style={{ display: 'block', height: 'clamp(40px, 11.5vw, 48px)', width: 'auto' }}
        />
      </picture>
    </a>
  );
}
