import { Page } from '@playwright/test';

/**
 * Destinations reachable from the header menu popover. The values match the
 * `data-testid` suffixes on the menu items in `common/ui/page`.
 */
export type AppMenuTarget =
  'about' | 'leaderboard' | 'market-place' | 'my-bucketlists' | 'settings';

/**
 * Walks into a page through the header menu.
 *
 * These routes sit behind the auth guard, which bounces a direct `page.goto`
 * back to Home, so the menu is the only way in. The popover is appended to the
 * document body, hence the page-level lookup for the item.
 */
export async function navigateFromAppMenu(
  page: Page,
  target: AppMenuTarget,
): Promise<void> {
  await page.getByTestId('btn-menu').click();
  await page.getByTestId(`menu-${target}`).click();
  await page.waitForURL(new RegExp(`/${target}$`));
}
