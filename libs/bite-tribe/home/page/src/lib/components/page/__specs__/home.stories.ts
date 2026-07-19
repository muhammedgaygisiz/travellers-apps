import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { BiteTribeHomeComponent } from '../home.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { Bite } from 'model';

addNecessaryIcons();

export default {
  title: 'Pages/Home',
  component: BiteTribeHomeComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<BiteTribeHomeComponent>;

type Story = StoryObj<BiteTribeHomeComponent>;
export const Empty: Story = {
  args: {
    isAuthenticated: true,
    allTags: ['alkoholfrei', 'non-alcohol', 'bern', 'drink', 'halal'],
  },
};

export const withBites: Story = {
  args: {
    ...Empty.args,
    bites: [
      {
        id: 'bite1',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
    ],
  },
};

export const Loading: Story = {
  args: {
    ...Empty.args,
    showSpinner: true,
    isBitesLoading: true,
  },
};
