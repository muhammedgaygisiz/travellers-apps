import { Page } from '@playwright/test';

const COACH_MARK_IDLE_TIMEOUT_MS = 1_000;
const MAX_COACH_MARKS_PER_PAGE = 20;

/**
 * Dismisses the coach-mark queue on the current page, if one is present.
 *
 * A dismissed mark may enable the next mark asynchronously after its seen state
 * is persisted. Waiting briefly for every next dismiss button avoids returning
 * in the gap between two marks while still making this safe on pages without a
 * coach mark.
 */
export async function dismissCoachMarks(page: Page): Promise<void> {
  const dismissButton = page.getByTestId('coach-mark-dismiss');

  for (let dismissed = 0; dismissed < MAX_COACH_MARKS_PER_PAGE; dismissed++) {
    const hasCoachMark = await dismissButton
      .waitFor({ state: 'visible', timeout: COACH_MARK_IDLE_TIMEOUT_MS })
      .then(
        () => true,
        () => false,
      );

    if (!hasCoachMark) {
      return;
    }

    // Dismissing synchronously removes this overlay. Dispatch the event without
    // Playwright's post-click stability retry, which would otherwise keep
    // waiting on the intentionally detached button.
    await dismissButton.dispatchEvent('click');
  }

  throw new Error(
    `Coach-mark queue exceeded ${MAX_COACH_MARKS_PER_PAGE} dismissals`,
  );
}
