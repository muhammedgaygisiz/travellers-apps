import React from 'react';
import { Composition, Folder } from 'remotion';
import { FakeUiDiscover } from './compositions/FakeUiDiscover';
import { FakeUiShare } from './compositions/FakeUiShare';
import { FakeUiTribe } from './compositions/FakeUiTribe';
import { FakeUiGo } from './compositions/FakeUiGo';
import { IntroReel } from './compositions/IntroReel';
import { FPS, HEIGHT, WIDTH, BEAT_FRAMES } from './timing';

/**
 * DEV-ONLY Remotion root. Videos render into
 * apps/bite-tribe/src/assets/intro-story/ for the Angular intro consumer.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Fake-UI-Beats">
        <Composition
          id="FakeUiDiscover"
          component={FakeUiDiscover}
          durationInFrames={BEAT_FRAMES}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="FakeUiShare"
          component={FakeUiShare}
          durationInFrames={BEAT_FRAMES}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="FakeUiTribe"
          component={FakeUiTribe}
          durationInFrames={BEAT_FRAMES}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="FakeUiGo"
          component={FakeUiGo}
          durationInFrames={BEAT_FRAMES}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      </Folder>
      <Composition
        id="IntroReel"
        component={IntroReel}
        durationInFrames={BEAT_FRAMES * 4}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
