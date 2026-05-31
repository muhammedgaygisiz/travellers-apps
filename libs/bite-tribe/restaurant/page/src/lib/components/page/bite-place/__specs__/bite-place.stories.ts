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
        imagePath:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2F5RaqIaqErWatltveDVAf%2Fd37622f5-1423-43ea-a16e-f64d71b8b08e.jpg?alt=media&token=8f22c176-6680-424e-97fa-09864cfe30a2',
        name: 'Botanic Breeze',
        place: 'Einstein au Jardin',
        rating: 3,
        likes: [{ likeType: 'thumbup' } as Like],
        distance: '0.6',
        price: '9',
        currency: 'CHF',
      } as unknown as Bite,
      {
        imagePath:
          'https://firebasestorage.googleapis.com/v0/b/bite-tribe.firebasestorage.app/o/images%2Fbites%2FjYmma48ToHXcsb3z8NpV%2F74e139dd-86f2-450c-bfd5-e9f974f0c1bf.jpg?alt=media&token=a3ae7571-8247-474a-acde-ad46e286890a',
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
