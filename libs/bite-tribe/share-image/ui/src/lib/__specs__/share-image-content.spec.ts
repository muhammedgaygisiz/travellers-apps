import type { Bite } from 'model';
import {
  applyFieldSwitches,
  availableFields,
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
  const content = toShareImageContent(createBite(), 'en', 'Super Mario');

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
