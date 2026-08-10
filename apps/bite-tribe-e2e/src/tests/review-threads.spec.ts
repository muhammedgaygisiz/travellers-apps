import { expect, Page, test } from '@playwright/test';
import { BiteDetailsPage } from '../pages/bite-details.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  getDocumentByStringField,
  queryDocumentsByStringField,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

/**
 * The Bites here carry no position on purpose. This journey opens them by URL,
 * never through the nearby feed, and a positionless Bite cannot leak into the
 * feed of a later spec — the emulator keeps every write for the whole run.
 */
const seedBite = (
  page: Page,
  biteId: string,
  biteName: string,
  creatorId: string,
): Promise<void> =>
  seedFirestoreDocument(page, `bites/${biteId}`, {
    name: { stringValue: biteName },
    place: { stringValue: '' },
    price: { stringValue: '10.00' },
    currency: { stringValue: 'EUR' },
    rating: { integerValue: '4' },
    userId: { stringValue: creatorId },
    addressStatus: { stringValue: 'resolved' },
    createdAt: { stringValue: new Date().toISOString() },
    createdAtTimestamp: { integerValue: String(Date.now()) },
  });

const seedUser = (
  page: Page,
  userId: string,
  displayName: string,
): Promise<void> =>
  seedFirestoreDocument(page, `users/${userId}`, {
    userId: { stringValue: userId },
    displayName: { stringValue: displayName },
    public: { booleanValue: true },
  });

interface SeededReview {
  id: string;
  biteId: string;
  author: string;
  authorId: string;
  review: string;
  writtenAt: number;
  parentReviewId?: string;
  threadId?: string;
}

const seedReview = (page: Page, review: SeededReview): Promise<void> =>
  seedFirestoreDocument(page, `reviews/${review.id}`, {
    biteId: { stringValue: `/bites/${review.biteId}` },
    author: { stringValue: review.author },
    authorId: { stringValue: review.authorId },
    review: { stringValue: review.review },
    createdAt: { stringValue: new Date(review.writtenAt).toISOString() },
    createdAtTimestamp: { integerValue: String(review.writtenAt) },
    ...(review.parentReviewId
      ? { parentReviewId: { stringValue: review.parentReviewId } }
      : {}),
    ...(review.threadId ? { threadId: { stringValue: review.threadId } } : {}),
  });

/** Opens a Bite the way a link does, with no in-app navigation before it. */
const openBite = async (page: Page, url: string): Promise<BiteDetailsPage> => {
  await page.goto(url);
  await dismissCoachMarks(page);

  return new BiteDetailsPage(page);
};

/**
 * The review with this text as the app wrote it: the id Firestore gave it, and
 * the author name the composer will mention when it is answered.
 */
const reviewByText = async (
  page: Page,
  text: string,
): Promise<{ id: string; author: string }> => {
  await expect
    .poll(() => getDocumentByStringField(page, 'reviews', 'review', text), {
      timeout: 15_000,
    })
    .toBeDefined();

  const [document] = await queryDocumentsByStringField(
    page,
    'reviews',
    'review',
    text,
    1,
  );

  return {
    id: document.path.split('/').pop() as string,
    author: document.fields['author'] as string,
  };
};

test.describe('Answer a review', () => {
  test('replies inside the thread, and keeps an answer to a reply in it', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const biteId = `thread-bite-${runId}`;
    const creatorId = `thread-creator-${runId}`;
    const reviewerId = `thread-reviewer-${runId}`;
    const rootId = `thread-root-${runId}`;
    const rootText = `Best kebab in Kreuzberg ${runId}`;
    const answerText = `Thanks, try the garlic sauce ${runId}`;
    const answerToAnswerText = `@Thread Reviewer noted ${runId}`;

    await Promise.all([
      seedUser(page, creatorId, `Thread Creator ${runId}`),
      seedUser(page, reviewerId, `Thread Reviewer ${runId}`),
      seedBite(page, biteId, `Thread Dumplings ${runId}`, creatorId),
    ]);

    await seedReview(page, {
      id: rootId,
      biteId,
      author: `Thread Reviewer ${runId}`,
      authorId: reviewerId,
      review: rootText,
      writtenAt: runId,
    });

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);

    const details = await openBite(page, `/bite/${biteId}`);

    // A review offers a reply action to any authenticated user, not only to the
    // Bite's owner — the signed-in account here is neither.
    await expect(details.thread(rootId)).toBeVisible();
    await expect(
      details.thread(rootId).getByTestId('reply-to-review'),
    ).toBeVisible();

    await details.openReplyToReview(rootId);
    expect(await details.prefilledReply(rootId)).toBe('');
    await details.submitThreadReply(rootId, answerText);

    // The reply is a review document that names the review it answers and the
    // conversation it belongs to.
    await expect
      .poll(
        () => getDocumentByStringField(page, 'reviews', 'review', answerText),
        { timeout: 15_000 },
      )
      .toMatchObject({
        review: answerText,
        biteId: `/bites/${biteId}`,
        authorId: TEST_USERS.default.uid,
        parentReviewId: rootId,
        threadId: rootId,
      });

    // ...and it rendered under its root without a page reload, which is what
    // `submitThreadReply` waited for.
    const answer = await reviewByText(page, answerText);
    await expect(details.repliesOf(rootId)).toHaveCount(1);
    await expect(details.reply(answer.id)).toContainText(answerText);

    // Answering a reply attaches to the same root with an `@name` prefill
    // rather than opening a second level. The name is the author of the reply
    // being answered, which is the account signed in here.
    await details.openReplyToReply(rootId, answer.id);
    expect(await details.prefilledReply(rootId)).toBe(`@${answer.author} `);
    await details.submitThreadReply(rootId, answerToAnswerText);

    await expect
      .poll(
        () =>
          getDocumentByStringField(
            page,
            'reviews',
            'review',
            answerToAnswerText,
          ),
        { timeout: 15_000 },
      )
      .toMatchObject({
        parentReviewId: answer.id,
        threadId: rootId,
      });

    await expect(details.repliesOf(rootId)).toHaveCount(2);
    await expect(
      details.thread(rootId).locator('.replies .replies'),
    ).toHaveCount(0);
    await expect(details.reviewThreads).toHaveCount(1);
  });

  test('marks the Bite creator inside a thread', async ({ page }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const biteId = `badge-bite-${runId}`;
    const reviewerId = `badge-reviewer-${runId}`;
    const rootId = `badge-root-${runId}`;
    const creatorReplyId = `badge-reply-${runId}`;

    // The Bite belongs to the signed-in account, so its own answer is the one
    // that has to be marked.
    await Promise.all([
      seedUser(page, reviewerId, `Badge Reviewer ${runId}`),
      seedBite(
        page,
        biteId,
        `Badge Dumplings ${runId}`,
        TEST_USERS.default.uid,
      ),
    ]);

    await seedReview(page, {
      id: rootId,
      biteId,
      author: `Badge Reviewer ${runId}`,
      authorId: reviewerId,
      review: `Worth the queue ${runId}`,
      writtenAt: runId,
    });
    await seedReview(page, {
      id: creatorReplyId,
      biteId,
      author: 'Bite Owner',
      authorId: TEST_USERS.default.uid,
      review: `Glad you liked it ${runId}`,
      writtenAt: runId + 1_000,
      parentReviewId: rootId,
      threadId: rootId,
    });

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);

    const details = await openBite(page, `/bite/${biteId}`);

    await expect(
      details.reply(creatorReplyId).locator('.creator-badge'),
    ).toBeVisible();
    await expect(details.thread(rootId).locator('.creator-badge')).toHaveCount(
      1,
    );
  });

  test('orders threads newest first, replies oldest first, and folds a long thread', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const biteId = `order-bite-${runId}`;
    const creatorId = `order-creator-${runId}`;
    const reviewerId = `order-reviewer-${runId}`;
    const olderRootId = `order-root-older-${runId}`;
    const newerRootId = `order-root-newer-${runId}`;

    const olderRootText = `Older thread ${runId}`;
    const newerRootText = `Newer thread ${runId}`;
    const shortReplies = [`Short one ${runId}`, `Short two ${runId}`];
    const longReplies = [
      `Long one ${runId}`,
      `Long two ${runId}`,
      `Long three ${runId}`,
    ];

    await Promise.all([
      seedUser(page, creatorId, `Order Creator ${runId}`),
      seedUser(page, reviewerId, `Order Reviewer ${runId}`),
      seedBite(page, biteId, `Order Dumplings ${runId}`, creatorId),
    ]);

    await seedReview(page, {
      id: olderRootId,
      biteId,
      author: `Order Reviewer ${runId}`,
      authorId: reviewerId,
      review: olderRootText,
      writtenAt: runId,
    });
    await seedReview(page, {
      id: newerRootId,
      biteId,
      author: `Order Reviewer ${runId}`,
      authorId: reviewerId,
      review: newerRootText,
      writtenAt: runId + 10_000,
    });

    // The array order is the order these are expected to render in; the seeded
    // timestamps are what the page has to sort by. The read itself has no
    // `orderBy`, so nothing but that sort can put them right.
    await Promise.all([
      ...longReplies.map((review, index) =>
        seedReview(page, {
          id: `order-long-${index}-${runId}`,
          biteId,
          author: `Order Reviewer ${runId}`,
          authorId: reviewerId,
          review,
          writtenAt: runId + 1_000 * (index + 1),
          parentReviewId: olderRootId,
          threadId: olderRootId,
        }),
      ),
      ...shortReplies.map((review, index) =>
        seedReview(page, {
          id: `order-short-${index}-${runId}`,
          biteId,
          author: `Order Reviewer ${runId}`,
          authorId: reviewerId,
          review,
          writtenAt: runId + 11_000 + 1_000 * index,
          parentReviewId: newerRootId,
          threadId: newerRootId,
        }),
      ),
    ]);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);

    const details = await openBite(page, `/bite/${biteId}`);

    await expect(details.reviewThreads).toHaveCount(2);
    await expect(details.reviewThreads.nth(0)).toContainText(newerRootText);
    await expect(details.reviewThreads.nth(1)).toContainText(olderRootText);

    // Two replies are short enough to read in place.
    await expect(
      details.thread(newerRootId).getByTestId('show-replies'),
    ).toHaveCount(0);
    await expect(details.repliesOf(newerRootId)).toHaveCount(2);
    await expect(details.repliesOf(newerRootId).nth(0)).toContainText(
      shortReplies[0],
    );
    await expect(details.repliesOf(newerRootId).nth(1)).toContainText(
      shortReplies[1],
    );

    // Past two, the thread folds behind a count and expands in place.
    await expect(
      details.thread(olderRootId).getByTestId('show-replies'),
    ).toContainText('Show 3 replies');
    await expect(details.repliesOf(olderRootId)).toHaveCount(0);

    await details.showReplies(olderRootId);

    await expect(details.repliesOf(olderRootId)).toHaveCount(3);
    for (const [index, reply] of longReplies.entries()) {
      await expect(details.repliesOf(olderRootId).nth(index)).toContainText(
        reply,
      );
    }

    await details.hideReplies(olderRootId);

    await expect(details.repliesOf(olderRootId)).toHaveCount(0);
    await expect(
      details.thread(olderRootId).getByTestId('show-replies'),
    ).toBeVisible();
  });

  test('opens and marks the thread a reply notification points at', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const biteId = `deeplink-bite-${runId}`;
    const creatorId = `deeplink-creator-${runId}`;
    const reviewerId = `deeplink-reviewer-${runId}`;
    const targetRootId = `deeplink-root-target-${runId}`;
    const otherRootId = `deeplink-root-other-${runId}`;

    await Promise.all([
      seedUser(page, creatorId, `Deeplink Creator ${runId}`),
      seedUser(page, reviewerId, `Deeplink Reviewer ${runId}`),
      seedBite(page, biteId, `Deeplink Dumplings ${runId}`, creatorId),
    ]);

    await seedReview(page, {
      id: targetRootId,
      biteId,
      author: `Deeplink Reviewer ${runId}`,
      authorId: reviewerId,
      review: `Thread with the reply ${runId}`,
      writtenAt: runId,
    });
    await seedReview(page, {
      id: otherRootId,
      biteId,
      author: `Deeplink Reviewer ${runId}`,
      authorId: reviewerId,
      review: `Unrelated thread ${runId}`,
      writtenAt: runId + 10_000,
    });

    await Promise.all(
      [0, 1, 2].map((index) =>
        seedReview(page, {
          id: `deeplink-reply-${index}-${runId}`,
          biteId,
          author: `Deeplink Reviewer ${runId}`,
          authorId: reviewerId,
          review: `Deeplink answer ${index} ${runId}`,
          writtenAt: runId + 1_000 * (index + 1),
          parentReviewId: targetRootId,
          threadId: targetRootId,
        }),
      ),
    );

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);

    // What `toNotificationTarget` builds for a NEW_REVIEW_REPLY payload: the
    // Bite, plus the thread the reply belongs to.
    const details = await openBite(
      page,
      `/bite/${biteId}?threadId=${targetRootId}`,
    );

    // Folding the thread the notification was about would hide the very reply
    // it announced, so it renders open even though it is three replies long.
    await expect(
      details.thread(targetRootId).getByTestId('show-replies'),
    ).toHaveCount(0);
    await expect(details.repliesOf(targetRootId)).toHaveCount(3);

    await expect(details.thread(targetRootId)).toHaveClass(/highlighted/);
    await expect(details.thread(otherRootId)).not.toHaveClass(/highlighted/);
  });
});
