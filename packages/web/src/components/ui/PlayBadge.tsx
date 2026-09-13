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
          alt={'\u05d4\u05d5\u05e8\u05d9\u05d3\u05d5 \u05d0\u05ea \u05d2\u05d9\u05e0\u05d4 \u05d7\u05d9\u05d4 \u05d1-Google Play'}
          width={478}
          height={142}
          loading={loading}
          style={{ display: 'block', height: 'clamp(40px, 11.5vw, 48px)', width: 'auto' }}
        />
      </picture>
    </a>
  );
}
