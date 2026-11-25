import { expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

/** Signs in and waits for the account's BiteTrails, the app's home page. */
export async function loginAs(
  page: Page,
  user: { email: string; password: string },
): Promise<void> {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(user.email, user.password);

  await expect(page).toHaveURL(/\/bite-trails$/);
}
