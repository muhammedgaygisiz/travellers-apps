import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { PageSettings, PushInstallationView } from '../settings.component';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';

addNecessaryIcons();

const thisDevice: PushInstallationView = {
  token: 'token-this-device',
  label: 'iPhone',
  details: 'iOS 26.5 · 1.0.1 (88)',
  enabled: true,
  isCurrentDevice: true,
};

const otherDevice: PushInstallationView = {
  token: 'token-other-device',
  label: 'Pixel 7',
  details: 'Android 14 · 1.0.1 (88)',
  enabled: true,
  isCurrentDevice: false,
};

/** A token registered before installation metadata existed (issue #1184). */
const legacyDevice: PushInstallationView = {
  token: 'token-legacy',
  label: '',
  details: 'iOS',
  enabled: true,
  isCurrentDevice: false,
};

export default {
  title: 'Pages/Settings',
  component: PageSettings,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
      ],
    }),
  ],
} as Meta<PageSettings>;

type Story = StoryObj<PageSettings>;
export const Default: Story = {};

/** This installation has no token yet, so setup is offered. */
export const NotificationsNoCurrentDevice: Story = {
  args: {
    pushInstallations: [otherDevice],
    pushPermission: 'prompt',
  },
};

export const NotificationsRegisteredDevices: Story = {
  args: {
    pushInstallations: [thisDevice, otherDevice],
    pushPermission: 'granted',
  },
};

/** One installation opted out; the others keep delivering. */
export const NotificationsDisabledDevice: Story = {
  args: {
    pushInstallations: [thisDevice, { ...otherDevice, enabled: false }],
    pushPermission: 'granted',
  },
};

export const NotificationsLegacyDevice: Story = {
  args: {
    pushInstallations: [thisDevice, legacyDevice],
    pushPermission: 'granted',
  },
};

/**
 * The OS is dropping delivery for this device. The installation keeps its own
 * switch, so both reasons delivery can stop stay visible and separate.
 */
export const NotificationsBlockedByOs: Story = {
  args: {
    pushInstallations: [thisDevice],
    pushPermission: 'denied',
  },
};

/**
 * The web build cannot receive notifications itself, but the account's other
 * installations are still listed and still switchable from here.
 */
export const NotificationsUnsupportedPlatform: Story = {
  args: {
    pushInstallations: [{ ...thisDevice, isCurrentDevice: false }, otherDevice],
    pushPermission: 'unsupported',
  },
};

/**
 * Web with nothing registered anywhere. One line says all there is to say; the
 * list intro and the empty note would only pad it.
 */
export const NotificationsUnsupportedAndEmpty: Story = {
  args: {
    pushInstallations: [],
    pushPermission: 'unsupported',
  },
};

/** The account still has to verify its email, so the resend offer is idle. */
export const EmailVerificationPrompt: Story = {
  args: {
    showEmailVerificationPrompt: true,
  },
};

/** The resend callable is in flight: progress is shown and the tap is blocked. */
export const EmailVerificationResendRunning: Story = {
  args: {
    showEmailVerificationPrompt: true,
    emailVerificationResendRunning: true,
  },
};
