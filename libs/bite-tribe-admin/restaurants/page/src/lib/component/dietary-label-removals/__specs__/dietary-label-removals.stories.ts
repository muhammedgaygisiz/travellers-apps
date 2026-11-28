import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { DietaryLabelRemovals } from '../dietary-label-removals';
import { REQUESTED_REMOVAL, UNREQUESTED_REMOVAL } from './fixtures';

addNecessaryIcons();

export default {
  title: 'Admin/Removed Dietary Labels',
  component: DietaryLabelRemovals,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideRouter([]),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
      ],
    }),
  ],
  args: {
    removals: [REQUESTED_REMOVAL, UNREQUESTED_REMOVAL],
    loading: false,
    failed: false,
  },
} as Meta<DietaryLabelRemovals>;

type Story = StoryObj<DietaryLabelRemovals>;

/**
 * Removed labels waiting for an operator (GitHub issue #2199): one the owner
 * asked back with an explanation, its photo still being checked, and one
 * nobody asked about, which the operator can still restore.
 */
export const Queue: Story = {};

/** Nothing is waiting. */
export const Empty: Story = { args: { removals: [] } };
