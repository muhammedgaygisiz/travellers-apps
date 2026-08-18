import { join } from 'node:path';
import { expect, Page, Route, test } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { BiteDetailsPage } from '../pages/bite-details.page';
import { CreateBitePage } from '../pages/create-bite.page';
import { HomePage } from '../pages/home.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  expectBiteFields,
  FIRESTORE_EMULATOR_URL,
  getBiteByName,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');
/**
 * Carries GPS EXIF, unlike {@link IMAGE_FIXTURE}, which is what makes the photo
 * position source reachable. See `tools/generate-geotagged-fixture.mjs`.
 */
const GEOTAGGED_IMAGE_FIXTURE = join(
  __dirname,
  '..',
  'fixtures',
  'bite-geotagged.jpg',
);
const POSITION = { latitude: 48.137154, longitude: 11.576124 };
const GOOGLE_POSITION = { latitude: 48.227154, longitude: 11.676124 };
/**
 * What the EXIF of {@link GEOTAGGED_IMAGE_FIXTURE} encodes. Deliberately far
 * from {@link POSITION}: if the photo carried the pinned browser geolocation,
 * an assertion on it could not tell the photo source from the device fix.
 */
const PHOTO_POSITION = { latitude: 41.875, longitude: 12.375 };
/**
 * Close enough to {@link POSITION} to be offered as a nearby restaurant, far
 * enough to be told apart from the device fix.
 */
const NEARBY_RESTAURANT_POSITION = {
  latitude: 48.139154,
  longitude: 11.578124,
};

async function expectPositionMarkerInsideMap(page: Page): Promise<void> {
  const map = page.locator('position bt-map .leaflet-container');
  const marker = map.locator('.leaflet-marker-icon');
  await map.scrollIntoViewIfNeeded();
  await expect(marker).toHaveCount(1);
  await expect
    .poll(async () => {
      const [mapBox, markerBox] = await Promise.all([
        map.boundingBox(),
        marker.boundingBox(),
      ]);
      if (!mapBox || !markerBox) return false;

      const markerCenter = {
        x: markerBox.x + markerBox.width / 2,
        y: markerBox.y + markerBox.height / 2,
      };
      return (
        markerCenter.x >= mapBox.x &&
        markerCenter.x <= mapBox.x + mapBox.width &&
        markerCenter.y >= mapBox.y &&
        markerCenter.y <= mapBox.y + mapBox.height
      );
    })
    .toBe(true);
}

async function mockCallable(
  page: Page,
  name: string,
  result: unknown,
  assertRequest?: (data: unknown) => void,
): Promise<void> {
  await page.route(`**/${name}`, async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-headers': 'authorization,content-type',
          'access-control-allow-methods': 'POST',
          'access-control-allow-origin': '*',
        },
      });
      return;
    }

    assertRequest?.(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ result }),
    });
  });
}

async function seedVerifiedRestaurantBite(
  page: Page,
  options: {
    documentId: string;
    restaurantId: string;
    restaurantName: string;
    // Where the restaurant sits. Defaults to the device fix, which is what the
    // edit flow wants: there the restaurant is asserted to keep the position it
    // already had, not to move it.
    position?: { latitude: number; longitude: number };
  },
): Promise<void> {
  const position = options.position ?? POSITION;
  const response = await page.request.patch(
    `${FIRESTORE_EMULATOR_URL}/bites/${options.documentId}`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        fields: {
          name: { stringValue: 'Verified restaurant seed' },
          place: { stringValue: options.restaurantName },
          restaurantId: { stringValue: options.restaurantId },
          userId: { stringValue: TEST_USERS.organisation.uid },
          position: {
            mapValue: {
              fields: {
                latitude: { doubleValue: position.latitude },
                longitude: { doubleValue: position.longitude },
              },
            },
          },
          geohash: {
            stringValue: geohashForLocation([
              position.latitude,
              position.longitude,
            ]),
          },
          price: { stringValue: '10.00' },
          currency: { stringValue: 'EUR' },
          createdAt: { stringValue: new Date().toISOString() },
          createdAtTimestamp: { integerValue: String(Date.now()) },
          addressStatus: { stringValue: 'pending' },
        },
      },
    },
  );

  expect(response.ok(), await response.text()).toBeTruthy();
}

test.describe('Create and maintain personal bites', () => {
  test.setTimeout(90_000);

  test('creates a rich Bite and later edits it with a verified restaurant', async ({
    page,
  }) => {
    const runId = Date.now();
    const originalName = `Crispy Tofu ${runId}`;
    const editedName = `Extra Crispy Tofu ${runId}`;
    const googleSearch = `Playwright Google Kitchen ${runId}`;
    const googleRestaurant = `Google Kitchen ${runId}`;
    const verifiedRestaurant = `Verified Kitchen ${runId}`;
    const restaurantId = `verified-restaurant-${runId}`;

    await seedVerifiedRestaurantBite(page, {
      documentId: `verified-restaurant-seed-${runId}`,
      restaurantId,
      restaurantName: verifiedRestaurant,
    });
    await mockCallable(page, 'getCurrencyByPosition', { currency: 'EUR' });
    await mockCallable(
      page,
      'searchPlaces',
      [
        {
          placeId: `google-place-${runId}`,
          name: googleRestaurant,
          address: '1 Playwright Way, Munich',
          position: GOOGLE_POSITION,
        },
      ],
      (data) =>
        expect(data).toEqual({
          data: { searchText: googleSearch, position: POSITION },
        }),
    );

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const biteForm = new CreateBitePage(page);
    await biteForm.open();
    await biteForm.uploadImage(IMAGE_FIXTURE);
    await biteForm.fillName(originalName);
    await biteForm.chooseGoogleRestaurant(googleSearch, googleRestaurant);
    await expectPositionMarkerInsideMap(page);
    // The Google place moved the position, so the location row must say so.
    // Asserting the persisted position alone cannot catch a row that keeps
    // crediting the wrong source.
    await biteForm.expectPositionSource('From Google');
    await biteForm.fillPrice('14.50');
    await biteForm.chooseRating(4);
    await biteForm.fillDescription('Crispy tofu with chili and lime.');
    await biteForm.addTag('crispy');
    await biteForm.addTag('spicy');
    await biteForm.expectPostEnabled();
    await biteForm.submit();

    await page.waitForURL('**/home');
    await expectBiteFields(page, originalName, {
      place: googleRestaurant,
      restaurantId: '',
      position: GOOGLE_POSITION,
      positionSource: 'google',
      price: '14.50',
      rating: 4,
      description: 'Crispy tofu with chili and lime.',
      tags: ['crispy', 'spicy'],
      imageStatus: 'uploaded',
    });

    const home = new HomePage(page);
    await expect(home.biteCard(originalName)).toBeVisible();
    await home.openBite(originalName);

    const details = new BiteDetailsPage(page);
    await details.expectBite({
      name: originalName,
      restaurant: googleRestaurant,
      description: 'Crispy tofu with chili and lime.',
      tags: ['crispy', 'spicy'],
      rating: 4,
    });
    await details.openEdit();

    await biteForm.fillName(editedName);
    await biteForm.fillPrice('16.75');
    await biteForm.chooseRating(5);
    await biteForm.fillDescription(
      'Even crispier tofu with chili, lime, and sesame.',
    );
    await biteForm.addTag('sesame');
    await biteForm.chooseLocalRestaurant(verifiedRestaurant);
    await expectPositionMarkerInsideMap(page);
    await biteForm.expectPositionSource('From restaurant');
    await biteForm.expectPostEnabled();
    await biteForm.submit();

    await page.waitForURL(/\/bite\/[^/]+$/);
    await expectBiteFields(page, editedName, {
      place: verifiedRestaurant,
      restaurantId,
      position: POSITION,
      // Stored, so reopening this Bite later still knows the restaurant put it
      // here rather than falling back to an unknown source.
      positionSource: 'restaurant',
      price: '16.75',
      rating: 5,
      description: 'Even crispier tofu with chili, lime, and sesame.',
      tags: ['crispy', 'spicy', 'sesame'],
      imageStatus: 'uploaded',
    });
    await details.expectBite({
      name: editedName,
      restaurant: verifiedRestaurant,
      description: 'Even crispier tofu with chili, lime, and sesame.',
      tags: ['crispy', 'spicy', 'sesame'],
      rating: 5,
    });
  });

  /**
   * The position modal applies nothing until it is confirmed. Cancelling after a
   * manual pick must leave both the position and the source it is credited to
   * exactly as they were, so a rejected pick cannot reach the saved Bite.
   */
  test('discards a manual position pick that is cancelled', async ({
    page,
  }) => {
    const runId = Date.now();
    const name = `Cancelled Position ${runId}`;
    const restaurant = `Trattoria Cancelled ${runId}`;

    await mockCallable(page, 'getCurrencyByPosition', { currency: 'EUR' });

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const biteForm = new CreateBitePage(page);
    await biteForm.open();
    await biteForm.uploadImage(IMAGE_FIXTURE);
    await biteForm.fillName(name);
    await biteForm.chooseCustomRestaurant(restaurant);
    await biteForm.fillPrice('9.00');

    // The pinned browser geolocation is POSITION, so this is the position the
    // cancelled pick must not be allowed to replace.
    await biteForm.useGpsPosition();

    await biteForm.discardManualPositionPick();

    await biteForm.expectPositionSource('From GPS');

    await biteForm.expectPostEnabled();
    await biteForm.submit();

    await page.waitForURL('**/home');
    await expectBiteFields(page, name, {
      place: restaurant,
      position: POSITION,
      positionSource: 'gps',
      price: '9.00',
    });
  });

  /**
   * The photo is the position source with the least redundancy elsewhere: a
   * Google position can be re-derived from `place` and a restaurant one from
   * `restaurantId`, but a position read out of EXIF exists only for as long as
   * the form holds it. So this asserts the coordinates themselves and not just
   * the row that credits them.
   */
  test('takes the position from the GPS EXIF of the photo', async ({
    page,
  }) => {
    const runId = Date.now();
    const name = `Geotagged Bite ${runId}`;
    const restaurant = `Trattoria Geotagged ${runId}`;

    // Every position the form resolved a currency for, in order, so the last
    // entry says which position the prefill ended up following.
    const currencyLookups: { latitude: number; longitude: number }[] = [];
    await mockCallable(
      page,
      'getCurrencyByPosition',
      { currency: 'EUR' },
      (data) => {
        currencyLookups.push(
          (data as { data: { latitude: number; longitude: number } }).data,
        );
      },
    );

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const biteForm = new CreateBitePage(page);
    await biteForm.open();
    await biteForm.uploadImage(GEOTAGGED_IMAGE_FIXTURE);

    await biteForm.expectPositionSource('From photo');
    await expectPositionMarkerInsideMap(page);

    // The photo moving the position has to re-resolve the currency against the
    // new position rather than keep the one the device fix produced. The
    // coordinates the lookup was last called with are what separate the two:
    // both positions sit in the Eurozone, so the resolved currency cannot.
    await expect.poll(() => currencyLookups.at(-1)).toEqual(PHOTO_POSITION);
    await biteForm.expectCurrency('Euro');

    await biteForm.fillName(name);
    // The custom entry carries no position of its own, so the photo stays the
    // source — and the device fix keeps arriving while the form is open, so
    // getting here still saying "From photo" is also what proves the pinned
    // geolocation does not quietly take the position back.
    await biteForm.chooseCustomRestaurant(restaurant);
    await biteForm.fillPrice('11.00');
    await biteForm.expectPositionSource('From photo');

    await biteForm.expectPostEnabled();
    await biteForm.submit();

    await page.waitForURL('**/home');
    await expectBiteFields(page, name, {
      place: restaurant,
      position: PHOTO_POSITION,
      positionSource: 'photo',
      price: '11.00',
    });
  });

  /**
   * The counterpart of the cancelled pick: what the modal is confirmed with is
   * what has to reach the saved Bite, over both of the positions the form had
   * already resolved for itself.
   */
  test('saves a manual position pick that is confirmed', async ({ page }) => {
    const runId = Date.now();
    const name = `Confirmed Position ${runId}`;
    const verifiedRestaurant = `Verified Manual ${runId}`;
    const restaurantId = `verified-manual-${runId}`;

    await seedVerifiedRestaurantBite(page, {
      documentId: `verified-manual-seed-${runId}`,
      restaurantId,
      restaurantName: verifiedRestaurant,
      position: NEARBY_RESTAURANT_POSITION,
    });
    await mockCallable(page, 'getCurrencyByPosition', { currency: 'EUR' });

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const biteForm = new CreateBitePage(page);
    await biteForm.open();
    await biteForm.uploadImage(IMAGE_FIXTURE);
    await biteForm.fillName(name);

    // Gives the form a second resolved position to be told apart from: it now
    // holds the restaurant's, while the device fix stays pinned to POSITION.
    await biteForm.chooseLocalRestaurant(verifiedRestaurant);
    await biteForm.expectPositionSource('From restaurant');
    await biteForm.fillPrice('12.00');

    await biteForm.confirmManualPositionPick();
    await biteForm.expectPositionSource('Set manually');

    await biteForm.expectPostEnabled();
    await biteForm.submit();

    await page.waitForURL('**/home');
    await expectBiteFields(page, name, {
      place: verifiedRestaurant,
      restaurantId,
      positionSource: 'manual',
      price: '12.00',
    });

    const saved = await getBiteByName(page, name);
    const position = saved?.['position'] as {
      latitude: number;
      longitude: number;
    };

    // The pick landed north east of the map centre, and the camera sat on the
    // restaurant position when it did. Asserting the direction it moved is what
    // makes this about the tapped point rather than about any position the form
    // could have supplied on its own — no screen point has to be translated
    // back into coordinates for that.
    expect(position.latitude).toBeGreaterThan(
      NEARBY_RESTAURANT_POSITION.latitude,
    );
    expect(position.longitude).toBeGreaterThan(
      NEARBY_RESTAURANT_POSITION.longitude,
    );
    expect(position).not.toEqual(POSITION);
  });
});
