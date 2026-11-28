import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { DietaryLabelApprovalEntry } from 'model';
import { DietaryLabelApprovals } from '../dietary-label-approvals';

addNecessaryIcons();

const approvals: DietaryLabelApprovalEntry[] = [
  {
    restaurantId: 'restaurant-thai-garden',
    restaurantName: 'Thai Garden',
    requestedAt: '2026-11-26T09:00:00.000Z',
    items: [
      {
        menuItemId: 'item-pad-thai',
        name: 'Pad Thai - Tofu',
        labels: ['vegan'],
        options: ['gluten-free'],
      },
      {
        menuItemId: 'item-green-curry',
        name: 'Green curry',
        labels: ['halal'],
        options: [],
      },
    ],
  },
];

export default {
  title: 'Admin/Dietary Label Approvals',
  component: DietaryLabelApprovals,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideRouter([]),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
      ],
    }),
  ],
  args: { approvals, loading: false, failed: false },
} as Meta<DietaryLabelApprovals>;

type Story = StoryObj<DietaryLabelApprovals>;

/**
 * A restaurant at the strike limit asked to publish new labels (GitHub issue
 * #2198): one row per label, each approved or refused on its own.
 */
export const Queue: Story = {};

/** Nothing is waiting. */
export const Empty: Story = { args: { approvals: [] } };
