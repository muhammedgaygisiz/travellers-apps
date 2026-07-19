import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { BitePlaceComponent } from '../bite-place.component';
import { Bite, Like } from 'model';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';

addNecessaryIcons();

export default {
  title: 'Pages/Restaurant/Unverified Restaurant',
  component: BitePlaceComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<BitePlaceComponent>;

type Story = StoryObj<BitePlaceComponent>;

const baseBite: Bite = {
  place: 'Einstein au Jardin',
  distance: '0.6',
  position: {
    longitude: 7.452407777309418,
    latitude: 46.94654339581695,
  },
} as Bite;

export const withRatedBites: Story = {
  args: {
    bite: baseBite,
    bites: [
      {
        imagePath: 'assets/demo/bite-demo.png',
        name: 'Botanic Breeze',
        place: 'Einstein au Jardin',
        rating: 3,
        likes: [{ likeType: 'thumbup' } as Like],
        distance: '0.6',
        price: '9',
        currency: 'CHF',
      } as unknown as Bite,
      {
        imagePath: 'assets/demo/bite-demo.png',
        name: 'Aperol Spritz',
        place: 'Einstein au Jardin',
        rating: 4,
        distance: '0.6',
        price: '11',
        currency: 'CHF',
      } as unknown as Bite,
    ],
  },
};

export const withoutRatedBites: Story = {
  args: {
    bite: baseBite,
    bites: [
      {
        name: 'Botanic Breeze',
        place: 'Einstein au Jardin',
        rating: 0,
        distance: '0.6',
        price: '9',
        currency: 'CHF',
      } as unknown as Bite,
      {
        name: 'Aperol Spritz',
        place: 'Einstein au Jardin',
        distance: '0.6',
        price: '11',
        currency: 'CHF',
      } as unknown as Bite,
    ],
  },
};
