import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { HomeComponent } from '../components';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { FILTERS, PRICES } from './data';
import { provideLocalization } from 'localization';
import { provideHttpClient } from '@angular/common/http';

addNecessaryIcons();

export default {
  title: 'Pages/Home',
  component: HomeComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideLocalization(),
        provideHttpClient(),
      ],
    }),
  ],
  render: (args) => ({
    props: {
      ...args,
    },
  }),
} as Meta<HomeComponent>;

type Story = StoryObj<HomeComponent>;

export const Primary: Story = {
  args: {
    isAuthenticated: true,
    filteredPrices: PRICES,
    filters: FILTERS,
  },
};

export const Empty: Story = {
  args: {
    isAuthenticated: true,
    filters: [
      {
        type: 'location',
        value: 'Cologne',
      },
    ],
    location: 'Cologne',
  },
};
