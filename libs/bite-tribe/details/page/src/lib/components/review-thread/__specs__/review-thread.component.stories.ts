import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import type { Review, ReviewThread } from 'model';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ReviewThreadComponent } from '../review-thread.component';

addNecessaryIcons();

export default {
  title: 'Components/Review Thread',
  component: ReviewThreadComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<ReviewThreadComponent>;

type Story = StoryObj<ReviewThreadComponent>;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Story timestamps are an offset from now rather than a date, so the rendered
 * age stays the same string on every run and the visual reference does not
 * drift through the units as the calendar moves. Same reasoning as the Bite
 * page stories (issue #1272).
 */
const isoAgo = (ms: number): string => new Date(Date.now() - ms).toISOString();

const MIRA = 'mira';
const ALI = 'ali';
const JONAS = 'jonas';

const root: Review = {
  id: 'root-1',
  biteId: '/bites/bite-1',
  author: 'Mira',
  authorId: MIRA,
  review: 'Best kebab I had in Kreuzberg, no contest.',
  createdAt: isoAgo(2 * DAY_MS),
};

const reply = (
  id: string,
  author: string,
  authorId: string,
  text: string,
  ageMs: number,
): Review => ({
  id,
  biteId: '/bites/bite-1',
  author,
  authorId,
  review: text,
  parentReviewId: 'root-1',
  threadId: 'root-1',
  createdAt: isoAgo(ageMs),
});

const thread = (replies: Review[]): ReviewThread => ({ root, replies });

const twoReplies = [
  reply(
    'reply-1',
    'Ali',
    ALI,
    'Thanks! Try the garlic sauce next time.',
    DAY_MS,
  ),
  reply('reply-2', 'Mira', MIRA, 'Will do 🙌', 20 * HOUR_MS),
];

/** A review nobody has answered yet — the state every thread starts in. */
export const RootOnly: Story = {
  args: {
    thread: thread([]),
    biteCreatorId: ALI,
    canReply: true,
    activeLang: 'en',
  },
};

/** Two answers, which is short enough to read in place without being folded. */
export const WithReplies: Story = {
  args: {
    ...RootOnly.args,
    thread: thread(twoReplies),
  },
};

/**
 * Past two replies the thread folds, so one long conversation cannot push every
 * other review on the Bite off the screen.
 */
export const Collapsed: Story = {
  args: {
    ...RootOnly.args,
    thread: thread([
      ...twoReplies,
      reply('reply-3', 'Jonas', JONAS, 'Was it very spicy?', 5 * HOUR_MS),
      reply(
        'reply-4',
        'Mira',
        MIRA,
        'Not at all, ask for extra chili.',
        HOUR_MS,
      ),
    ]),
  },
};

/**
 * The same long thread as opened by a tapped reply notification: expanded and
 * marked, so the reply the notification was about is what the reader lands on.
 */
export const HighlightedFromNotification: Story = {
  args: {
    ...Collapsed.args,
    highlighted: true,
  },
};

/**
 * Anyone may reply, which is exactly why the Bite's owner is marked: without it
 * an answer from the person who posted the dish reads like one more diner's
 * opinion.
 */
export const CreatorAnswer: Story = {
  args: {
    ...WithReplies.args,
    biteCreatorId: ALI,
  },
};

/** A signed-out visitor reads the conversation but is offered no way into it. */
export const ReadOnly: Story = {
  args: {
    ...WithReplies.args,
    canReply: false,
  },
};
