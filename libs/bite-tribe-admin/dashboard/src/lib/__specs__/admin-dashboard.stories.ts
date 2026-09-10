import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { AdminDashboard } from '../admin-dashboard';

addNecessaryIcons();

/**
 * The dashboard reads the signed-in account off the store rather than taking an
 * input, so the story provides the two members it touches instead of standing
 * up NgRx. Anything else on `BiteTribeStoreService` would throw if the template
 * reached for it, which is the signal that this stub has gone stale.
 */
const storeStub = {
  user: signal({ email: 'operator@bitetribe.app' }),
  logout: (): void => undefined,
};

export default {
  title: 'Admin/Dashboard',
  component: AdminDashboard,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideRouter([]),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
        { provide: BiteTribeStoreService, useValue: storeStub },
      ],
    }),
  ],
} as Meta<AdminDashboard>;

type Story = StoryObj<AdminDashboard>;

/**
 * Every operator surface the admin app offers, in the order an operator meets
 * them, with the signed-in account named at the foot of the page.
 */
export const Default: Story = {};
