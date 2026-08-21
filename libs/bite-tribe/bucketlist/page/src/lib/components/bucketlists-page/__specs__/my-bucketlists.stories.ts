import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { BucketlistsPage } from '../bucketlists.page';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { Bucketlist } from 'model';

addNecessaryIcons();

export default {
  title: 'Pages/My Bucket Lists',
  component: BucketlistsPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'BiteTribe' },
      ],
    }),
  ],
} as Meta<BucketlistsPage>;

const BUCKETLISTS: Bucketlist[] = [
  {
    id: '1',
    userId: 'user-1',
    name: 'Cologne',
    biteIds: ['1'],
  } as Bucketlist,
  {
    id: '2',
    userId: 'user-1',
    name: 'Kosovo',
    biteIds: ['1', '2'],
    triedOutBites: [{ biteId: '1', date: '', timestamp: 0 }],
    biteTrailId: 'trail-1',
  } as Bucketlist,
  {
    id: '3',
    userId: 'user-1',
    name: 'London',
    biteIds: ['1', '2', '3', '4', '5', '6', '7', '8', '8', '10'],
  } as Bucketlist,
  {
    id: '4',
    userId: 'user-1',
    name: 'Malta',
    biteIds: ['1', '2', '3', '4', '5'],
    triedOutBites: [
      { biteId: '1', date: '', timestamp: 0 },
      { biteId: '2', date: '', timestamp: 0 },
      { biteId: '3', date: '', timestamp: 0 },
      { biteId: '4', date: '', timestamp: 0 },
      { biteId: '5', date: '', timestamp: 0 },
    ],
  } as Bucketlist,
  {
    id: '5',
    userId: 'user-1',
    name: 'Turkey',
  } as Bucketlist,
];

type Story = StoryObj<BucketlistsPage>;
export const Empty: Story = {
  args: {},
};

export const withBucketlists: Story = {
  args: {
    bucketlists: BUCKETLISTS,
  },
};

const search = async (
  canvasElement: HTMLElement,
  term: string,
): Promise<void> => {
  canvasElement
    .querySelector<HTMLElement>('[data-testid="btn-search"]')
    ?.click();

  await new Promise((resolve) => setTimeout(resolve, 0));

  const searchbar = canvasElement.querySelector('ion-searchbar');

  if (searchbar) {
    searchbar.value = term;
    searchbar.dispatchEvent(new CustomEvent('ionInput'));
  }
};

export const withNameFilter: Story = {
  args: {
    bucketlists: BUCKETLISTS,
  },
  play: async ({ canvasElement }) => search(canvasElement, 'Malta'),
};

export const withNameFilterWithoutMatches: Story = {
  args: {
    bucketlists: BUCKETLISTS,
  },
  play: async ({ canvasElement }) => search(canvasElement, 'Reykjavik'),
};
