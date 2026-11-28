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
    showMyPositionButton: true,
    gpsPosition: {
      latitude: 46.9422564444011,
      longitude: 7.457160053942448,
    },
  },
};

export const WithBites: Story = {
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

// A selected Bite opens in a side panel on a wide screen (laptop) and in the
// snap drawer on a phone (iphone7). Markers stay blank in Loki's Chrome; the
// panel and the drawer are what these references guard.
export const WithSelectedBite: Story = {
  args: {
    ...WithBites.args,
    selectedBite: WithBites.args?.bites?.[0],
  },
};

const tripStop = (
  id: string,
  name: string,
  latitude: number,
  longitude: number,
): Bite =>
  ({
    id,
    name,
    userId: 'user-1',
    position: { latitude, longitude },
    place: name,
    rating: 0,
    imagePath: 'assets/demo/bite-demo.png',
    likes: [] as Like[],
    image: '',
    price: 0,
  }) as Bite;

// A trip's route: its Bites numbered from 1 for the oldest and joined in that
// order (issue #2355). Loki's Chrome paints neither the markers nor the line,
// so a reference would guard nothing; the story is for looking at.
export const TripRoute: Story = {
  parameters: { loki: { skip: true } },
  args: {
    isAuthenticated: true,
    enableZoom: false,
    bites: [
      tripStop('bangkok', 'Pad Thai', 13.7563, 100.5018),
      tripStop('chiang-mai', 'Khao Soi', 18.7883, 98.9853),
      tripStop('hanoi', 'Pho', 21.0278, 105.8342),
    ],
    markerLabels: { bangkok: '1', 'chiang-mai': '2', hanoi: '3' },
    showRoute: true,
    clusterMarkers: false,
  },
};
