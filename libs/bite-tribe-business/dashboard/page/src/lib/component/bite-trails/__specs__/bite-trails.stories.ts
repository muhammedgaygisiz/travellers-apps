import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { BiteTrail } from 'model';
import { BiteTrailsComponent } from '../bite-trails';

addNecessaryIcons();

const trail = (over: Partial<BiteTrail>): BiteTrail =>
  ({
    id: 'trail-munich',
    ownerId: 'owner-1',
    ownerName: 'Trattoria Roma',
    ownerImagePath: '',
    name: 'Munich Pretzel Trail',
    biteIds: [],
    imagePath: '',
    location: 'Munich',
    description: '',
    price: 0,
    currency: 'EUR',
    ...over,
  }) as BiteTrail;

export default {
  title: 'Business/Bite Trails',
  component: BiteTrailsComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
      ],
    }),
  ],
  args: { isAuthenticated: true },
} as Meta<BiteTrailsComponent>;

type Story = StoryObj<BiteTrailsComponent>;

/** The account's trails, each with its photo published. */
export const Default: Story = {
  args: {
    biteTrails: [
      trail({ imageStatus: 'uploaded' }),
      trail({ id: 'trail-naples', name: 'Naples Pizza Trail' }),
    ],
  },
};

/** No trails yet: the way to create the first one. */
export const Empty: Story = { args: { biteTrails: [] } };

/**
 * Only the image check publishes a trail's photo (GitHub issue #2141): one
 * still being checked, one whose upload failed, and one the check refused,
 * with the reason.
 */
export const PhotoStates: Story = {
  args: {
    biteTrails: [
      trail({ imageStatus: 'pending' }),
      trail({
        id: 'trail-rome',
        name: 'Rome Gelato Trail',
        imageStatus: 'failed',
      }),
      trail({
        id: 'trail-naples',
        name: 'Naples Pizza Trail',
        imageStatus: 'refused',
        imageRefusalCategory: 'violence',
      }),
    ],
  },
};
