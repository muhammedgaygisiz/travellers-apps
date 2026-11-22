import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { Restaurant } from 'model';
import { RestaurantPhotos } from '../restaurant-photos';

addNecessaryIcons();

const restaurants = [
  {
    id: 'restaurant-osteria',
    name: 'Osteria Vecchia',
    address: { city: 'Napoli', country: 'Italy' },
  },
  {
    id: 'restaurant-sakura',
    name: 'Sakura Kitchen',
    address: { city: 'Ljubljana', country: 'Slovenia' },
    ownerUserIds: ['owner-1'],
  },
  { id: 'restaurant-unnamed', name: '' },
] as Restaurant[];

export default {
  title: 'Admin/Restaurant Photos',
  component: RestaurantPhotos,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideRouter([]),
        { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
      ],
    }),
  ],
  args: { restaurants, loading: false },
} as Meta<RestaurantPhotos>;

type Story = StoryObj<RestaurantPhotos>;

/**
 * The restaurants with no photo (GitHub issue #1510). One without an owner
 * says so: nobody else can give it a photo.
 */
export const Worklist: Story = {};

/** Every restaurant has a photo. */
export const Empty: Story = { args: { restaurants: [] } };
