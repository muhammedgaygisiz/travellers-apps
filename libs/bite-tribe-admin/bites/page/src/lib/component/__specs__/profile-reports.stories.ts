import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { ReportedUser } from 'model';
import { ProfileReportsComponent } from '../profile-reports.component';

addNecessaryIcons();

/** Served from the Storybook build, so Loki never reaches an external host. */
const BITE_IMAGE = 'assets/demo/bite-demo.png';

const mostReported: ReportedUser = {
  uid: 'uid-reported-1',
  exists: true,
  displayName: 'real_chef_mo',
  photoUrl: BITE_IMAGE,
  about: 'The one and only Mo. Follow me, not the fake.',
  blocked: false,
  recentBites: [
    { biteId: 'bite-1', name: 'Margherita al forno', imageSrc: BITE_IMAGE },
    { biteId: 'bite-2', name: 'Kaiserschmarrn', imageSrc: BITE_IMAGE },
    { biteId: 'bite-3', name: 'Ramen', imageSrc: '' },
  ],
  reportCount: 5,
  reasons: {
    harassment: 1,
    impersonation: 4,
    spam: 0,
    inappropriate: 0,
    other: 0,
  },
  firstReportedAt: '2026-10-01T09:30:00.000Z',
  lastReportedAt: '2026-10-03T18:05:00.000Z',
};

const noBites: ReportedUser = {
  uid: 'uid-reported-2',
  exists: true,
  displayName: 'hater_42',
  photoUrl: '',
  about: '',
  blocked: false,
  recentBites: [],
  reportCount: 2,
  reasons: {
    harassment: 2,
    impersonation: 0,
    spam: 0,
    inappropriate: 0,
    other: 0,
  },
  firstReportedAt: '2026-10-02T12:00:00.000Z',
  lastReportedAt: '2026-10-02T13:00:00.000Z',
};

const gone: ReportedUser = {
  uid: 'uid-reported-3',
  exists: false,
  displayName: '',
  photoUrl: '',
  about: '',
  blocked: false,
  recentBites: [],
  reportCount: 1,
  reasons: {
    harassment: 0,
    impersonation: 0,
    spam: 1,
    inappropriate: 0,
    other: 0,
  },
  firstReportedAt: '2026-10-04T08:00:00.000Z',
  lastReportedAt: '2026-10-04T08:00:00.000Z',
};

const reports = [mostReported, noBites, gone];

export default {
  title: 'Admin/Profile Reports',
  component: ProfileReportsComponent,
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
  },
} as Meta<ProfileReportsComponent>;

type Story = StoryObj<ProfileReportsComponent>;

/** Nothing is open. */
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
 * The most-reported profile selected: who it presents as, why it was reported,
 * its recent Bites, then the block and the closing.
 */
export const Selected: Story = {
  args: { reports, selected: mostReported },
};

/** Blocked from here; the reports stay open until they are closed. */
export const AccountBlocked: Story = {
  args: {
    reports: [{ ...mostReported, blocked: true }, noBites, gone],
    selected: { ...mostReported, blocked: true },
  },
};

/** A profile with no photo and no Bites. */
export const NoPhotoOrBites: Story = {
  args: { reports, selected: noBites },
};

/** The profile is gone and its reports are not; only closing is left. */
export const ProfileGone: Story = {
  args: { reports, selected: gone },
};

/** The listing failed, which is not an empty queue. */
export const Failed: Story = {
  args: { failed: true },
};
