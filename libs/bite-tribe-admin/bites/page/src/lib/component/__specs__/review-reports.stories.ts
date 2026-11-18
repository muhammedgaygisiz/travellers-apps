import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { ReportedReview } from 'model';
import { ReviewReportsComponent } from '../review-reports.component';

addNecessaryIcons();

const reply: ReportedReview = {
  reviewId: 'reply-1',
  exists: true,
  text: 'Nobody asked for your opinion. Stick to instant noodles.',
  authorUid: 'uid-troll',
  authorDisplayName: 'noodle_critic',
  biteId: 'bite-1',
  biteName: 'Tonkotsu ramen',
  parent: {
    reviewId: 'review-1',
    text: 'The broth was rich but a little too salty for me.',
    authorDisplayName: 'Mira',
  },
  reportCount: 3,
  reasons: { harassment: 2, hate: 1, spam: 0, inappropriate: 0, other: 0 },
  firstReportedAt: '2026-11-01T09:30:00.000Z',
  lastReportedAt: '2026-11-03T18:05:00.000Z',
};

const review: ReportedReview = {
  reviewId: 'review-2',
  exists: true,
  text: 'Get 50% off at my place down the road, DM me.',
  authorUid: 'uid-spammer',
  authorDisplayName: 'best_deals_4u',
  biteId: 'bite-2',
  biteName: 'Margherita al forno',
  reportCount: 1,
  reasons: { harassment: 0, hate: 0, spam: 1, inappropriate: 0, other: 0 },
  firstReportedAt: '2026-11-02T12:00:00.000Z',
  lastReportedAt: '2026-11-02T12:00:00.000Z',
};

const gone: ReportedReview = {
  reviewId: 'reply-3',
  exists: false,
  text: '',
  authorUid: '',
  authorDisplayName: '',
  biteId: 'bite-1',
  biteName: 'Tonkotsu ramen',
  parent: { reviewId: 'review-1', text: '', authorDisplayName: '' },
  reportCount: 1,
  reasons: { harassment: 0, hate: 0, spam: 0, inappropriate: 1, other: 0 },
  firstReportedAt: '2026-10-30T08:00:00.000Z',
  lastReportedAt: '2026-10-30T08:00:00.000Z',
};

const reports = [reply, review, gone];

export default {
  title: 'Admin/Review Reports',
  component: ReviewReportsComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
      ],
    }),
  ],
  args: {
    reports: [],
    loading: false,
    loaded: true,
    failed: false,
    truncated: false,
    selected: undefined,
    action: undefined,
    blockedAuthors: new Set<string>(),
  },
} as Meta<ReviewReportsComponent>;

type Story = StoryObj<ReviewReportsComponent>;

/** Nothing is open. */
export const Empty: Story = {};

/** The queue with nothing selected yet. */
export const Queue: Story = {
  args: { reports },
};

/**
 * A reported reply selected: the item it answers, the reply, why it was
 * reported, then the block and the keep.
 */
export const SelectedReply: Story = {
  args: { reports, selected: reply },
};

/** A top-level review has no context above it. */
export const SelectedReview: Story = {
  args: { reports, selected: review },
};

/** Blocked from here; the review stays until it is kept. */
export const AuthorBlocked: Story = {
  args: {
    reports,
    selected: reply,
    blockedAuthors: new Set([reply.authorUid]),
  },
};

/** The review is gone and its reports are not; only keeping is left. */
export const ReviewGone: Story = {
  args: { reports, selected: gone },
};

/** The listing failed, which is not an empty queue. */
export const Failed: Story = {
  args: { failed: true },
};
