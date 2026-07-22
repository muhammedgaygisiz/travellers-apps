import { expect, Locator, Page } from '@playwright/test';

/** Page object for the profile, edit-profile, and social-list journeys. */
export class ProfilePage {
  readonly page: Page;
  readonly displayName: Locator;
  readonly city: Locator;
  readonly about: Locator;
  readonly editProfile: Locator;
  readonly follow: Locator;
  readonly stopFollowing: Locator;

  constructor(page: Page) {
    this.page = page;
    // Ionic keeps prior routed pages mounted and hides them during forward
    // navigation, so profile assertions must target the active view.
    this.displayName = page.locator(
      'profile-page:visible .profile-display-name',
    );
    this.city = page.locator('profile-page:visible .profile-meta');
    this.about = page.locator('profile-page:visible .profile-about');
    this.editProfile = page.getByRole('button', {
      name: 'Edit Profile',
      exact: true,
    });
    this.follow = page.getByRole('button', { name: 'Follow', exact: true });
    this.stopFollowing = page.getByRole('button', {
      name: 'Stop following',
      exact: true,
    });
  }

  async openMyProfileFromMenu(): Promise<void> {
    await this.page.getByTestId('btn-menu').click();
    await this.page
      .getByTestId('menu-list')
      .locator('ion-item')
      .filter({ hasText: 'My Profile' })
      .click();
    await this.page.waitForURL('**/my-profile');
  }

  async editIdentity(city: string, about: string): Promise<void> {
    await this.editProfile.click();
    await this.page.waitForURL('**/edit-profile');
    await this.page
      .locator('ion-input[formcontrolname="city"] input')
      .fill(city);
    await this.page
      .locator('ion-textarea[formcontrolname="about"] textarea')
      .fill(about);
    await this.page
      .getByRole('button', { name: 'Save Changes', exact: true })
      .click();
    await this.page.waitForURL('**/my-profile');
  }

  socialCount(label: 'Followers' | 'Following'): Locator {
    return this.page
      .locator('profile-page:visible profile-header .header-column')
      .filter({ has: this.page.locator('strong', { hasText: label }) })
      .locator('span');
  }

  async openSocialList(label: 'Followers' | 'Following'): Promise<void> {
    await this.socialCount(label).click();
    await this.page.waitForURL(/\/followers\/[^/]+\/(followers|following)$/);
    await expect(
      this.page.getByRole('heading', { name: label, exact: true }),
    ).toBeVisible();
  }

  socialListUser(displayName: string): Locator {
    return this.page.locator('followers-list:visible ion-item').filter({
      has: this.page.locator('h2').filter({
        hasText: new RegExp(`^${displayName}$`),
      }),
    });
  }

  async goBackToProfile(userId: string): Promise<void> {
    await this.page.locator('followers-list:visible ion-back-button').click();
    await this.page.waitForURL(`**/profile/${userId}`);
  }

  async confirmUnfollow(): Promise<void> {
    await this.stopFollowing.click();
    await this.page
      .locator('profile-page:visible ion-alert')
      .getByRole('button', { name: 'Yes, unfollow', exact: true })
      .click();
  }
}
