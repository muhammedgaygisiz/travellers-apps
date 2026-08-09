import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { IonApp, provideIonicAngular } from '@ionic/angular/standalone';
import { TRANSLOCO_LOADER, Translation } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { RestaurantSelectorComponent } from '../restaurant-selector.component';

addNecessaryIcons();

export default {
  title: 'Components/Restaurant Selector',
  component: RestaurantSelectorComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
    moduleMetadata({
      imports: [RestaurantSelectorComponent, IonApp],
    }),
  ],
  args: {
    restaurants: [],
    selectedRestaurant: '',
    googlePlaces: [],
    googlePlacesLoading: false,
    nearbyGooglePlaces: [],
    nearbyGooglePlacesLoading: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <ion-app>
        <div style="height: 100vh">
          <lib-restaurant-selector
            [restaurants]="restaurants"
            [selectedRestaurant]="selectedRestaurant"
            [googlePlaces]="googlePlaces"
            [googlePlacesLoading]="googlePlacesLoading"
            [nearbyGooglePlaces]="nearbyGooglePlaces"
            [nearbyGooglePlacesLoading]="nearbyGooglePlacesLoading"
          />
        </div>
      </ion-app>
    `,
  }),
} as Meta<RestaurantSelectorComponent>;

type Story = StoryObj<RestaurantSelectorComponent>;

const googlePlaces = [
  {
    placeId: 'place-1',
    name: 'Sushi Corner',
    address: 'Hauptstraße 12, 10827 Berlin, Germany',
    position: { latitude: 52.49, longitude: 13.35 },
    distance: '0.4',
  },
  {
    placeId: 'place-2',
    name: 'Sushi Palace',
    address: 'Kantstraße 45, 10625 Berlin, Germany',
    position: { latitude: 52.5, longitude: 13.32 },
    distance: '1.8',
  },
];

export const Default: Story = {
  args: {
    restaurants: [
      { name: 'Burger Joint', distance: '2.1' },
      { name: 'Pizza Place', distance: '0.4' },
      { name: 'Sushi Bar', distance: '1.3' },
    ],
    selectedRestaurant: '',
    googlePlaces: [],
    googlePlacesLoading: false,
  },
};

export const WithGooglePlaces: Story = {
  args: {
    restaurants: [],
    selectedRestaurant: '',
    googlePlaces,
    googlePlacesLoading: false,
  },
};

export const GoogleSearchLoading: Story = {
  args: {
    restaurants: [],
    selectedRestaurant: '',
    googlePlaces: [],
    googlePlacesLoading: true,
  },
};

export const NearbyGooglePlaces: Story = {
  args: {
    restaurants: [],
    selectedRestaurant: '',
    googlePlaces: [],
    googlePlacesLoading: false,
    nearbyGooglePlaces: googlePlaces,
    nearbyGooglePlacesLoading: false,
  },
};

export const NearbyGooglePlacesLoading: Story = {
  args: {
    restaurants: [],
    selectedRestaurant: '',
    googlePlaces: [],
    googlePlacesLoading: false,
    nearbyGooglePlaces: [],
    nearbyGooglePlacesLoading: true,
  },
};

// German writes the longest cancel label the app ships and French the longest
// title. No single locale pairs them, so the worst case is stated here instead
// of being reachable through the locale toolbar.
const LONGEST_SHIPPED_LABELS: Translation = {
  'restaurant-selector-cancel': 'Abbrechen',
  'restaurant-selector-title': 'Sélectionner un restaurant',
  'restaurant-selector-search-placeholder': 'Restaurants suchen...',
  'restaurant-selector-start-typing': 'Tippe, um Restaurants zu suchen',
};

/**
 * Replaces the http loader rather than the service, so the real Transloco
 * pipeline still renders the labels and the capture stays offline.
 */
const longestLabelsLoader = {
  getTranslation: (): Observable<Translation> => of(LONGEST_SHIPPED_LABELS),
};

/**
 * The widest header the shipped translations can produce. At the narrow Loki
 * device this is the combination that used to render as
 * `AbbrecheRestaurant auswähl...`, with the cancel action and the title on top
 * of each other and both of them clipped. See GitHub issue #1267.
 */
export const LongestHeaderLabels: Story = {
  decorators: [
    applicationConfig({
      providers: [{ provide: TRANSLOCO_LOADER, useValue: longestLabelsLoader }],
    }),
  ],
  args: {
    restaurants: [
      { name: 'Burger Joint', distance: '2.1' },
      { name: 'Pizza Place', distance: '0.4' },
    ],
    selectedRestaurant: '',
    googlePlaces: [],
    googlePlacesLoading: false,
  },
};
