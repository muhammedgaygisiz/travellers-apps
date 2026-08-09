import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AppMenuComponent } from '../app-menu.component';

addNecessaryIcons();

/**
 * A flat-colour data URI rather than a remote avatar: the menu only needs a
 * photo that loads, and a network image would be non-deterministic under the
 * visual-regression run.
 */
const PHOTO_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="#f0a04b"/></svg>',
  );

export default {
  title: 'Components/App Menu',
  component: AppMenuComponent,
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
  ],
  args: {
    isAuthenticated: true,
    showMyProfile: true,
    showMyBites: true,
    showMyBucketlists: true,
    showMarketPlaceButton: true,
    showGalleryButton: true,
    showLeaderboardButton: true,
    showSettingsButton: true,
    showAboutButton: true,
  },
} as Meta<AppMenuComponent>;

type Story = StoryObj<AppMenuComponent>;

/**
 * The signed-in menu with an account bound. The profile entry carries the
 * account: its icon is replaced by the account's photo at the same size, and
 * the display name sits under the entry's own label. See GitHub issue #1260.
 */
export const WithAccount: Story = {
  args: {
    account: { displayName: 'Muhammed', photoUrl: PHOTO_URL },
  },
};

/**
 * An account whose photo is missing or has not been set. The entry falls back
 * to the anonymous icon and keeps the display name, so the account is still
 * named.
 */
export const WithoutPhoto: Story = {
  args: {
    account: { displayName: 'Muhammed', photoUrl: '' },
  },
};

/**
 * A display name long enough to run past the popover. It is truncated to one
 * line so the entry cannot grow taller than the rest of the menu.
 */
export const LongDisplayName: Story = {
  args: {
    account: {
      displayName: 'Muhammed Veysel Gaygisiz von Und Zu Lahmacun',
      photoUrl: PHOTO_URL,
    },
  },
};

/**
 * No account bound — an app that supplies no identity, or a session whose
 * profile has not loaded yet. This is the menu exactly as it rendered before
 * the account was named.
 */
export const WithoutAccount: Story = {
  args: {
    account: undefined,
  },
};

/** The signed-out menu, which offers login instead of any account entry. */
export const SignedOut: Story = {
  args: {
    isAuthenticated: false,
    account: undefined,
  },
};
