import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import type { Bite } from 'model';
import { BiteListComponent } from '../bite-list.component';

addNecessaryIcons();

const bites: Bite[] = [
  {
    id: 'bite1',
    name: 'Botanic Breeze',
    imagePath: 'assets/demo/bite-demo.png',
    place: 'Einstein au Jardin',
    distance: '0.6',
    rating: 3,
    thumbup: 1,
  } as Bite,
  {
    id: 'bite2',
    name: 'Sunset Sushi',
    imagePath: 'assets/demo/bite-demo.png',
    place: 'Sushi Bar',
    distance: '1.2',
    rating: 4,
    drooling: 1,
  } as Bite,
];

export default {
  title: 'Components/Bite List',
  component: BiteListComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
} as Meta<BiteListComponent>;

type Story = StoryObj<BiteListComponent>;

export const Default: Story = {
  args: {
    bites,
  },
};

export const Empty: Story = {
  args: {
    bites: [],
  },
};

/**
 * The same empty list on My Bites, where the feed's invitation to be the first
 * one is wrong: the user cannot be the first to write their own list. See
 * GitHub issue #1417.
 */
export const EmptyOwnList: Story = {
  args: {
    bites: [],
    emptyMessageKey: 'no-own-bites-yet',
  },
};

/**
 * A search that excludes everything, which is not the same empty state as a
 * feed with nothing in it. See GitHub issue #1331.
 */
export const EmptySearchResult: Story = {
  args: {
    bites: [],
    searchTerm: 'zzzznomatch',
  },
};

export const WithTriedOutSwipe: Story = {
  args: {
    bites,
    enableTriedOutSwipe: true,
    triedOutBiteIds: ['bite1'],
  },
};

export const HasMore: Story = {
  args: {
    bites,
    hasMore: true,
  },
};

export const Loading: Story = {
  args: {
    bites,
    showSkeleton: true,
  },
};
