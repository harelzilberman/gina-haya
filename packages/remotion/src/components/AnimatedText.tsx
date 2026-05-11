import { interpolate, useCurrentFrame } from 'remotion';

type Props = {
  text: string;
  start: number;
  end: number;
  fontSize?: number;
  rtl?: boolean;
};

export const AnimatedText: React.FC<Props> = ({ text, start, end, fontSize = 64, rtl = false }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [start, start + 8, end - 8, end],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    frame,
    [start, start + 12],
    [20, 0],
    { extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        fontSize,
        fontWeight: 300,
        color: '#EDE0C4',
        lineHeight: 1.4,
        letterSpacing: rtl ? 0 : 2,
        textAlign: rtl ? 'right' : 'left',
        textShadow: '0 0 40px rgba(201,168,76,0.5)',
        direction: rtl ? 'rtl' : 'ltr',
      }}
    >
      {text}
    </div>
  );
};
