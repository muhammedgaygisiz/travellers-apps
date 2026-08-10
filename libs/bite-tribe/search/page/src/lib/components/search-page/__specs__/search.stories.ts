import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import type { SearchResult } from 'model';
import { SearchPage } from '../search.page';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

const restaurantResults: SearchResult[] = [
  {
    category: 'restaurant',
    value: {
      id: 'restaurant-1',
      name: 'Tandoori House',
      biteId: 'bite-1',
      place: 'Bern, Switzerland',
      position: { latitude: 46.948, longitude: 7.447 },
    },
  },
  {
    category: 'restaurant',
    value: {
      id: 'restaurant-2',
      name: 'Ristorante Milano',
      biteId: 'bite-2',
      place: 'Zurich, Switzerland',
      position: { latitude: 47.3769, longitude: 8.5417 },
    },
  },
  {
    category: 'restaurant',
    value: {
      id: 'restaurant-3',
      name: 'Le Petit Bistro',
      biteId: 'bite-3',
      place: 'Geneva, Switzerland',
      position: { latitude: 46.2044, longitude: 6.1432 },
    },
  },
];

const countryResults: SearchResult[] = [
  {
    category: 'country',
    value: {
      id: 'bite-1',
      name: 'Fondue Moitié-Moitié',
      place: 'Bern',
      position: { latitude: 46.948, longitude: 7.447 },
      rating: 5,
    },
  },
  {
    category: 'country',
    value: {
      id: 'bite-2',
      name: 'Zürcher Geschnetzeltes',
      place: 'Zurich',
      position: { latitude: 47.3769, longitude: 8.5417 },
      rating: 4,
    },
  },
  {
    category: 'country',
    value: {
      id: 'bite-3',
      name: 'Not rated yet',
      place: 'Geneva',
      position: { latitude: 46.2044, longitude: 6.1432 },
    },
  },
];

/**
 * A country returns every one of its Bites in one response, which is the case
 * the paged list exists for: 120 results render as the first 50 plus the
 * infinite scroll that loads the rest.
 */
const manyCountryResults: SearchResult[] = Array.from(
  { length: 120 },
  (_, index) => ({
    category: 'country',
    value: {
      id: `bite-${index}`,
      name: `Bite ${String(index + 1).padStart(3, '0')}`,
      place: 'Berlin',
      position: { latitude: 52.52, longitude: 13.405 },
    },
  }),
);

export default {
  title: 'Pages/Search',
  component: SearchPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<SearchPage>;

type Story = StoryObj<SearchPage>;
export const Default: Story = {};

export const WithResults: Story = {
  args: {
    selectedCategory: 'restaurant',
    results: restaurantResults,
    hasSearched: true,
  },
};

export const EmptyResults: Story = {
  args: {
    selectedCategory: 'restaurant',
    results: [],
    hasSearched: true,
  },
};

/** Country search before a pick: the searchbar is replaced by the picker. */
export const CountryNotPicked: Story = {
  args: {
    selectedCategory: 'country',
    selectedCountryCode: '',
    results: [],
  },
};

/** After a pick, the field carries the flag and the localized country name. */
export const CountryPicked: Story = {
  args: {
    selectedCategory: 'country',
    selectedCountryCode: 'CH',
    results: countryResults,
    hasSearched: true,
  },
};

/** A large country result set, showing the first page of the windowed list. */
export const CountryManyResults: Story = {
  args: {
    selectedCategory: 'country',
    selectedCountryCode: 'DE',
    results: manyCountryResults,
    hasSearched: true,
  },
};

/**
 * Map view: the page drops its 720px desktop cap so the map runs full width,
 * and rated Bites carry their rating in the marker as they do on every other
 * map. The third Bite is unrated and keeps the plain pin.
 */
export const CountryMapView: Story = {
  args: {
    ...CountryPicked.args,
  },
  play: async ({ canvasElement }) => {
    const toggle = canvasElement.querySelector('ion-toggle');
    toggle?.dispatchEvent(
      new CustomEvent('ionChange', { detail: { checked: true } }),
    );
  },
};
