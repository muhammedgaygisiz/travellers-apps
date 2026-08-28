import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { LikesComponent } from '../likes.component';

export default {
  title: 'Components/Likes',
  component: LikesComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<LikesComponent>;

type Story = StoryObj<LikesComponent>;

export const NoLikes: Story = {
  args: {
    biteId: 'bite1',
    likeCounts: { thumbup: 0, drooling: 0, mindblown: 0 },
  },
};

export const WithLikes: Story = {
  args: {
    biteId: 'bite1',
    likeCounts: { thumbup: 2, drooling: 1, mindblown: 0 },
  },
};

export const LikedByMe: Story = {
  args: {
    biteId: 'bite1',
    likeCounts: { thumbup: 2, drooling: 1, mindblown: 0 },
    userLikeType: 'thumbup',
  },
};

/**
 * The viewer's own Bite. The chip reports how it was received but is not a
 * control, so it drops its fill and its top/left edge.
 */
export const ReadOnly: Story = {
  args: {
    biteId: 'bite1',
    likeCounts: { thumbup: 2, drooling: 1, mindblown: 0 },
    readonly: true,
  },
};

/**
 * A read-only chip with no likes yet has nothing to report and would only show
 * an untappable thumbs-up, so nothing is rendered.
 */
export const ReadOnlyWithoutLikes: Story = {
  args: {
    biteId: 'bite1',
    likeCounts: { thumbup: 0, drooling: 0, mindblown: 0 },
    readonly: true,
  },
  parameters: {
    /**
     * Excluded from the visual-regression run. Rendering nothing is the whole
     * point of this story, and Loki cannot screenshot a zero-height root - it
     * fails the story outright rather than capturing an empty baseline.
     */
    loki: { skip: true },
  },
};
