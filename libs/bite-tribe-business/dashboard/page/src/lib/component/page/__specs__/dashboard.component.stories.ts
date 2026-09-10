import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { Restaurant } from 'model';
import { DashboardComponent } from '../dashboard.component';

addNecessaryIcons();

const trattoria: Restaurant = {
  id: 'restaurant-trattoria',
  name: 'Trattoria Roma',
  position: { latitude: 40.8518, longitude: 14.2681 },
  address: {
    street: 'Via Roma 1',
    postcode: '80100',
    city: 'Napoli',
    country: 'Italy',
  },
} as Restaurant;

const osteria: Restaurant = {
  id: 'restaurant-osteria',
  name: 'Osteria Vecchia',
  position: { latitude: 40.8395, longitude: 14.2529 },
} as Restaurant;

/**
 * A restaurant seeded before the position was required.
 *
 * Leaflet takes a non-numeric coordinate as `NaN` and drops the whole layer
 * rather than the one marker, so the component filters it out. The story keeps
 * it in the input to prove the other two still place.
 */
const withoutPosition = {
  id: 'restaurant-legacy',
  name: 'Café Sperl',
  position: {},
} as Restaurant;

export default {
  title: 'Business/Dashboard',
  component: DashboardComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: {
    isAuthenticated: true,
    gpsPosition: undefined,
    restaurants: [],
  },
} as Meta<DashboardComponent>;

type Story = StoryObj<DashboardComponent>;

/**
 * The map card and the section list side by side.
 *
 * The map baselines as a blank rectangle: Leaflet markers never paint in Loki's
 * Docker Chrome, and the tile layer is deliberately blank under Loki. That is
 * fine here because the map is one card on a page whose subject is the two
 * columns and the section list - see Implementation - Testing, "Operating
 * Loki", for why a story whose subject *is* the markers is skipped instead.
 */
export const WithRestaurants: Story = {
  args: {
    restaurants: [trattoria, osteria, withoutPosition],
    gpsPosition: { latitude: 40.8467, longitude: 14.2585 },
  },
};

/**
 * No device position and no placeable restaurant, so the map is hidden rather
 * than reserving the space for an empty world map.
 */
export const WithoutMap: Story = {
  args: { restaurants: [withoutPosition] },
};
