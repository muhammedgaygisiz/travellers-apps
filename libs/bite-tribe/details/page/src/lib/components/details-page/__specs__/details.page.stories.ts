import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { DetailsPage } from '../details.page';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { Bite, Like, PublicUser, ReviewThread } from 'model';
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

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * How old the Bites in the upload-state stories are.
 *
 * These have to stay under `STALE_PENDING_UPLOAD_MS` (ten minutes), because a
 * `pending` upload older than that is rendered as failed and the story would
 * stop showing the state it exists for.
 */
const PENDING_UPLOAD_AGE_MS = 2 * MINUTE_MS;

/**
 * Story timestamps are pinned to an offset from now rather than to a date, so
 * the age renders as the same string on every run and the visual reference
 * stays valid. A fixed date would walk through the units as the calendar moves
 * and fail the reference with no code change behind it — which is exactly what
 * the pipe's old hardcoded fallback date did to these stories. See GitHub issue
 * #1272.
 */
const isoAgo = (ms: number): string => new Date(Date.now() - ms).toISOString();

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
      createdAt: isoAgo(5 * MINUTE_MS),
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

/**
 * The review compartment as a list of conversations. The bottom composer still
 * means "start a new thread", which is what keeps the rule that a new root
 * review notifies only the Bite creator visible in the layout rather than only
 * in the notification behaviour. See GitHub issue #1283.
 */
export const WithReviewThreads: Story = {
  args: {
    ...Default.args,
    reviewThreads: [
      {
        root: {
          id: 'root-1',
          biteId: '/bites/botanic-breeze',
          author: 'Mira',
          authorId: 'mira',
          review: 'Best kebab I had in Kreuzberg, no contest.',
          createdAt: isoAgo(2 * DAY_MS),
        },
        replies: [
          {
            id: 'reply-1',
            biteId: '/bites/botanic-breeze',
            author: 'Mo',
            authorId: '1',
            review: 'Thanks! Try the garlic sauce next time.',
            parentReviewId: 'root-1',
            threadId: 'root-1',
            createdAt: isoAgo(DAY_MS),
          },
        ],
      },
      {
        root: {
          id: 'root-2',
          biteId: '/bites/botanic-breeze',
          author: 'Jonas',
          authorId: 'jonas',
          review: 'Was it very spicy?',
          createdAt: isoAgo(5 * HOUR_MS),
        },
        replies: [],
      },
    ] satisfies ReviewThread[],
  },
};

export const WithDescription: Story = {
  args: {
    ...Default.args,
    bite: {
      ...Default.args?.bite,
      description:
        'A refreshing blend of botanical flavors, perfect for a sunny day in the city. This drink combines herbal notes with a hint of citrus, creating a delightful and invigorating experience.',
    } as unknown as Bite,
  },
};

/**
 * The same Bite three weeks old. `Default` sits in the minute band, so this is
 * what makes the unit selection visible: the pipe picks one unit and renders it
 * in the reader's language rather than composing `3 w 0 d ago`.
 */
export const WithOlderTimestamp: Story = {
  args: {
    ...Default.args,
    bite: {
      ...Default.args?.bite,
      createdAt: isoAgo(21 * DAY_MS),
    } as unknown as Bite,
  },
};

export const WithPreferredCurrency: Story = {
  args: {
    ...WithDescription.args,
    bite: {
      ...WithDescription.args?.bite,
      priceInPreferredCurrency: 9.6,
      priceInPreferredCurrencySymbol: 'EUR',
    } as unknown as Bite,
  },
};

export const MyBite: Story = {
  args: {
    ...WithDescription.args,
    userId: '1',
  },
};

export const NoBite: Story = {
  args: {
    ...WithDescription.args,
    bite: undefined,
  },
};

/**
 * The read came back and the Bite is gone for good. The alert refuses backdrop
 * dismissal and offers only the way back, because a deleted Bite leaves nothing
 * to interact with and nothing to retry. See GitHub issue #1232.
 */
export const BiteNotFound: Story = {
  args: {
    ...NoBite.args,
    biteNotFound: true,
  },
};

/**
 * The read itself failed - a timeout, a rejected permission, an App Check
 * refusal. That says nothing about whether the Bite exists, so the read is
 * offered again next to the way back. The skeletons stay underneath, because
 * the page still has nothing to show. See GitHub issue #1232.
 */
export const BiteUnavailable: Story = {
  args: {
    ...NoBite.args,
    biteUnavailable: true,
  },
};

/**
 * A Bite with no place and no position of its own. Neither half of the
 * place-distance line has anything to say, so the line stays empty rather than
 * rendering the separator and a "-" for a distance that cannot be measured.
 */
export const WithoutPlaceOrDistance: Story = {
  args: {
    ...Default.args,
    bite: {
      ...Default.args?.bite,
      place: '',
      position: undefined,
    } as unknown as Bite,
  },
};

/**
 * A Bite nobody tagged. The read-only tag list is left out entirely rather than
 * heading an empty row, which is the same call as the place-distance line above
 * it.
 */
export const WithoutTags: Story = {
  args: {
    ...Default.args,
    bite: {
      ...Default.args?.bite,
      tags: [],
    } as unknown as Bite,
  },
};

/** A Bite whose place is known while the reader's position is not. */
export const WithoutReaderPosition: Story = {
  args: {
    ...Default.args,
    position: undefined,
  },
};

/**
 * The photo has not arrived yet. The poster is the one holding the transfer, so
 * only they are asked to keep the app open. See GitHub issue #1168.
 */
export const PendingImageForOwner: Story = {
  args: {
    ...Default.args,
    userId: '1',
    bite: {
      id: 'botanic-breeze',
      image: '',
      ...Default.args?.bite,
      imagePath: undefined,
      imageStatus: 'pending',
      userId: '1',
      // Both forms of the creation time, from the same instant: the image
      // status reads the numeric one and the age bar reads the ISO one, and a
      // Bite whose two timestamps disagree is not a state the app can be in.
      createdAt: isoAgo(PENDING_UPLOAD_AGE_MS),
      createdAtTimestamp: Date.now() - PENDING_UPLOAD_AGE_MS,
    } as unknown as Bite,
  },
};

/** The same Bite seen by anyone else, who cannot influence that upload. */
export const PendingImageForViewer: Story = {
  args: {
    ...PendingImageForOwner.args,
    bite: {
      ...Default.args?.bite,
      ...(PendingImageForOwner.args?.bite as Bite),
      userId: 'someone-else',
    },
  },
};

/** An upload that errored, or one abandoned long enough to count as failed. */
export const FailedImage: Story = {
  args: {
    ...Default.args,
    bite: {
      ...Default.args?.bite,
      id: 'botanic-breeze',
      image: '',
      imagePath: undefined,
      imageStatus: 'failed',
      // A stored `failed` is returned as-is, so the age here is free to sit
      // outside the ten-minute pending window.
      createdAt: isoAgo(2 * HOUR_MS),
      createdAtTimestamp: Date.now() - 2 * HOUR_MS,
    } as unknown as Bite,
  },
};
