import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { FakeUiDiscover } from './FakeUiDiscover';
import { FakeUiShare } from './FakeUiShare';
import { FakeUiTribe } from './FakeUiTribe';
import { FakeUiGo } from './FakeUiGo';
import { BEAT_FRAMES } from '../timing';

/** Full intro reel — four beats sequenced for review. */
export const IntroReel: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={BEAT_FRAMES} name="Discover">
        <FakeUiDiscover />
      </Sequence>
      <Sequence from={BEAT_FRAMES} durationInFrames={BEAT_FRAMES} name="Share">
        <FakeUiShare />
      </Sequence>
      <Sequence from={BEAT_FRAMES * 2} durationInFrames={BEAT_FRAMES} name="Tribe">
        <FakeUiTribe />
      </Sequence>
      <Sequence from={BEAT_FRAMES * 3} durationInFrames={BEAT_FRAMES} name="Go">
        <FakeUiGo />
      </Sequence>
    </AbsoluteFill>
  );
};
