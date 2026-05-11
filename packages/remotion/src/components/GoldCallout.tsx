import { interpolate, useCurrentFrame } from 'remotion';

type Props = {
  children: React.ReactNode;
  appearAt?: number;
};

export const GoldCallout: React.FC<Props> = ({ children, appearAt = 0 }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [appearAt, appearAt + 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        border: '1px solid rgba(201,168,76,0.5)',
        borderRadius: 12,
        padding: '16px 28px',
        background: 'rgba(201,168,76,0.08)',
        color: '#C9A84C',
        fontSize: 28,
        letterSpacing: 2,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
};
