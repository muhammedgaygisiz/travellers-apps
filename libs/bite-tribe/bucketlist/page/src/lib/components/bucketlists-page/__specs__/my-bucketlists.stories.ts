import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { BucketlistsPage } from '../bucketlists.page';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { Bucketlist } from 'model';

addNecessaryIcons();

export default {
  title: 'Pages/My Bucketlists',
  component: BucketlistsPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
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
        name: 'Turkey',
      } as Bucketlist,
      {
        name: 'Cologne',
        biteIds: ['1'],
      } as Bucketlist,
      {
        name: 'Kosovo',
        biteIds: ['1', '2'],
      } as Bucketlist,
      {
        name: 'Malta',
        biteIds: ['1', '2', '3', '4', '5'],
      } as Bucketlist,
      {
        name: 'London',
        biteIds: ['1', '2', '3', '4', '5', '6', '7', '8', '8', '10'],
      } as Bucketlist,
    ],
  },
};
