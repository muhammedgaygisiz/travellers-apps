import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { ReportedBite } from 'model';
import { BiteReportsComponent } from '../bite-reports.component';

addNecessaryIcons();

/** Served from the Storybook build, so Loki never reaches an external host. */
const BITE_IMAGE = 'assets/demo/bite-demo.png';

const mostReported: ReportedBite = {
  biteId: 'bite-7Qk2ZzV1',
  exists: true,
  name: 'Margherita al forno',
  place: 'Trattoria Roma',
  description: 'Best pizza in town, order through my link for a discount.',
  tags: ['pizza', 'napoli'],
  imageSrc: BITE_IMAGE,
  authorUid: 'uid-author-1',
  authorDisplayName: 'pizza_promo',
  reportCount: 4,
  reasons: { spam: 3, notFood: 0, inappropriate: 0, harassment: 0, other: 1 },
  firstReportedAt: '2026-10-01T09:30:00.000Z',
  lastReportedAt: '2026-10-03T18:05:00.000Z',
};

const authorDeleted: ReportedBite = {
  biteId: 'bite-3Hd9Lm4P',
  exists: true,
  name: 'Kaiserschmarrn',
  place: 'Café Sperl',
  description: '',
  tags: [],
  imageSrc: '',
  authorUid: '',
  authorDisplayName: '',
  reportCount: 1,
  reasons: { spam: 0, notFood: 1, inappropriate: 0, harassment: 0, other: 0 },
  firstReportedAt: '2026-10-02T12:00:00.000Z',
  lastReportedAt: '2026-10-02T12:00:00.000Z',
};

const gone: ReportedBite = {
  biteId: 'bite-91TbQx8s',
  exists: false,
  name: '',
  place: '',
  description: '',
  tags: [],
  imageSrc: '',
  authorUid: '',
  authorDisplayName: '',
  reportCount: 1,
  reasons: { spam: 0, notFood: 0, inappropriate: 0, harassment: 1, other: 0 },
  firstReportedAt: '2026-10-04T08:00:00.000Z',
  lastReportedAt: '2026-10-04T08:00:00.000Z',
};

const reports = [mostReported, authorDeleted, gone];

export default {
  title: 'Admin/Bite Reports',
  component: BiteReportsComponent,
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
    authorBlocked: false,
    action: undefined,
  },
} as Meta<BiteReportsComponent>;

type Story = StoryObj<BiteReportsComponent>;

/** Nothing is open: the state an operator hopes to find. */
export const Empty: Story = {};

/** The listing is running. */
export const Loading: Story = {
  args: { loading: true, loaded: false },
};

/** The queue with nothing selected yet. */
export const Queue: Story = {
  args: { reports },
};

/**
 * The most-reported Bite selected: the image leads, then why it was reported,
 * then the three answers in rising order of consequence.
 */
export const Selected: Story = {
  args: { reports, selected: mostReported },
};

/** The author was blocked from here, so the block is not offered again. */
export const AuthorBlocked: Story = {
  args: { reports, selected: mostReported, authorBlocked: true },
};

/** The author deleted their account, so there is nobody to block. */
export const AuthorDeleted: Story = {
  args: { reports, selected: authorDeleted },
};

/** The Bite is gone and its reports are not; only dismissal is left. */
export const BiteGone: Story = {
  args: { reports, selected: gone },
};

/** More reports were open than one listing reads. */
export const Truncated: Story = {
  args: { reports, truncated: true },
};

/** The listing failed, which is not an empty queue. */
export const Failed: Story = {
  args: { failed: true },
};
