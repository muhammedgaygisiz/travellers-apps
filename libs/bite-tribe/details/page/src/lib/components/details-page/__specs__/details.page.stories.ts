import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { DetailsPage } from '../details.page';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { Bite, Like, PublicUser } from 'model';
import { provideIonicAngular } from '@ionic/angular/standalone';
import type { Position } from '@capacitor/geolocation';

addNecessaryIcons();

export default {
  title: 'Pages/Bite',
  component: DetailsPage,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<DetailsPage>;

type Story = StoryObj<DetailsPage>;
export const Default: Story = {
  args: {
    isAuthenticated: true,
    bite: {
      id: 'botanic-breeze',
      image: '',
      imagePath: 'assets/demo/bite-demo.png',
      name: 'Botanic Breeze',
      rating: 3,
      place: 'Einstein au Jardin',
      distance: '0.6',
      likes: [{ likeType: 'thumbup' } as Like],
      position: {
        longitude: 7.452407777309418,
        latitude: 46.94654339581695,
      },
      tags: ['alkoholfrei', 'non-alcohol', 'bern', 'drink', 'halal'],
      price: 9,
      currency: 'CHF',
      city: 'Bern',
      countryCode: 'CH',
    } satisfies Bite,
    biteCreator: {
      userId: '1',
      displayName: 'Mo',
      photoUrl: 'assets/demo/avatar-demo.png',
    } as PublicUser,
    position: {
      timestamp: Date.now(),
      coords: {
        latitude: 37.17314784498405,
        longitude: -3.607173030385677,
        accuracy: 1,
        altitudeAccuracy: null,
        altitude: null,
        speed: null,
        heading: null,
        magneticHeading: null,
        trueHeading: null,
        headingAccuracy: null,
        course: null,
      },
    } satisfies Position,
  },
};

export const withDescription: Story = {
  args: {
    ...Default.args,
    bite: {
      ...Default.args?.bite,
      description:
        'A refreshing blend of botanical flavors, perfect for a sunny day in the city. This drink combines herbal notes with a hint of citrus, creating a delightful and invigorating experience.',
    } as unknown as Bite,
  },
};

export const withPreferredCurrency: Story = {
  args: {
    ...withDescription.args,
    bite: {
      ...withDescription.args?.bite,
      priceInPreferredCurrency: 9.6,
      priceInPreferredCurrencySymbol: 'EUR',
    } as unknown as Bite,
  },
};

export const myBite: Story = {
  args: {
    ...withDescription.args,
    userId: '1',
  },
};

export const noBite: Story = {
  args: {
    ...withDescription.args,
    bite: undefined,
  },
};

/**
 * The photo has not arrived yet. The poster is the one holding the transfer, so
 * only they are asked to keep the app open. See GitHub issue #1168.
 */
export const pendingImageForOwner: Story = {
  args: {
    ...Default.args,
    userId: '1',
    bite: {
      id: 'botanic-breeze',
      image: '',
      imagePath: undefined,
      imageStatus: 'pending',
      userId: '1',
      createdAtTimestamp: Date.now(),
    } as unknown as Bite,
  },
};

/** The same Bite seen by anyone else, who cannot influence that upload. */
export const pendingImageForViewer: Story = {
  args: {
    ...pendingImageForOwner.args,
    bite: {
      ...(pendingImageForOwner.args?.bite as Bite),
      userId: 'someone-else',
    },
  },
};

/** An upload that errored, or one abandoned long enough to count as failed. */
export const failedImage: Story = {
  args: {
    ...Default.args,
    bite: {
      id: 'botanic-breeze',
      image: '',
      imagePath: undefined,
      imageStatus: 'failed',
    } as unknown as Bite,
  },
};
