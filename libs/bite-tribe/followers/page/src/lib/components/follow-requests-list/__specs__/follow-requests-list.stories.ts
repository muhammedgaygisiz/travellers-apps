import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import type { PendingFollowRequest } from 'model';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { FollowRequestsListComponent } from '../follow-requests-list.component';

addNecessaryIcons();

/**
 * No photos, so the references do not depend on the network. The dates are
 * not rendered, so fixed ones cannot age a reference.
 */
const requests: PendingFollowRequest[] = [
  { requesterUid: 'ana', displayName: 'Ana', createdAt: '2026-11-19T10:00Z' },
  // A private requester: the display name, and nothing else (issue #2165).
  { requesterUid: 'ben', displayName: 'Ben', createdAt: '2026-11-18T10:00Z' },
  // A requester who never set a name.
  { requesterUid: 'cleo', createdAt: '2026-11-17T10:00Z' },
];

export default {
  title: 'Pages/Follow Requests',
  component: FollowRequestsListComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<FollowRequestsListComponent>;

type Story = StoryObj<FollowRequestsListComponent>;

/** The own private profile's pending requests, newest first (issue #2165). */
export const WithRequests: Story = {
  args: { requests },
};

/** Nothing waits for an answer. */
export const Empty: Story = {
  args: { requests: [] },
};
