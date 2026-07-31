import { Capacitor } from '@capacitor/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';

/**
 * Preferences key holding the app-installation UUID.
 *
 * The value identifies this installation of the app, not the hardware: it is
 * generated locally, never leaves the account's own token documents, and a
 * reinstall naturally produces a new one (issue #1184).
 */
const INSTALLATION_ID_KEY = 'push-installation-id';

/**
 * One registered app installation of the signed-in user, as stored under
 * `users/{userUid}/pushTokens/{fcmToken}`.
 *
 * `token` is the delivery address and `enabled` is BiteTribe's own delivery
 * switch for it. Neither says anything about the OS notification permission,
 * which only the current device can be asked about.
 */
export interface PushInstallation {
  /** FCM token; the document id, and the backend's delivery address. */
  token: string;
  /** Installation UUID, absent on tokens registered before issue #1184. */
  installationId?: string;
  platform?: string;
  /** Human-readable device label, e.g. `iPhone` or `Pixel 7`. */
  deviceLabel?: string;
  osVersion?: string;
  appVersion?: string;
  /** Whether BiteTribe may deliver to this installation. */
  enabled: boolean;
  createdAt?: number;
  lastSeenAt?: number;
}

/** Device and app facts stored alongside a token so it can be labelled. */
export interface InstallationDescription {
  platform: string;
  deviceLabel: string;
  osVersion: string;
  appVersion: string;
}

/**
 * Installation UUID for a device whose Preferences store refuses to persist.
 *
 * Without it every caller in the session would mint a different id, so the
 * settings list could never recognise the current installation and each token
 * refresh would register a new row.
 */
let volatileInstallationId: string | undefined;

const createUuid = (): string => {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  // Older WebViews have no `randomUUID`. The value only has to be unique per
  // installation, so a v4-shaped random string is enough.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
};

/**
 * The installation UUID if this installation already has one, without creating
 * it.
 *
 * Reading the settings list must not mint an identity: a surface that can never
 * register a token — the web build, or a device where push was never set up —
 * would otherwise leave a stored id behind just by opening Settings. Callers
 * get `undefined` there, which correctly matches no installation in the list.
 */
export const readInstallationId = async (): Promise<string | undefined> => {
  try {
    const { value } = await Preferences.get({ key: INSTALLATION_ID_KEY });

    if (value) {
      return value;
    }
  } catch (error) {
    console.warn('Failed to read the push installation id: ', error);
  }

  return volatileInstallationId;
};

/**
 * The installation UUID, generated on first use and reused from then on.
 *
 * It survives app launches and FCM token rotations, which is what makes a
 * single row in the settings list keep meaning the same device. Only
 * registration calls this; everything else uses {@link readInstallationId} so
 * it cannot create an identity as a side effect.
 */
export const getInstallationId = async (): Promise<string> => {
  const existing = await readInstallationId();

  if (existing) {
    return existing;
  }

  const installationId = createUuid();

  try {
    await Preferences.set({ key: INSTALLATION_ID_KEY, value: installationId });
  } catch (error) {
    console.warn('Failed to persist the push installation id: ', error);
    volatileInstallationId = installationId;
  }

  return installationId;
};

const describeIosDevice = (
  userAgent: string,
): { deviceLabel: string; osVersion: string } => ({
  deviceLabel: /(iPad|iPod touch|iPod|iPhone)/.exec(userAgent)?.[1] ?? 'iPhone',
  osVersion: (
    /OS (\d+(?:[._]\d+)*) like Mac OS X/.exec(userAgent)?.[1] ?? ''
  ).replace(/_/g, '.'),
});

const describeAndroidDevice = (
  userAgent: string,
): { deviceLabel: string; osVersion: string } => ({
  // Android user agents carry the marketing model between the locale and the
  // build id, e.g. `; Pixel 7 Build/TQ3A`.
  deviceLabel:
    /;\s*([^;()]+?)\s+Build\//.exec(userAgent)?.[1]?.trim() ?? 'Android',
  osVersion: /Android (\d+(?:\.\d+)*)/.exec(userAgent)?.[1] ?? '',
});

const describeBrowser = (
  userAgent: string,
): { deviceLabel: string; osVersion: string } => {
  const browser = /(Edg|OPR|Chrome|Firefox|Safari)\//.exec(userAgent)?.[1];
  const labels: Record<string, string> = {
    Edg: 'Edge',
    OPR: 'Opera',
    Chrome: 'Chrome',
    Firefox: 'Firefox',
    Safari: 'Safari',
  };

  return {
    deviceLabel: browser ? labels[browser] : 'Browser',
    osVersion: '',
  };
};

const readAppVersion = async (): Promise<string> => {
  try {
    const { version, build } = await App.getInfo();

    return build ? `${version} (${build})` : version;
  } catch {
    // The web build has no native app info to read; the label falls back to the
    // device and OS alone.
    return '';
  }
};

/**
 * Device and app metadata for the current installation.
 *
 * The label is derived from the user agent rather than a native device plugin:
 * it only has to make a row recognisable in a list of a user's own devices, and
 * that keeps the native wrapper unchanged.
 */
export const describeCurrentInstallation =
  async (): Promise<InstallationDescription> => {
    const platform = Capacitor.getPlatform();
    const userAgent = globalThis.navigator?.userAgent ?? '';

    const device =
      platform === 'ios'
        ? describeIosDevice(userAgent)
        : platform === 'android'
          ? describeAndroidDevice(userAgent)
          : describeBrowser(userAgent);

    return {
      platform,
      deviceLabel: device.deviceLabel,
      osVersion: device.osVersion,
      appVersion: await readAppVersion(),
    };
  };

const userTokenReference = (userUid: string, token: string): string =>
  `users/${userUid}/pushTokens/${token}`;

const indexReference = (token: string): string => `pushTokens/${token}`;

/**
 * Filler the pre-#1184 registration wrote for `appVersion` and `deviceId`
 * because it had nothing real to put there. It is absence, not a value, so
 * reading it back as one would print `tbd-xxx` next to a user's device.
 */
const LEGACY_PLACEHOLDER = 'tbd-xxx';

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 && value !== LEGACY_PLACEHOLDER
    ? value
    : undefined;

const toOptionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const toInstallation = (snapshot: {
  id: string;
  data?: unknown;
}): PushInstallation => {
  const data = (snapshot.data ?? {}) as Record<string, unknown>;

  return {
    token: snapshot.id,
    installationId: toOptionalString(data['installationId']),
    platform: toOptionalString(data['platform']),
    deviceLabel: toOptionalString(data['deviceLabel']),
    osVersion: toOptionalString(data['osVersion']),
    appVersion: toOptionalString(data['appVersion']),
    // A token document written before the flag existed still delivers, which is
    // the same default the backend token resolution applies.
    enabled: data['enabled'] !== false,
    createdAt: toOptionalNumber(data['createdAt']),
    lastSeenAt: toOptionalNumber(data['lastSeenAt']),
  };
};

/**
 * The user's registered installations, most recently seen first.
 *
 * A read failure yields an empty list rather than throwing: the settings page
 * treats "no installations" as an offer to register this device, which is a
 * truthful thing to show when the list cannot be read.
 */
export const loadPushInstallations = async (
  userUid: string,
): Promise<PushInstallation[]> => {
  try {
    const result = await FirebaseFirestore.getCollection({
      reference: `users/${userUid}/pushTokens`,
    });

    return result.snapshots
      .map((snapshot) => toInstallation(snapshot))
      .sort((left, right) => (right.lastSeenAt ?? 0) - (left.lastSeenAt ?? 0));
  } catch (error) {
    console.warn('Failed to load push installations: ', error);

    return [];
  }
};

/**
 * Flips BiteTribe's delivery switch for one installation.
 *
 * The write is merged so it only touches `enabled`; a legacy token document
 * keeps whatever else it holds and gains a flag the backend already honours.
 */
export const setPushInstallationEnabled = async (
  userUid: string,
  token: string,
  enabled: boolean,
): Promise<void> => {
  await FirebaseFirestore.setDocument({
    reference: userTokenReference(userUid, token),
    data: { enabled },
    merge: true,
  });
};

const removePushToken = async (
  userUid: string,
  token: string,
): Promise<void> => {
  try {
    await FirebaseFirestore.deleteDocument({
      reference: userTokenReference(userUid, token),
    });
    await FirebaseFirestore.deleteDocument({
      reference: indexReference(token),
    });
  } catch (error) {
    console.warn('Failed to remove a superseded push token: ', error);
  }
};

/**
 * Registers `token` as the current installation's delivery address.
 *
 * There is at most one active token per installation, so a rotated token
 * replaces the previous one and the superseded document and reverse index are
 * removed. The replacement inherits the installation's `enabled` state: a
 * refresh at login, an app restart, or an FCM rotation must never turn a
 * disabled installation back on (issue #1184).
 */
export const registerPushInstallation = async (
  userUid: string,
  token: string,
): Promise<void> => {
  const installationId = await getInstallationId();
  const description = await describeCurrentInstallation();
  const existing = await loadPushInstallations(userUid);

  const registered = existing.filter(
    (installation) => installation.installationId === installationId,
  );
  // Prefer this exact token's own state, then the most recently seen token of
  // the same installation — that is the one a rotation supersedes.
  const previous =
    registered.find((installation) => installation.token === token) ??
    registered[0];

  const now = Date.now();
  const createdAt = previous?.createdAt ?? now;

  await FirebaseFirestore.setDocument({
    reference: userTokenReference(userUid, token),
    data: {
      installationId,
      platform: description.platform,
      deviceLabel: description.deviceLabel,
      osVersion: description.osVersion,
      appVersion: description.appVersion,
      enabled: previous?.enabled ?? true,
      createdAt,
      lastSeenAt: now,
    },
    merge: true,
  });

  await FirebaseFirestore.setDocument({
    reference: indexReference(token),
    data: {
      userUid,
      installationId,
      platform: description.platform,
      createdAt,
      lastSeenAt: now,
    },
    merge: true,
  });

  await Promise.all(
    registered
      .filter((installation) => installation.token !== token)
      .map((installation) => removePushToken(userUid, installation.token)),
  );
};

const getFcmToken = async (): Promise<string | null> => {
  const platform = Capacitor.getPlatform();

  try {
    const { token } = await FirebaseMessaging.getToken();

    if (!token || token.trim().length === 0) {
      console.warn('Firebase Messaging returned empty token');

      return null;
    }

    return token;
  } catch (e) {
    console.error(
      'Failed to get FCM token for Firebase Messaging on platform:',
      platform,
      e,
    );

    return null;
  }
};

/**
 * Reads the current FCM token and registers it for this installation.
 *
 * Returns whether a token could be registered, so an explicit setup action can
 * tell "registered" apart from "the OS granted but FCM gave us nothing".
 */
export const registerCurrentPushInstallation = async (
  userUid: string,
): Promise<boolean> => {
  const token = await getFcmToken();

  if (!token) {
    console.error('No FCM token available, cannot register this installation');

    return false;
  }

  await registerPushInstallation(userUid, token);

  return true;
};
