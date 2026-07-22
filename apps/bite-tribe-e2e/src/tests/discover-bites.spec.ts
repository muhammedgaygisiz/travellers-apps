import { expect, Page, test } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { HomePage } from '../pages/home.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  FIRESTORE_EMULATOR_URL,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

interface DiscoverBiteFixture {
  id: string;
  name: string;
  place: string;
  position: { latitude: number; longitude: number };
  createdAtTimestamp: number;
}

async function seedDiscoverBite(
  page: Page,
  fixture: DiscoverBiteFixture,
): Promise<void> {
  await seedFirestoreDocument(page, `bites/${fixture.id}`, {
    name: { stringValue: fixture.name },
    place: { stringValue: fixture.place },
    description: { stringValue: 'Seeded for the Discover Bites E2E test.' },
    price: { stringValue: '9.50' },
    currency: { stringValue: 'EUR' },
    rating: { integerValue: '4' },
    tags: { arrayValue: { values: [{ stringValue: 'discover-e2e' }] } },
    position: {
      mapValue: {
        fields: {
          latitude: { doubleValue: fixture.position.latitude },
          longitude: { doubleValue: fixture.position.longitude },
        },
      },
    },
    geohash: {
      stringValue: geohashForLocation([
        fixture.position.latitude,
        fixture.position.longitude,
      ]),
    },
    userId: { stringValue: TEST_USERS.organisation.uid },
    addressStatus: { stringValue: 'resolved' },
    city: { stringValue: 'Munich' },
    country: { stringValue: 'Germany' },
    createdAt: {
      stringValue: new Date(fixture.createdAtTimestamp).toISOString(),
    },
    createdAtTimestamp: {
      integerValue: String(fixture.createdAtTimestamp),
    },
  });
}

test.describe('Discover Bites', () => {
  test('browses and sorts nearby Bites, then explores them on a zoomable map as a free user', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const olderBite: DiscoverBiteFixture = {
      id: `discover-older-${runId}`,
      name: `Older Discovery Bite ${runId}`,
      place: `Older Discovery Place ${runId}`,
      position: { latitude: 52.520008, longitude: 13.404954 },
      createdAtTimestamp: runId - 60_000,
    };
    const newerBite: DiscoverBiteFixture = {
      id: `discover-newer-${runId}`,
      name: `Newer Discovery Bite ${runId}`,
      place: `Newer Discovery Place ${runId}`,
      position: { latitude: 52.530008, longitude: 13.424954 },
      createdAtTimestamp: runId,
    };

    await page.context().setGeolocation({
      latitude: olderBite.position.latitude,
      longitude: olderBite.position.longitude,
    });

    const tierResponse = await page.request.patch(
      `${FIRESTORE_EMULATOR_URL}/users/${TEST_USERS.default.uid}` +
        '?updateMask.fieldPaths=subscriptionTier',
      {
        headers: { Authorization: 'Bearer owner' },
        data: { fields: { subscriptionTier: { integerValue: '0' } } },
      },
    );
    expect(tierResponse.ok(), await tierResponse.text()).toBeTruthy();

    await seedDiscoverBite(page, olderBite);
    await seedDiscoverBite(page, newerBite);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const home = new HomePage(page);
    await expect(home.biteCard(olderBite.name)).toBeVisible();
    await expect(home.biteCard(newerBite.name)).toBeVisible();

    await page.locator('bt-home-feed-controls ion-select').click();
    await page.getByRole('radio', { name: 'Date', exact: true }).click();

    await expect
      .poll(async () => {
        const titles = await page
          .locator('bt-bite ion-card-title')
          .allTextContents();
        const newerIndex = titles.findIndex((title) =>
          title.includes(newerBite.name),
        );
        const olderIndex = titles.findIndex((title) =>
          title.includes(olderBite.name),
        );
        return newerIndex >= 0 && olderIndex >= 0 && newerIndex < olderIndex;
      })
      .toBe(true);

    await page.getByText('Bitemap', { exact: true }).click();
    await page.waitForURL('**/home/map-view');
    await dismissCoachMarks(page);

    const map = page.locator('map-page .leaflet-container');
    await expect(map).toBeVisible();

    const zoomIn = map.locator('.leaflet-control-zoom-in');
    const zoomOut = map.locator('.leaflet-control-zoom-out');
    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();

    const seededMarker = map.locator(
      `.leaflet-marker-icon[title="${olderBite.id}"]`,
    );
    await expect(seededMarker).toBeVisible();

    await zoomIn.click();
    await expect(zoomOut).not.toHaveClass(/leaflet-disabled/);
    await zoomOut.click();

    await seededMarker.click();
    await expect(page.locator('map-page bt-snap-drawer')).toContainText(
      olderBite.name,
    );
  });
});
