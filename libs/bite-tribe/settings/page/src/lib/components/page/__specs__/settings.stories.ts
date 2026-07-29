import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { PageSettings } from '../settings.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Settings',
  component: PageSettings,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<PageSettings>;

type Story = StoryObj<PageSettings>;
export const Default: Story = {};

export const NotificationsAllowed: Story = {
  args: {
    settings: {
      pushNotifications: true,
      location: true,
      emailUpdates: false,
      theme: 'light',
      currency: 'EUR',
      favoriteCurrencies: [],
      language: 'en',
    },
    pushPermissionState: 'granted',
  },
};

export const NotificationsBlocked: Story = {
  args: {
    settings: {
      pushNotifications: true,
      location: true,
      emailUpdates: false,
      theme: 'light',
      currency: 'EUR',
      favoriteCurrencies: [],
      language: 'en',
    },
    pushPermissionState: 'denied',
  },
};
