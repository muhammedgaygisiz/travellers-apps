import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { MapPageComponent } from '../map-page.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { Bite, Like } from 'model';

addNecessaryIcons();

export default {
  title: 'Pages/Bitemap',
  component: MapPageComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<MapPageComponent>;

type Story = StoryObj<MapPageComponent>;
export const Empty: Story = {
  args: {
    isAuthenticated: true,
    enableZoom: false,
    gpsPosition: {
      latitude: 46.9422564444011,
      longitude: 7.457160053942448,
    },
  },
};

export const withBites: Story = {
  args: {
    ...Empty.args,
    bites: [
      {
        id: 'bite1',
        name: 'Botanic Breeze',
        image: '',
        price: 0,
        imagePath: 'assets/demo/bite-demo.png',
        place: 'Einstein au Jardin',
        distance: '0.6',
        rating: 3,
        likes: [{ likeType: 'thumbup' } as Like],
        position: {
          longitude: 7.452407777309418,
          latitude: 46.94654339581695,
        },
      } satisfies Bite,
      {
        position: {
          longitude: 7.459679245948792,
          latitude: 46.947513836933084,
        },
        distance: '0.62',
        place: 'Altes Tramdepot',
        rating: 0,
        imagePath: 'assets/demo/bite-demo.png',
        id: 'VTVuwUoOTFqrN3VRnwOO',
        likes: [],
        name: 'Brausmeisterplatte',
        image: '',
        price: 0,
      } satisfies Bite,
    ],
  },
};
