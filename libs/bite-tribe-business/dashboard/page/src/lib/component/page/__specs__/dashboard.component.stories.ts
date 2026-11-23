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
    // Every story shows a finished read; the loading state is the bare page.
    restaurantsLoaded: true,
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
 * No device position and no placeable restaurant. The map is not drawn as an
 * empty world map; a placeholder says the restaurant shows once its position
 * is set (GitHub issue #2127).
 */
export const WithoutMap: Story = {
  args: { restaurants: [withoutPosition] },
};

/**
 * A restaurant an operator has just handed over (GitHub issue #2126). Its
 * photo and address came with it, so those are ticked; everything else is
 * what the owner still has to do, and each item opens the screen that does
 * it. The menu built from Bite evidence counts once an owner has saved it.
 */
export const NewOwnerChecklist: Story = {
  args: {
    restaurants: [
      {
        ...trattoria,
        imagePath: 'assets/demo/bite-demo.png',
        menuId: '/menus/menu-trattoria',
      } as Restaurant,
    ],
    // The menu came built from Bites, so the checklist names it (#2302).
    menusBuiltFromBites: new Set([trattoria.id as string]),
  },
};

/**
 * Every item is ticked, so the checklist no longer shows and the dashboard is
 * the map and the sections again (GitHub issue #2126).
 */
export const SetUp: Story = {
  args: {
    restaurants: [
      {
        ...trattoria,
        imagePath: 'assets/demo/bite-demo.png',
        description: 'Wood-fired since 1974.',
        openingHours: [{ day: 'monday', isOpen: true, timeRanges: [] }],
        socialMediaLinks: [
          { network: 'instagram', url: 'https://instagram.com/x' },
        ],
        facilities: { genderNeutralRestroom: true },
        categories: ['restaurant'],
        menuReviewedAtTimestamp: 1,
      } as Restaurant,
    ],
    gpsPosition: { latitude: 40.8467, longitude: 14.2585 },
  },
};

/**
 * An account holding the business role but no restaurant yet (GitHub issue
 * #2127). Assigning the restaurant is a second operator step, so the page
 * says that is what happens next and offers support and "Check again",
 * instead of a bare map that read as a broken app.
 */
export const NoRestaurantYet: Story = {
  args: {
    restaurants: [],
    restaurantsLoaded: true,
  },
};
