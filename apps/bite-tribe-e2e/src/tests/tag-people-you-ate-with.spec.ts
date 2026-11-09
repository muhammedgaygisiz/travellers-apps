import { join } from 'node:path';
import { expect, Page, test } from '@playwright/test';
import { BiteDetailsPage } from '../pages/bite-details.page';
import { CreateBitePage } from '../pages/create-bite.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  deleteFirestoreDocument,
  getBiteByName,
  getFirestoreDocument,
  queryDocumentsByStringField,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');
const CREATOR = TEST_USERS.default;
const TAGGED = TEST_USERS.fresh;

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FUNCTIONS_EMULATOR_URL = 'http://127.0.0.1:5001/bite-tribe/us-central1';

const runId = Date.now();
const biteName = `Shared Hot Pot ${runId}`;

/** Accounts seeded for this run only, so no other spec can change them. */
const luigi = { id: `luigi-${runId}`, displayName: `Luigi ${runId}` };
const peach = { id: `peach-${runId}`, displayName: `Peach ${runId}` };
const bowser = { id: `bowser-${runId}`, displayName: `Bowser ${runId}` };

/** Read in the first test: `fresh` is a seeded account other specs share. */
let taggedDisplayName = '';
let biteId = '';

const followEdge = (
  followerUid: string,
  followedUid: string,
): Record<string, unknown> => ({
  createdAt: { stringValue: new Date().toISOString() },
  followerUid: { stringValue: followerUid },
  followedUid: { stringValue: followedUid },
});

/** The creator follows `user`, both sides of the edge. */
async function seedFollowedByCreator(
  page: Page,
  userId: string,
): Promise<void> {
  await seedFirestoreDocument(
    page,
    `users/${CREATOR.uid}/following/${userId}`,
    followEdge(CREATOR.uid, userId),
  );
  await seedFirestoreDocument(
    page,
    `users/${userId}/followers/${CREATOR.uid}`,
    followEdge(CREATOR.uid, userId),
  );
}

async function seedAccount(
  page: Page,
  user: { id: string; displayName: string },
  isPublic: boolean,
): Promise<void> {
  await seedFirestoreDocument(page, `users/${user.id}`, {
    userId: { stringValue: user.id },
    displayName: { stringValue: user.displayName },
    fullName: { stringValue: '' },
    email: { stringValue: `${user.id}@example.test` },
    photoUrl: { stringValue: '' },
    public: { booleanValue: isPublic },
    biteCount: { integerValue: '0' },
    subscriptionTier: { integerValue: '0' },
  });
}

const storedTags = async (page: Page): Promise<unknown> =>
  (await getFirestoreDocument(page, `bites/${biteId}`))?.['taggedUserIds'];

/** Epic #1915, issue #1932: tag the people you ate with, end to end. */
test.describe.serial('Tag the people you ate with', () => {
  test('the creator tags followed users, and only valid tags survive', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await seedAccount(page, luigi, true);
    await seedAccount(page, peach, false);
    await seedAccount(page, bowser, true);
    for (const user of [luigi, peach, bowser]) {
      await seedFollowedByCreator(page, user.id);
    }
    await seedFollowedByCreator(page, TAGGED.uid);

    // Bowser blocked the creator. The creator's device cannot know that, so
    // the picker offers him and the backend has to drop him (issue #1916).
    const block = {
      blockerUid: { stringValue: bowser.id },
      blockedUid: { stringValue: CREATOR.uid },
    };
    await seedFirestoreDocument(
      page,
      `users/${bowser.id}/blocked/${CREATOR.uid}`,
      block,
    );
    await seedFirestoreDocument(
      page,
      `users/${CREATOR.uid}/blockedBy/${bowser.id}`,
      block,
    );

    const taggedProfile = await getFirestoreDocument(
      page,
      `users/${TAGGED.uid}`,
    );
    taggedDisplayName = String(taggedProfile?.['displayName'] ?? '');
    expect(taggedDisplayName).not.toBe('');
    expect(taggedProfile?.['public']).toBe(true);

    await loginAsTestUser(page, CREATOR);
    await completeOnboardingIfNeeded(page, CREATOR);
    await dismissCoachMarks(page);

    const createBite = new CreateBitePage(page);
    await createBite.open();
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(biteName);
    await createBite.chooseCustomRestaurant(`Hot Pot House ${runId}`);
    await createBite.fillPrice('24');
    await createBite.useGpsPosition();

    // Issue #1917: a followed private account is never offered.
    await createBite.ateWithSearch.fill(`${runId}`);
    await expect(
      createBite.ateWithCandidates.filter({ hasText: luigi.displayName }),
    ).toBeVisible();
    await expect(
      createBite.ateWithCandidates.filter({ hasText: peach.displayName }),
    ).toHaveCount(0);

    await createBite.tagPerson(luigi.displayName);
    await createBite.tagPerson(bowser.displayName);
    await createBite.tagPerson(taggedDisplayName);
    await expect(createBite.ateWithChips).toHaveCount(3);

    await createBite.submit();
    await page.waitForURL('**/home');

    await expect
      .poll(
        async () =>
          (
            await queryDocumentsByStringField(page, 'bites', 'name', biteName)
          )[0]?.path,
        { timeout: 15_000 },
      )
      .toBeTruthy();
    biteId = (
      await queryDocumentsByStringField(page, 'bites', 'name', biteName)
    )[0].path.split('/')[1];

    // Issue #1916: the trigger removed the account that blocked the creator.
    await expect
      .poll(() => storedTags(page), { timeout: 20_000 })
      .toEqual([luigi.id, TAGGED.uid]);
    // And the photo landed, so the Bite is listable to the people it tags.
    await expect
      .poll(
        async () => (await getBiteByName(page, biteName))?.['imageStatus'],
        {
          timeout: 20_000,
        },
      )
      .toBe('uploaded');

    // Issue #1918: the row names who the creator ate with; the creator is
    // offered no way to remove themselves.
    await page.goto(`/bite/${biteId}`);
    const details = new BiteDetailsPage(page);
    await dismissCoachMarks(page);
    await expect(details.taggedUsers).toHaveText([
      luigi.displayName,
      taggedDisplayName,
    ]);
    await expect(details.removeMe).toHaveCount(0);

    await details.taggedUsers.filter({ hasText: luigi.displayName }).click();
    await page.waitForURL(`**/profile/${luigi.id}`);
  });

  test('a tagged user removes themselves from the Bite', async ({ page }) => {
    test.setTimeout(90_000);

    await loginAsTestUser(page, TAGGED);
    await completeOnboardingIfNeeded(page, TAGGED);
    await dismissCoachMarks(page);

    await page.goto(`/bite/${biteId}`);
    const details = new BiteDetailsPage(page);
    await dismissCoachMarks(page);
    await expect(details.taggedUsers).toHaveText([
      luigi.displayName,
      taggedDisplayName,
    ]);

    // Issue #1920: offered to the tagged user, behind a confirmation.
    await details.removeMeFromBite();

    await expect(
      page.getByText('Your name was removed from this Bite.'),
    ).toBeVisible();
    await expect(details.taggedUsers).toHaveText([luigi.displayName]);
    await expect(details.removeMe).toHaveCount(0);
    await expect.poll(() => storedTags(page)).toEqual([luigi.id]);
  });

  test('a user who is not tagged cannot remove themselves', async ({
    page,
  }) => {
    const signIn = await page.request.post(
      `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
      {
        data: {
          email: TAGGED.email,
          password: TAGGED.password,
          returnSecureToken: true,
        },
      },
    );
    expect(signIn.ok(), await signIn.text()).toBeTruthy();
    const { idToken } = (await signIn.json()) as { idToken: string };

    const response = await page.request.post(
      `${FUNCTIONS_EMULATOR_URL}/removeSelfFromBiteTags`,
      {
        headers: { Authorization: `Bearer ${idToken}` },
        data: { data: { biteId } },
      },
    );

    expect(response.ok()).toBe(false);
    expect(await response.json()).toMatchObject({
      error: { status: 'FAILED_PRECONDITION' },
    });
    expect(await storedTags(page)).toEqual([luigi.id]);

    // The Bite would otherwise sit in the shared nearby feed for later specs.
    await deleteFirestoreDocument(page, `bites/${biteId}`);
  });
});
