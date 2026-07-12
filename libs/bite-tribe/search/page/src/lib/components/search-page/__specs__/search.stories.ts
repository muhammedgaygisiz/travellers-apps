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
