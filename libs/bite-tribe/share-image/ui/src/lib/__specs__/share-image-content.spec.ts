import type { Bite } from 'model';
import {
  applyFieldSwitches,
  availableFields,
  celebrationOf,
  DEFAULT_FIELD_SWITCHES,
  SHARE_IMAGE_FIELDS,
  toShareImageContent,
} from '../share-image-content';

const createBite = (overrides: Partial<Bite> = {}): Bite => ({
  id: 'bite-1',
  name: 'Pad thai',
  image: '',
  place: 'Som Tam Nua',
  city: 'Bangkok',
  price: 120,
  currency: 'THB',
  rating: 4,
  position: { latitude: 13.74, longitude: 100.53 },
  formatted: '392/14 Siam Square Soi 5, Bangkok',
  ...overrides,
});

describe(toShareImageContent.name, () => {
  it('carries the dish, the place and city, the price and the rating', () => {
    const content = toShareImageContent(createBite(), 'en');

    expect(content.dishName).toBe('Pad thai');
    expect(content.placeLine).toBe('Som Tam Nua · Bangkok');
    expect(content.price).toBe(
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: 'THB',
      }).format(120),
    );
    expect(content.rating).toBe(4);
  });

  it('points the QR code at the shared link and nothing else', () => {
    expect(toShareImageContent(createBite(), 'en').qrUrl).toBe(
      'https://bitetribe.app/s/bite/bite-1',
    );
  });

  it('never carries the address or the coordinates', () => {
    const drawn = JSON.stringify(toShareImageContent(createBite(), 'en'));

    expect(drawn).not.toContain('Siam Square');
    expect(drawn).not.toContain('13.74');
    expect(drawn).not.toContain('100.53');
  });

  it('leaves out a price the Bite does not have', () => {
    expect(
      toShareImageContent(createBite({ price: 0 }), 'en').price,
    ).toBeUndefined();
  });

  it('leaves out a rating the Bite does not have', () => {
    expect(
      toShareImageContent(createBite({ rating: undefined }), 'en').rating,
    ).toBeUndefined();
  });

  it('shows the place alone when the Bite has no city', () => {
    expect(
      toShareImageContent(createBite({ city: undefined }), 'en').placeLine,
    ).toBe('Som Tam Nua');
  });

  it('shows a bare number for a price without a currency', () => {
    expect(
      toShareImageContent(createBite({ currency: undefined }), 'en').price,
    ).toBe('120');
  });

  it('keeps a rating above five at five', () => {
    expect(toShareImageContent(createBite({ rating: 7 }), 'en').rating).toBe(5);
  });

  it('still shows a price in a currency Intl does not know', () => {
    expect(
      toShareImageContent(createBite({ currency: 'XYZW' }), 'en').price,
    ).toBe('XYZW 120');
  });
});

/** The composer's switches (UC-SBS R-6, R-8, issue #1728). */
describe('field switches', () => {
  const content = toShareImageContent(
    createBite(),
    'en',
    'Super Mario',
    'My first Bite in Thailand',
  );

  it('starts with every field on except the sharer’s own name', () => {
    expect(DEFAULT_FIELD_SWITCHES.creatorName).toBe(false);
    SHARE_IMAGE_FIELDS.filter((field) => field !== 'creatorName').forEach(
      (field) => expect(DEFAULT_FIELD_SWITCHES[field]).toBe(true),
    );
  });

  it('offers a switch for every field the Bite has a value for', () => {
    expect(availableFields(content)).toEqual([...SHARE_IMAGE_FIELDS]);
  });

  it('offers no switch for a field the Bite has no value for', () => {
    const fields = availableFields(
      toShareImageContent(
        createBite({ price: 0, rating: undefined, place: '', city: '' }),
        'en',
      ),
    );

    expect(fields).toEqual(['photo', 'dishName']);
  });

  it('offers no name switch without a public name', () => {
    expect(
      availableFields(toShareImageContent(createBite(), 'en')),
    ).not.toContain('creatorName');
  });

  it('offers no celebration switch on a Bite that was no first', () => {
    expect(
      availableFields(toShareImageContent(createBite(), 'en')),
    ).not.toContain('celebration');
  });

  it('starts with the celebration on', () => {
    expect(DEFAULT_FIELD_SWITCHES.celebration).toBe(true);
  });

  it('has no switch for the QR code or the wordmark', () => {
    expect(SHARE_IMAGE_FIELDS).not.toContain('qr');
    expect(SHARE_IMAGE_FIELDS).not.toContain('wordmark');
  });

  it('removes every switched-off field, and keeps the QR code', () => {
    const allOff = Object.fromEntries(
      SHARE_IMAGE_FIELDS.map((field) => [field, false]),
    ) as typeof DEFAULT_FIELD_SWITCHES;

    expect(applyFieldSwitches(content, allOff)).toEqual({
      showPhoto: false,
      dishName: '',
      placeLine: '',
      price: undefined,
      rating: undefined,
      qrUrl: 'https://bitetribe.app/s/bite/bite-1',
      creatorName: undefined,
    });
  });

  it('keeps every switched-on field', () => {
    const allOn = Object.fromEntries(
      SHARE_IMAGE_FIELDS.map((field) => [field, true]),
    ) as typeof DEFAULT_FIELD_SWITCHES;

    expect(applyFieldSwitches(content, allOn)).toEqual({
      ...content,
      showPhoto: true,
    });
  });
});

/** Which first a Bite was, from the sharer's own Bites (issue #1837). */
describe(celebrationOf.name, () => {
  const at = (
    id: string,
    createdAtTimestamp: number,
    countryCode?: string,
  ): Bite => createBite({ id, createdAtTimestamp, countryCode });

  const first = at('first', 1, 'DE');
  const second = at('second', 2, 'DE');
  const third = at('third', 3, 'TH');
  const fourth = at('fourth', 4, 'TH');
  const own = [first, second, third, fourth];

  it('names the earliest Bite the first Bite', () => {
    expect(celebrationOf(first, own)).toEqual({ moment: 'first-bite' });
  });

  it('claims nothing from a list that leaves the Bite itself out', () => {
    expect(celebrationOf(first, [])).toBeUndefined();
    expect(celebrationOf(third, [first, second])).toBeUndefined();
  });

  it('names the earliest Bite in a further country a first country', () => {
    expect(celebrationOf(third, own)).toEqual({
      moment: 'first-country',
      countryCode: 'TH',
    });
  });

  it('names nothing on a later Bite in a country already visited', () => {
    expect(celebrationOf(second, own)).toBeUndefined();
    expect(celebrationOf(fourth, own)).toBeUndefined();
  });

  it('names no first country when no earlier Bite had a country', () => {
    const unresolved = at('unresolved', 1);

    expect(celebrationOf(third, [unresolved, third])).toBeUndefined();
  });

  it('names no first country on a Bite without a country yet', () => {
    const pending = at('pending', 5);

    expect(celebrationOf(pending, [...own, pending])).toBeUndefined();
  });

  it('reads the age off createdAt where there is no timestamp', () => {
    const older = createBite({
      id: 'older',
      createdAt: '2026-01-01T00:00:00.000Z',
      countryCode: 'DE',
    });
    const newer = createBite({
      id: 'newer',
      createdAt: '2026-02-01T00:00:00.000Z',
      countryCode: 'TH',
    });

    expect(celebrationOf(older, [older, newer])).toEqual({
      moment: 'first-bite',
    });
    expect(celebrationOf(newer, [older, newer])).toEqual({
      moment: 'first-country',
      countryCode: 'TH',
    });
  });

  it('claims nothing where a Bite does not say when it was posted', () => {
    const undated = createBite({ id: 'undated', countryCode: 'TH' });

    expect(celebrationOf(undated, [undated])).toBeUndefined();
    expect(celebrationOf(first, [first, undated])).toBeUndefined();
  });
});
