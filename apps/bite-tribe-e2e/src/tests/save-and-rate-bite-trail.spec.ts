import { expect, Page, test } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { BiteTrailPage } from '../pages/bite-trail.page';
import { BucketListsPage } from '../pages/bucket-lists.page';
import { HomePage } from '../pages/home.page';
import { MarketPlacePage } from '../pages/market-place.page';
import { RateBiteTrailPage } from '../pages/rate-bite-trail.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  expectFirestoreDocument,
  getDocumentByStringField,
  listFirestoreCollection,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };

// A bundled asset, so the trail images resolve instead of logging failed
// requests for a made-up path.
const IMAGE_PATH = 'assets/icons/logo-black-white.svg';

interface TrailBiteFixture {
  id: string;
  name: string;
  place: string;
  latitudeOffset?: number;
}

async function seedTrailBite(
  page: Page,
  fixture: TrailBiteFixture,
): Promise<void> {
  const position = {
    latitude: POSITION.latitude + (fixture.latitudeOffset ?? 0),
    longitude: POSITION.longitude,
  };

  await seedFirestoreDocument(page, `bites/${fixture.id}`, {
    id: { stringValue: fixture.id },
    name: { stringValue: fixture.name },
    place: { stringValue: fixture.place },
    price: { stringValue: '12.00' },
    currency: { stringValue: 'EUR' },
    rating: { integerValue: '4' },
    position: {
      mapValue: {
        fields: {
          latitude: { doubleValue: position.latitude },
          longitude: { doubleValue: position.longitude },
        },
      },
    },
    geohash: {
      stringValue: geohashForLocation([position.latitude, position.longitude]),
    },
    userId: { stringValue: TEST_USERS.organisation.uid },
    createdAt: { stringValue: new Date().toISOString() },
    createdAtTimestamp: { integerValue: String(Date.now()) },
  });
}

interface TrailFixture {
  id: string;
  name: string;
  ownerName: string;
  location: string;
  description: string;
  biteIds: string[];
}

/**
 * A free trail: `price === 0` is what puts the claim button on the trail page
 * and the "Free" label on the market place card, instead of the paid flow that
 * does not exist yet.
 */
async function seedFreeBiteTrail(
  page: Page,
  fixture: TrailFixture,
): Promise<void> {
  await seedFirestoreDocument(page, `biteTrails/${fixture.id}`, {
    id: { stringValue: fixture.id },
    ownerId: { stringValue: TEST_USERS.organisation.uid },
    ownerName: { stringValue: fixture.ownerName },
    ownerImagePath: { stringValue: IMAGE_PATH },
    imagePath: { stringValue: IMAGE_PATH },
    name: { stringValue: fixture.name },
    location: { stringValue: fixture.location },
    description: { stringValue: fixture.description },
    price: { integerValue: '0' },
    currency: { stringValue: 'EUR' },
    biteIds: {
      arrayValue: {
        values: fixture.biteIds.map((id) => ({ stringValue: id })),
      },
    },
    createdAt: { stringValue: new Date().toISOString() },
    createdAtTimestamp: { integerValue: String(Date.now()) },
  });
}

test.describe('Discover, save, and rate a BiteTrail', () => {
  test('claims a free market place BiteTrail and lands on it as a bucket list', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    const trailId = `market-trail-${runId}`;
    const trailName = `Munich Street Food Trail ${runId}`;
    const description = 'Six stops through the best street food in town.';
    const firstBite = {
      id: `trail-bite-one-${runId}`,
      name: `Currywurst Deluxe ${runId}`,
      place: `Wurst Corner ${runId}`,
    };
    const secondBite = {
      id: `trail-bite-two-${runId}`,
      name: `Pretzel Perfection ${runId}`,
      place: `Brezn Bar ${runId}`,
    };

    await Promise.all([
      seedTrailBite(page, firstBite),
      seedTrailBite(page, { ...secondBite, latitudeOffset: 0.0001 }),
      seedFreeBiteTrail(page, {
        id: trailId,
        name: trailName,
        ownerName: `trailmaker${runId}`,
        location: 'Munich',
        description,
        biteIds: [firstBite.id, secondBite.id],
      }),
    ]);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const marketPlace = new MarketPlacePage(page);
    await marketPlace.open();
    await marketPlace.expectFreeTrail({
      name: trailName,
      owner: `trailmaker${runId}`,
      location: 'Munich',
      biteCount: 2,
      description,
    });
    await marketPlace.openTrail(trailName);

    const biteTrail = new BiteTrailPage(page);
    await biteTrail.expectTrail({
      title: trailName,
      biteNames: [firstBite.name, secondBite.name],
    });

    await biteTrail.claimForFree();

    // The claim writes the bucket list the user keeps, plus the sell record the
    // market place counts. Assert both: the toast alone would still pass if the
    // rollback path had swallowed the bucket list.
    await expect
      .poll(
        () =>
          getDocumentByStringField(page, 'bucketlists', 'biteTrailId', trailId),
        { timeout: 15_000 },
      )
      .toMatchObject({
        userId: TEST_USERS.default.uid,
        name: trailName,
        biteIds: [firstBite.id, secondBite.id],
      });

    await expect
      .poll(
        () => listFirestoreCollection(page, `biteTrails/${trailId}/sells`),
        {
          timeout: 15_000,
        },
      )
      .toMatchObject([{ userId: TEST_USERS.default.uid }]);

    const bucketLists = new BucketListsPage(page);
    await biteTrail.openBucketListsFromToast();
    await dismissCoachMarks(page);
    await bucketLists.expectList({ name: trailName, biteCount: 2 });

    // Back on the trail, the claim has turned into a shortcut to the list. The
    // store refreshes bucket lists on entering /my-bucketlists, so this state is
    // only settled once that page has been visited.
    await bucketLists.backButton.click();
    await page.waitForURL(new RegExp(`/bite-trail/${trailId}$`));
    await expect(biteTrail.savedHint).toContainText(
      'You already saved this BiteTrail to your Bucket list.',
    );

    await biteTrail.openSavedBucketList();
    await dismissCoachMarks(page);

    const home = new HomePage(page);
    await expect(home.biteCard(firstBite.name)).toBeVisible();
    await expect(home.biteCard(secondBite.name)).toBeVisible();
  });

  test('rates the BiteTrail behind a bucket list once and then sees it read-only', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const trailId = `rate-trail-${runId}`;
    const trailName = `Alpine Dessert Trail ${runId}`;
    const bucketListId = `rate-list-${runId}`;
    const bite = {
      id: `rate-bite-${runId}`,
      name: `Kaiserschmarrn ${runId}`,
      place: `Berghütte ${runId}`,
    };
    const review = 'Every stop was worth the walk.';

    await Promise.all([
      seedTrailBite(page, bite),
      seedFreeBiteTrail(page, {
        id: trailId,
        name: trailName,
        ownerName: `dessertguide${runId}`,
        location: 'Munich',
        description: 'Sweet stops around the city.',
        biteIds: [bite.id],
      }),
    ]);

    // Start from an already claimed trail: the claim itself is covered above,
    // and rating is only offered on a list that carries a `biteTrailId`.
    await seedFirestoreDocument(page, `bucketlists/${bucketListId}`, {
      userId: { stringValue: TEST_USERS.default.uid },
      name: { stringValue: trailName },
      biteTrailId: { stringValue: trailId },
      biteIds: { arrayValue: { values: [{ stringValue: bite.id }] } },
      createdAt: { stringValue: new Date().toISOString() },
      createdAtTimestamp: { integerValue: String(Date.now()) },
    });

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const bucketLists = new BucketListsPage(page);
    await bucketLists.open();
    await dismissCoachMarks(page);
    await bucketLists.expectList({ name: trailName, biteCount: 1 });
    await bucketLists.openRating(trailName);

    const rating = new RateBiteTrailPage(page);
    await rating.expectTitle(trailName);
    await rating.submitRating(5, review);

    // The rating belongs to the trail, not to the bucket list, and the document
    // is keyed by the rating user — which is what limits it to one per account.
    await expectFirestoreDocument(
      page,
      `biteTrails/${trailId}/ratings/${TEST_USERS.default.uid}`,
      { rating: 5, review },
    );

    await bucketLists.openRating(trailName);
    await rating.expectAlreadyRated(5);
  });
});
