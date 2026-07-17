import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { CoachMarkOverlayComponent } from '../coach-mark-overlay.component';

const anchorRect = (partial: Partial<DOMRect>): DOMRect =>
  ({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...partial,
  }) as DOMRect;

export default {
  title: 'Components/Coach Mark Overlay',
  component: CoachMarkOverlayComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    title: 'What is a Bite?',
    body: 'A Bite is a dish worth sharing. Tap one to see where to find it.',
    dismissLabel: 'Got it',
  },
} as Meta<CoachMarkOverlayComponent>;

type Story = StoryObj<CoachMarkOverlayComponent>;

export const SpotlightBelow: Story = {
  args: {
    anchor: anchorRect({
      top: 96,
      left: 24,
      width: 200,
      height: 48,
      bottom: 144,
    }),
  },
};

export const SpotlightAbove: Story = {
  args: {
    anchor: anchorRect({
      top: 620,
      left: 240,
      width: 56,
      height: 56,
      bottom: 676,
    }),
  },
};

export const Centered: Story = {
  args: {
    anchor: null,
  },
};
