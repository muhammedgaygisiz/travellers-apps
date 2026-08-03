import type { Bite, Like, PublicUser } from 'model';
import type { Position } from '@capacitor/geolocation';

/** Shared demo fixtures — mirrors Pages/Home, Pages/Bite, Pages/Bitemap stories. */
export const INTRO_DEMO_TAGS: string[] = [
  'alkoholfrei',
  'non-alcohol',
  'bern',
  'drink',
  'halal',
  'street-food',
  'share',
];

/**
 * Feed order for Discover narrative:
 * land on first cards → scroll to Botanic Breeze (3rd / bite1) → open that same bite.
 * Meaningful scroll distance requires the target NOT to be the first card.
 * Extra cards after bite1 support “long browse” flow variants.
 */
export { DISCOVER_TARGET_BITE_ID } from '../intro-story.model';

/** Deep-feed target for long-browse Find flows. */
export const DEEP_FEED_BITE_ID = 'bite6';

/** First visible card — tap-without-scroll Find flows. */
export const FIRST_FEED_BITE_ID = 'bite3';

/** High-rated / nearest after distance sort (Garden Street Bao). */
export const NEAREST_FEED_BITE_ID = 'bite3';

export const INTRO_DEMO_BITES = [
  {
    id: 'bite3',
    name: 'Garden Street Bao',
    image: '',
    imagePath: 'assets/demo/bite-street-bao.png',
    place: 'Markthalle Bern',
    distance: '0.4',
    rating: 4,
    price: 12,
    currency: 'CHF',
    likes: [],
    position: {
      longitude: 7.4445,
      latitude: 46.948,
    },
    tags: ['street-food', 'bern', 'halal'],
    city: 'Bern',
    countryCode: 'CH',
    description:
      'Steamed bao stuffed with bright herbs and crunch — market-stall energy.',
  },
  {
    id: 'bite2',
    name: 'Brausermeisterplatte',
    image: '',
    imagePath: 'assets/demo/bite-brewery-platter.png',
    place: 'Altes Tramdepot',
    distance: '0.62',
    rating: 5,
    price: 24,
    currency: 'CHF',
    likes: [{ likeType: 'thumbup' } as Like, { likeType: 'thumbup' } as Like],
    position: {
      longitude: 7.459679245948792,
      latitude: 46.947513836933084,
    },
    tags: ['bern', 'share'],
    city: 'Bern',
    countryCode: 'CH',
    description:
      'Brewery board with sausages, soft pretzel, pickles, and mustard — made for sharing.',
  },
  {
    id: 'bite1',
    name: 'Botanic Breeze',
    image: '',
    imagePath: 'assets/demo/bite-botanic-breeze.png',
    place: 'Einstein au Jardin',
    distance: '0.6',
    rating: 4,
    price: 9,
    currency: 'CHF',
    likes: [{ likeType: 'thumbup' } as Like],
    position: {
      longitude: 7.452407777309418,
      latitude: 46.94654339581695,
    },
    tags: ['alkoholfrei', 'non-alcohol', 'bern', 'drink'],
    city: 'Bern',
    countryCode: 'CH',
    description:
      'A golden herbal spritz with mint, citrus, and edible flowers — sunlit terrace vibes.',
  },
  {
    id: 'bite4',
    name: 'Lake Quay Fries',
    image: '',
    imagePath: 'assets/demo/bite-demo.png',
    place: 'Marzilibad Kiosk',
    distance: '1.1',
    rating: 3,
    price: 8,
    currency: 'CHF',
    likes: [],
    position: {
      longitude: 7.4412,
      latitude: 46.9431,
    },
    tags: ['bern', 'street-food'],
    city: 'Bern',
    countryCode: 'CH',
    description: 'Crispy fries with lake-breeze salt — summer kiosk classic.',
  },
  {
    id: 'bite5',
    name: 'Old Town Toastie',
    image: '',
    imagePath: 'assets/demo/bite-brewery-platter.png',
    place: 'Café des Pyrénées',
    distance: '0.9',
    rating: 4,
    price: 14,
    currency: 'CHF',
    likes: [{ likeType: 'thumbup' } as Like],
    position: {
      longitude: 7.4481,
      latitude: 46.9489,
    },
    tags: ['bern', 'share'],
    city: 'Bern',
    countryCode: 'CH',
    description: 'Melted cheese toastie with cornichons — alley-café comfort.',
  },
  {
    id: 'bite6',
    name: 'Aare Sunset Scoop',
    image: '',
    imagePath: 'assets/demo/bite-botanic-breeze.png',
    place: 'Eiswerkstatt',
    distance: '1.4',
    rating: 5,
    price: 6,
    currency: 'CHF',
    likes: [
      { likeType: 'thumbup' } as Like,
      { likeType: 'thumbup' } as Like,
      { likeType: 'thumbup' } as Like,
    ],
    position: {
      longitude: 7.4555,
      latitude: 46.9442,
    },
    tags: ['bern', 'drink', 'dessert'],
    city: 'Bern',
    countryCode: 'CH',
    description: 'Gelato by the river — pistachio and blood orange.',
  },
] as Bite[];

export const INTRO_DEMO_CREATOR = {
  userId: '1',
  displayName: 'Lina',
  photoUrl: 'assets/demo/avatar-explorer.png',
} as PublicUser;

/** Second explorer for tribe-building (follow two creators) flows. */
export const INTRO_DEMO_CREATOR_2 = {
  userId: '2',
  displayName: 'Marco',
  photoUrl: 'assets/demo/avatar-demo.png',
} as PublicUser;

/** Nearest / farthest map pin ids for Ready-to-taste distance flows. */
export const NEAREST_MAP_BITE_ID = 'bite3';
export const FARTHEST_MAP_BITE_ID = 'bite6';

export const INTRO_DEMO_POSITION = {
  timestamp: Date.now(),
  coords: {
    latitude: 46.9422564444011,
    longitude: 7.457160053942448,
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
} satisfies Position;

export const INTRO_DEMO_GPS = {
  latitude: 46.9422564444011,
  longitude: 7.457160053942448,
};
