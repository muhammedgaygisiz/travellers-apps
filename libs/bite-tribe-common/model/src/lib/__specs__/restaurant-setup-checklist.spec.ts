import type { Restaurant } from '../restaurant';
import {
  isRestaurantSection,
  isRestaurantSetUp,
  restaurantSetupChecklist,
} from '../restaurant-setup-checklist';

const BARE = {
  id: 'r-1',
  name: 'Trattoria Roma',
  position: { latitude: 0, longitude: 0 },
} as Restaurant;

const COMPLETE: Restaurant = {
  ...BARE,
  imagePath: 'https://example.test/photo.jpg',
  address: { street: 'Via Roma 1', city: 'Napoli' } as Restaurant['address'],
  openingHours: [
    { day: 'monday', isOpen: true, timeRanges: [] },
  ] as unknown as Restaurant['openingHours'],
  description: 'Neapolitan pizza since 1952.',
  socialMediaLinks: [{ network: 'instagram', url: 'https://instagram.com/x' }],
  facilities: { genderNeutralRestroom: false },
  categories: ['cafe'],
  menuReviewedAtTimestamp: 1,
};

const doneKeys = (restaurant: Restaurant): string[] =>
  restaurantSetupChecklist(restaurant)
    .filter((item) => item.done)
    .map((item) => item.key);

/** See GitHub issue #2126. */
describe('restaurantSetupChecklist', () => {
  it('lists the eight items in a fixed order, none done on a bare restaurant', () => {
    expect(restaurantSetupChecklist(BARE).map((item) => item.key)).toEqual([
      'image',
      'categories',
      'address',
      'opening-hours',
      'description',
      'social-links',
      'facilities',
      'menu-reviewed',
    ]);
    expect(doneKeys(BARE)).toEqual([]);
  });

  it('ticks every item on a complete restaurant, which is then set up', () => {
    expect(doneKeys(COMPLETE)).toHaveLength(8);
    expect(isRestaurantSetUp(COMPLETE)).toBe(true);
    expect(isRestaurantSetUp(BARE)).toBe(false);
  });

  it('sends each item to the screen that completes it (#2183)', () => {
    const targets = Object.fromEntries(
      restaurantSetupChecklist(BARE).map((item) => [item.key, item.target]),
    );

    expect(targets).toEqual({
      image: 'photo',
      categories: 'categories',
      address: 'address',
      'opening-hours': 'opening-hours',
      description: 'about',
      'social-links': 'links',
      facilities: 'facilities',
      'menu-reviewed': 'edit-menu',
    });
  });

  it('counts a facility answered "no" as stated', () => {
    expect(
      doneKeys({ ...BARE, facilities: { genderNeutralRestroom: false } }),
    ).toEqual(['facilities']);
  });

  /** See GitHub issue #2131. */
  it('ticks the category once the restaurant states a known one', () => {
    expect(doneKeys({ ...BARE, categories: ['bar', 'pub'] })).toEqual([
      'categories',
    ]);
    expect(doneKeys({ ...BARE, categories: [] })).toEqual([]);
    expect(
      doneKeys({
        ...BARE,
        categories: ['nightclub'] as unknown as Restaurant['categories'],
      }),
    ).toEqual([]);
  });

  it('does not count blanks: whitespace text, an empty link, a street without a city', () => {
    expect(
      doneKeys({
        ...BARE,
        description: '   ',
        socialMediaLinks: [{ network: 'website', url: '' }],
        address: { street: 'Via Roma 1' } as Restaurant['address'],
        openingHours: [],
      }),
    ).toEqual([]);
  });

  it('does not count a photo that is still uploading', () => {
    expect(doneKeys({ ...BARE, imageStatus: 'pending' })).toEqual([]);
  });

  it('counts a photo from candidate verification as well as one uploaded here', () => {
    expect(doneKeys({ ...BARE, image: 'data:image/jpeg;base64,x' })).toEqual([
      'image',
    ]);
  });

  it('ticks the menu only once an owner has saved it', () => {
    expect(doneKeys({ ...BARE, menuId: '/menus/m-1' })).toEqual([]);
    expect(doneKeys({ ...BARE, menuReviewedAtTimestamp: 1 })).toEqual([
      'menu-reviewed',
    ]);
  });
});

describe('isRestaurantSection', () => {
  it.each([
    ['about', true],
    ['menu-code', true],
    ['menu', false],
    [undefined, false],
  ])('knows whether %j is a section', (value, known) => {
    expect(isRestaurantSection(value)).toBe(known);
  });
});
