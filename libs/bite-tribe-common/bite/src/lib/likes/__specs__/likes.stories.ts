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
 * Opens the reaction options from the chip and taps one, as a user does. The
 * popover lives at the document root, outside the story's canvas.
 */
const react = async (
  canvasElement: HTMLElement,
  likeType: string,
): Promise<void> => {
  canvasElement
    .querySelector<HTMLElement>('[data-testid="like-chip"]')
    ?.click();

  for (let attempt = 0; attempt < 50; attempt++) {
    const option = document.querySelector<HTMLElement>(
      `[data-testid="like-option-${likeType}"]`,
    );

    if (option) {
      option.click();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

/**
 * These two exist to show motion, which a still image cannot hold, and they
 * drive a popover whose timing would make a capture flaky - so they are kept
 * out of the visual-regression run. Replay them from the toolbar to watch.
 */
const MOTION_ONLY = { loki: { skip: true } };

/**
 * Choosing a reaction: its emoji pops once and settles, on the frame the
 * `selection` haptic plays (issue #1749).
 */
export const SelectReaction: Story = {
  args: WithLikes.args,
  parameters: MOTION_ONLY,
  play: async ({ canvasElement }) => react(canvasElement, 'drooling'),
};

/** Taking a reaction back: it settles without a pop. */
export const RemoveReaction: Story = {
  args: LikedByMe.args,
  parameters: MOTION_ONLY,
  play: async ({ canvasElement }) => react(canvasElement, 'thumbup'),
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
