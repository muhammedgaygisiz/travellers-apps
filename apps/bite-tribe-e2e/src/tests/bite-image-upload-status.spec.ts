import { join } from 'node:path';
import { expect, Page, test } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { BiteDetailsPage } from '../pages/bite-details.page';
import { CreateBitePage } from '../pages/create-bite.page';
import { HomePage } from '../pages/home.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  deleteFirestoreDocument,
  expectFirestoreDocument,
  getBiteByName,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');

/** Near the geolocation pinned in playwright.config, so seeded Bites land in the feed. */
const POSITION = { latitude: 48.147154, longitude: 11.576124 };

/** Copy from apps/bite-tribe/src/assets/i18n/en.json — asserted verbatim. */
const PENDING_POSTER_TEXT = 'Uploading photo — keep the app open';
const PENDING_VIEWER_TEXT = 'Loading photo…';
const FAILED_TEXT = 'Photo couldn’t be uploaded';

/**
 * Keep in sync with STALE_PENDING_UPLOAD_MS in
 * libs/bite-tribe-common/bite/src/lib/utils/image-status.ts.
 */
const STALE_PENDING_UPLOAD_MS = 10 * 60 * 1000;

const STORAGE_EMULATOR_HOST = 'localhost:9199';

interface ImageStatusBiteFixture {
  id: string;
  name: string;
  ownerId: string;
  imageStatus: 'pending' | 'failed' | 'uploaded';
  createdAtTimestamp?: number;
  /** Set to prove the placeholder is chosen before the photo branch. */
  imagePath?: string;
}

/**
 * Ids seeded by the running test, handed back in afterEach.
 *
 * Unlike the Bites other specs seed, these are photo-less by design: a `pending`
 * fixture renders a spinner that never resolves, and leaving those in the shared
 * nearby feed would make every later spec in the run work through them.
 */
const seededBiteIds: string[] = [];

async function seedImageStatusBite(
  page: Page,
  fixture: ImageStatusBiteFixture,
): Promise<void> {
  const createdAtTimestamp = fixture.createdAtTimestamp ?? Date.now();

  seededBiteIds.push(fixture.id);

  await seedFirestoreDocument(page, `bites/${fixture.id}`, {
    name: { stringValue: fixture.name },
    place: { stringValue: `Image Status Kitchen ${fixture.id}` },
    description: {
      stringValue: 'Seeded for the image-upload-status E2E test.',
    },
    price: { stringValue: '8.00' },
    currency: { stringValue: 'EUR' },
    rating: { integerValue: '4' },
    imageStatus: { stringValue: fixture.imageStatus },
    ...(fixture.imagePath
      ? { imagePath: { stringValue: fixture.imagePath } }
      : {}),
    position: {
      mapValue: {
        fields: {
          latitude: { doubleValue: POSITION.latitude },
          longitude: { doubleValue: POSITION.longitude },
        },
      },
    },
    geohash: {
      stringValue: geohashForLocation([POSITION.latitude, POSITION.longitude]),
    },
    userId: { stringValue: fixture.ownerId },
    addressStatus: { stringValue: 'resolved' },
    city: { stringValue: 'Munich' },
    country: { stringValue: 'Germany' },
    createdAt: { stringValue: new Date(createdAtTimestamp).toISOString() },
    createdAtTimestamp: { integerValue: String(createdAtTimestamp) },
  });
}

/**
 * Fails every Storage upload while the returned handle says so, so the create
 * flow can be driven into its error branch on demand.
 *
 * 403 rather than an aborted request: the Storage SDK treats it as terminal and
 * reports the error immediately, where a network failure would be retried for
 * two minutes before the client ever writes `failed`. Reads stay untouched, so
 * the photo can still be fetched once the upload is let through again.
 */
async function withBlockedStorageUploads(
  page: Page,
): Promise<{ allowUploads: () => void }> {
  let blocked = true;

  await page.route(
    (url) => url.host === STORAGE_EMULATOR_HOST,
    async (route) => {
      const method = route.request().method();
      const isUpload = method === 'POST' || method === 'PUT';

      if (!blocked || !isUpload) {
        await route.continue();

        return;
      }

      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 403, message: 'Upload blocked by the E2E test.' },
        }),
      });
    },
  );

  return {
    allowUploads: (): void => {
      blocked = false;
    },
  };
}

/**
 * Photo upload states on a Bite. See GitHub issue #1168.
 *
 * "Other viewers" are signed in here because `bite/:biteId` and the feed are
 * behind the auth guard; a signed-out viewer reaches the same neutral copy
 * through the same `userId`-is-not-the-poster branch.
 */
test.describe('Bite photo upload status', () => {
  test.afterEach(async ({ page }) => {
    const ids = seededBiteIds.splice(0);

    await Promise.all(
      ids.map((id) => deleteFirestoreDocument(page, `bites/${id}`)),
    );
  });

  test('tells only the poster to keep the app open while a photo uploads', async ({
    page,
  }) => {
    const runId = Date.now();
    const ownBite = `Pending Own Bite ${runId}`;
    const otherBite = `Pending Other Bite ${runId}`;

    await Promise.all([
      seedImageStatusBite(page, {
        id: `pending-own-${runId}`,
        name: ownBite,
        ownerId: TEST_USERS.default.uid,
        imageStatus: 'pending',
      }),
      seedImageStatusBite(page, {
        id: `pending-other-${runId}`,
        name: otherBite,
        ownerId: TEST_USERS.organisation.uid,
        imageStatus: 'pending',
      }),
    ]);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const home = new HomePage(page);

    await expect(
      home.imageStatus(ownBite).getByTestId('bite-image-pending-text'),
    ).toHaveText(PENDING_POSTER_TEXT);
    await expect(
      home.imageStatus(otherBite).getByTestId('bite-image-pending-text'),
    ).toHaveText(PENDING_VIEWER_TEXT);

    // An upload in flight is not a failure, so nobody is offered a retry yet.
    await expect(
      home.imageStatus(ownBite).getByTestId('bite-image-retry'),
    ).toHaveCount(0);
  });

  test('reports a failed upload to every viewer and offers the retry only to the poster', async ({
    page,
  }) => {
    const runId = Date.now();
    const ownBite = `Failed Own Bite ${runId}`;
    const otherBite = `Failed Other Bite ${runId}`;

    await Promise.all([
      seedImageStatusBite(page, {
        id: `failed-own-${runId}`,
        name: ownBite,
        ownerId: TEST_USERS.default.uid,
        imageStatus: 'failed',
        // A stored photo the card must not fall back to: the upload failed, so
        // showing anything would pass a lost photo off as a successful post.
        imagePath: 'https://example.invalid/never-uploaded.jpg',
      }),
      seedImageStatusBite(page, {
        id: `failed-other-${runId}`,
        name: otherBite,
        ownerId: TEST_USERS.organisation.uid,
        imageStatus: 'failed',
      }),
    ]);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const home = new HomePage(page);

    await expect(
      home.imageStatus(ownBite).getByTestId('bite-image-failed'),
    ).toContainText(FAILED_TEXT);
    await expect(home.biteImage(ownBite)).toHaveCount(0);
    await expect(
      home.imageStatus(ownBite).getByTestId('bite-image-retry'),
    ).toBeVisible();

    await expect(
      home.imageStatus(otherBite).getByTestId('bite-image-failed'),
    ).toContainText(FAILED_TEXT);
    await expect(
      home.imageStatus(otherBite).getByTestId('bite-image-retry'),
    ).toHaveCount(0);
  });

  test('treats a long-abandoned pending upload as failed without rewriting the document', async ({
    page,
  }) => {
    const runId = Date.now();
    const staleId = `stale-pending-${runId}`;
    const staleBite = `Stale Pending Bite ${runId}`;
    const freshBite = `Fresh Pending Bite ${runId}`;

    await Promise.all([
      seedImageStatusBite(page, {
        id: staleId,
        name: staleBite,
        ownerId: TEST_USERS.default.uid,
        imageStatus: 'pending',
        createdAtTimestamp: runId - STALE_PENDING_UPLOAD_MS - 60_000,
      }),
      // Control: a pending upload inside the threshold still reads as pending,
      // so the failed state above comes from the age and not from `pending`
      // itself.
      seedImageStatusBite(page, {
        id: `fresh-pending-${runId}`,
        name: freshBite,
        ownerId: TEST_USERS.default.uid,
        imageStatus: 'pending',
        createdAtTimestamp: runId - 60_000,
      }),
    ]);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const home = new HomePage(page);

    await expect(
      home.imageStatus(staleBite).getByTestId('bite-image-failed'),
    ).toContainText(FAILED_TEXT);
    await expect(
      home.imageStatus(staleBite).getByTestId('bite-image-retry'),
    ).toBeVisible();

    await expect(
      home.imageStatus(freshBite).getByTestId('bite-image-pending-text'),
    ).toHaveText(PENDING_POSTER_TEXT);

    // Rendered, not migrated: every already-stuck Bite corrects itself without a
    // backfill, so the document must still say `pending`.
    await expectFirestoreDocument(page, `bites/${staleId}`, {
      imageStatus: 'pending',
    });
  });

  test('mirrors the failed state on the details page and asks for a photo when the local copy is gone', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const biteId = `failed-details-${runId}`;
    const biteName = `Failed Details Bite ${runId}`;

    await seedImageStatusBite(page, {
      id: biteId,
      name: biteName,
      ownerId: TEST_USERS.default.uid,
      imageStatus: 'failed',
      imagePath: 'https://example.invalid/never-uploaded.jpg',
    });

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const home = new HomePage(page);
    await expect(home.biteCard(biteName)).toBeVisible();
    await home.openBite(biteName);
    await dismissCoachMarks(page);

    const details = new BiteDetailsPage(page);
    await expect(
      details.imageStatus.getByTestId('bite-image-failed'),
    ).toContainText(FAILED_TEXT);
    await expect(details.image).toHaveCount(0);

    // This browser never posted the Bite, so its local copy is not here and the
    // retry falls back to picking from the photos saved on the device.
    await details.imageStatus.getByTestId('bite-image-retry').click();

    const picker = page.locator('ion-modal bt-local-image-picker');
    await expect(picker.getByTestId('local-image-picker-empty')).toBeVisible();

    await picker.getByRole('button', { name: 'Cancel' }).click();
    await expect(picker).toHaveCount(0);

    // Picking nothing cancels: the Bite is still failed, and still says so.
    await expect(
      details.imageStatus.getByTestId('bite-image-failed'),
    ).toBeVisible();
    await expectFirestoreDocument(page, `bites/${biteId}`, {
      imageStatus: 'failed',
    });
  });

  test('records a failed upload from the create flow and re-sends the photo on retry', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    const biteName = `Upload Failure Bite ${runId}`;
    const restaurant = `Upload Failure Kitchen ${runId}`;

    const storage = await withBlockedStorageUploads(page);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const createBite = new CreateBitePage(page);
    await createBite.open();
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(biteName);
    await createBite.chooseCustomRestaurant(restaurant);
    await createBite.fillPrice('8.00');
    await createBite.useGpsPosition();
    await createBite.submit();

    await page.waitForURL('**/home');

    // The upload error branch owns the terminal state: the storage finalize
    // trigger never runs for an upload that failed, so without this write the
    // document would claim `pending` forever.
    await expect
      .poll(() => getBiteByName(page, biteName), { timeout: 30_000 })
      .toMatchObject({ imageStatus: 'failed' });

    const home = new HomePage(page);
    await expect(
      home.imageStatus(biteName).getByTestId('bite-image-failed'),
    ).toContainText(FAILED_TEXT);
    // The poster's device still holds the base64 it just posted; the card must
    // not render it and imply the upload arrived.
    await expect(home.biteImage(biteName)).toHaveCount(0);

    storage.allowUploads();

    // This device posted the Bite, so its local copy is still here and the retry
    // re-sends it without asking for a photo.
    await home.imageStatus(biteName).getByTestId('bite-image-retry').click();

    await expect
      .poll(() => getBiteByName(page, biteName), { timeout: 60_000 })
      .toMatchObject({ imageStatus: 'uploaded' });

    await page.reload();
    await dismissCoachMarks(page);
    await expect(home.biteImage(biteName)).toBeVisible();
    await expect(home.imageStatus(biteName)).toHaveCount(0);
  });
});
