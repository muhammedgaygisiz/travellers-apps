import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { BucketlistsPage } from '../bucketlists.page';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { Bucketlist } from 'model';
import { provideTransloco } from '@jsverse/transloco';

addNecessaryIcons();

export default {
  title: 'Pages/My Bucket Lists',
  component: BucketlistsPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
        provideTransloco({
          config: {
            availableLangs: ['en'],
            fallbackLang: ['en'],
          },
        }),
      ],
    }),
  ],
} as Meta<BucketlistsPage>;

type Story = StoryObj<BucketlistsPage>;
export const Empty: Story = {
  args: {},
};

export const withBucketlists: Story = {
  args: {
    bucketlists: [
      {
        id: '1',
        userId: 'user-1',
        name: 'Turkey',
      } as Bucketlist,
      {
        id: '2',
        userId: 'user-1',
        name: 'Cologne',
        biteIds: ['1'],
      } as Bucketlist,
      {
        id: '3',
        userId: 'user-1',
        name: 'Kosovo',
        biteIds: ['1', '2'],
        biteTrailId: 'trail-1',
      } as Bucketlist,
      {
        id: '4',
        userId: 'user-1',
        name: 'Malta',
        biteIds: ['1', '2', '3', '4', '5'],
      } as Bucketlist,
      {
        id: '5',
        userId: 'user-1',
        name: 'London',
        biteIds: ['1', '2', '3', '4', '5', '6', '7', '8', '8', '10'],
      } as Bucketlist,
    ],
  },
};
