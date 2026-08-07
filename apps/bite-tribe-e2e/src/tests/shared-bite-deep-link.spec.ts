import { expect, test, Page } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { BiteDetailsPage } from '../pages/bite-details.page';
import { LoginPage } from '../pages/login.page';
import { dismissCoachMarks } from '../support/coach-marks';
import { seedFirestoreDocument } from '../support/firestore';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.147154, longitude: 11.576124 };

const seedSharedBite = async (
  page: Page,
  biteId: string,
  biteName: string,
  restaurant: string,
): Promise<void> => {
  await seedFirestoreDocument(page, `bites/${biteId}`, {
    name: { stringValue: biteName },
    place: { stringValue: restaurant },
    description: { stringValue: 'Shared through a Bite link.' },
    price: { stringValue: '10.00' },
    currency: { stringValue: 'EUR' },
    rating: { integerValue: '4' },
    tags: { arrayValue: { values: [{ stringValue: 'shared' }] } },
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
    userId: { stringValue: TEST_USERS.default.uid },
    city: { stringValue: 'Munich' },
    country: { stringValue: 'Germany' },
    addressStatus: { stringValue: 'resolved' },
    createdAt: { stringValue: new Date().toISOString() },
    createdAtTimestamp: { integerValue: String(Date.now()) },
  });
};

/**
 * Marks onboarding complete for the seeded user, so the entry gate does not
 * stand between signing in and the Bite that was asked for. Onboarding has its
 * own specs; here it would only hide what this journey is about.
 */
const completeOnboarding = async (page: Page): Promise<void> => {
  const completedAt = new Date();

  await seedFirestoreDocument(page, `users/${TEST_USERS.default.uid}`, {
    onboardingVersion: { integerValue: '1' },
    onboardingCompletedAt: { stringValue: completedAt.toISOString() },
    onboardingCompletedAtTimestamp: {
      integerValue: String(completedAt.getTime()),
    },
  });
};

/**
 * A recipient of a shared Bite link arrives cold: a new tab on `/bite/:biteId`,
 * with no in-app navigation before it and the Firebase session still unread.
 * Both answers used to lose the Bite — a signed-out visitor stopped at `/start`,
 * a signed-in one was forwarded on to Home (issue #1246).
 *
 * `page.goto` is that cold load, and a fresh Playwright context is a visitor
 * with no session, so these journeys are the reproduction.
 */
test.describe('Open a shared Bite link', () => {
  test('returns a signed-out recipient to the Bite after signing in', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const biteId = `shared-link-bite-${runId}`;
    const biteName = `Shared Dumplings ${runId}`;
    const restaurant = `Shared Kitchen ${runId}`;

    await seedSharedBite(page, biteId, biteName, restaurant);
    await completeOnboarding(page);

    await page.goto(`/bite/${biteId}`);

    // No session to restore, so the visitor is asked to sign in first.
    await page.waitForURL('**/start');

    await page.getByRole('link', { name: 'Log In' }).click();
    await page.waitForURL('**/login');

    const loginPage = new LoginPage(page);
    await loginPage.login(
      TEST_USERS.default.email,
      TEST_USERS.default.password,
    );

    // The Bite they were sent, not the feed.
    await page.waitForURL(`**/bite/${biteId}`);
    await dismissCoachMarks(page);

    await expect(
      new BiteDetailsPage(page).root.getByRole('heading', { name: biteName }),
    ).toBeVisible();
  });

  test('opens the Bite for a signed-in recipient without passing through Home', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const biteId = `shared-link-signed-in-bite-${runId}`;
    const biteName = `Shared Signed In Dumplings ${runId}`;
    const restaurant = `Shared Signed In Kitchen ${runId}`;

    await seedSharedBite(page, biteId, biteName, restaurant);
    await completeOnboarding(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      TEST_USERS.default.email,
      TEST_USERS.default.password,
    );
    await page.waitForURL('**/home');
    await dismissCoachMarks(page);

    // A cold load of the link with the session now persisted: the guard has to
    // wait for it to be restored instead of judging the visitor signed out.
    await page.goto(`/bite/${biteId}`);

    await expect(page).toHaveURL(new RegExp(`/bite/${biteId}$`));
    await dismissCoachMarks(page);

    await expect(
      new BiteDetailsPage(page).root.getByRole('heading', { name: biteName }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/bite/${biteId}$`));
  });
});
