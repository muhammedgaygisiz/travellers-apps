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
export const MyBites: Story = {
  args: {
    isAuthenticated: true,
    allTags: ['alkoholfrei', 'non-alcohol', 'bern', 'drink', 'halal'],
    title: 'My Bites',
    showFooter: false,
    showHeaderMenu: false,
    enableBackButton: true,
    editableBites: true,
    bites: [
      {
        id: '1',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
      {
        id: '2',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
      {
        id: '3',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
      {
        id: '4',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
      {
        id: '5',
        name: 'Botanic Breeze',
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        thumbup: 1,
      } as Bite,
      {
        id: '6',
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
