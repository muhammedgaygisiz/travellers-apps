import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { IonApp, provideIonicAngular } from '@ionic/angular/standalone';
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
  },
  {
    placeId: 'place-2',
    name: 'Sushi Palace',
    address: 'Kantstraße 45, 10625 Berlin, Germany',
    position: { latitude: 52.5, longitude: 13.32 },
  },
];

export const Default: Story = {
  args: {
    restaurants: ['Pizza Place', 'Burger Joint', 'Sushi Bar'],
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
