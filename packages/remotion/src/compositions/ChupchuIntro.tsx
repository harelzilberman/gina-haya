import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from 'remotion';

type Props = {
  language: 'he' | 'en';
  format: 'youtube' | 'reel';
};

const LINES_EN = [
  { text: 'Hello, dear friend.', start: 0, end: 60 },
  { text: 'I am Chupchu.', start: 65, end: 115 },
  { text: 'Once I was a robot sailing between the stars.', start: 120, end: 210 },
  { text: 'I fell. I crashed into an old wise tree.', start: 215, end: 300 },
  { text: 'And the tree... taught me to breathe.', start: 305, end: 390 },
  { text: 'Since then I live here, among the roots and leaves.', start: 400, end: 490 },
  { text: 'The moon is my clock. The earth is my book.', start: 495, end: 570 },
  { text: 'And your garden — is our story.', start: 575, end: 640 },
  { text: 'Let us grow together.', start: 650, end: 720 },
  { text: 'Gina Haya — Living Garden 🌿', start: 730, end: 800 },
];

const LINES_HE = [
  { text: 'שלום, חבר יקר.', start: 0, end: 60 },
  { text: "אני צ'ופצ'ו.", start: 65, end: 115 },
  { text: 'פעם הייתי רובוט שטס בין הכוכבים.', start: 120, end: 210 },
  { text: 'נפלתי. התרסקתי לתוך עץ ישן וחכם.', start: 215, end: 300 },
  { text: 'והעץ... לימד אותי לנשום.', start: 305, end: 390 },
  { text: 'מאז אני גר כאן, בין השורשים והעלים.', start: 400, end: 490 },
  { text: 'הירח הוא השעון שלי. האדמה היא הספר שלי.', start: 495, end: 570 },
  { text: 'והגינה שלך — היא הסיפור שלנו.', start: 575, end: 640 },
  { text: 'בוא נגדל יחד.', start: 650, end: 720 },
  { text: 'גינה חיה 🌿', start: 730, end: 800 },
];

export const ChupchuIntro: React.FC<Props> = ({ language, format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isRTL = language === 'he';
  const lines = language === 'he' ? LINES_HE : LINES_EN;
  const isReel = format === 'reel';

  const activeLine = lines.find(l => frame >= l.start && frame <= l.end);

  const chupEntry = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const floatY = Math.sin(frame / 40) * 8;
  const bgOpacity = interpolate(frame, [0, 30], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a1a0b 0%, #142B16 50%, #0d1f1a 100%)',
        fontFamily: isRTL ? 'Arial, sans-serif' : 'Georgia, serif',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {/* Audio */}
      <Audio
        src={staticFile(
          language === 'he'
            ? 'chupchu_intro_he_final.wav'
            : 'chupchu_intro_en_final.wav'
        )}
      />

      {/* Background glow */}
      <AbsoluteFill
        style={{
          opacity: bgOpacity,
          background:
            'radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Star particles */}
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: (i % 3) + 1,
            height: (i % 3) + 1,
            borderRadius: '50%',
            background: 'rgba(201,168,76,0.6)',
            top: `${(i * 37) % 100}%`,
            left: `${(i * 53) % 100}%`,
            opacity: 0.3 + Math.sin(frame / 20 + i) * 0.3,
          }}
        />
      ))}

      {/* Chupchu character */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `translateY(${(1 - chupEntry) * 100 + floatY}px) scale(${0.5 + chupEntry * 0.5})`,
            opacity: chupEntry,
          }}
        >
          <Img
            src={staticFile('chupchu_final.png')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              filter: 'drop-shadow(0 0 80px rgba(201,168,76,0.6))',
            }}
          />
        </div>
      </AbsoluteFill>

      {/* Text area */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: '60px',
          paddingLeft: '80px',
          paddingRight: '80px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            padding: '40px 80px 60px',
            width: '100%',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          {activeLine && (
            <div
              key={activeLine.text}
              style={{
                opacity: interpolate(
                  frame,
                  [activeLine.start, activeLine.start + 8, activeLine.end - 8, activeLine.end],
                  [0, 1, 1, 0]
                ),
                transform: `translateY(${interpolate(
                  frame,
                  [activeLine.start, activeLine.start + 12],
                  [20, 0],
                  { extrapolateRight: 'clamp' }
                )}px)`,
              }}
            >
              <div
                style={{
                  fontSize: isReel ? 48 : 72,
                  fontWeight: 300,
                  color: '#EDE0C4',
                  lineHeight: 1.6,
                  letterSpacing: 3,
                  textAlign: 'center',
                  fontStyle: 'italic',
                  textShadow: `
                    0 0 80px rgba(0,0,0,0.9),
                    0 0 40px rgba(0,0,0,0.8),
                    0 2px 4px rgba(0,0,0,0.9)
                  `,
                  width: '100%',
                  maxWidth: '100%',
                }}
              >
                {activeLine.text}
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Gold bottom line */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: '10%',
          right: '10%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
          opacity: interpolate(frame, [20, 50], [0, 1]),
        }}
      />

      {/* Watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 24,
          color: 'rgba(201,168,76,0.5)',
          letterSpacing: 4,
          opacity: interpolate(frame, [30, 60], [0, 1]),
        }}
      >
        gina-haya.com
      </div>
    </AbsoluteFill>
  );
};
