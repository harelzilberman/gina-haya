import { Composition } from 'remotion';
import { ChupchuIntro } from './compositions/ChupchuIntro';

export const RemotionRoot = () => {
  return (
    <>
      {/* 16:9 YouTube version */}
      <Composition
        id="ChupchuIntro-EN"
        component={ChupchuIntro}
        durationInFrames={30 * 45}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ language: 'en', format: 'youtube' }}
      />
      <Composition
        id="ChupchuIntro-HE"
        component={ChupchuIntro}
        durationInFrames={30 * 45}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ language: 'he', format: 'youtube' }}
      />
      {/* 9:16 Reels version */}
      <Composition
        id="ChupchuIntro-EN-Reel"
        component={ChupchuIntro}
        durationInFrames={30 * 45}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ language: 'en', format: 'reel' }}
      />
      <Composition
        id="ChupchuIntro-HE-Reel"
        component={ChupchuIntro}
        durationInFrames={30 * 45}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ language: 'he', format: 'reel' }}
      />
    </>
  );
};
