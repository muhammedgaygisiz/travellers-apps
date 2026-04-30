import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { BitePage } from '../bite.page';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

export default {
  title: 'Pages/Create Bite',
  component: BitePage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<BitePage>;

type Story = StoryObj<BitePage>;
export const Empty: Story = {
  args: {
    position: {
      latitude: 46.9422564444011,
      longitude: 7.457160053942448,
    },
  },
};

export const WithTagSuggestions: Story = {
  args: {
    position: {
      latitude: 46.9422564444011,
      longitude: 7.457160053942448,
    },
    suggestedTags: ['vegan', 'spicy', 'gluten-free', 'dessert', 'quick'],
  },
};
