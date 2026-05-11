import { Img, staticFile, spring, useCurrentFrame, useVideoConfig } from 'remotion';

type Props = {
  size?: number;
};

export const ChupchuCharacter: React.FC<Props> = ({ size = 420 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 80 } });
  const floatY = Math.sin(frame / 40) * 8;

  return (
    <div
      style={{
        transform: `translateY(${(1 - entry) * 100 + floatY}px) scale(${0.5 + entry * 0.5})`,
        opacity: entry,
      }}
    >
      <Img
        src={staticFile('chupchu_final.png')}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 40px rgba(201,168,76,0.4))',
        }}
      />
    </div>
  );
};
