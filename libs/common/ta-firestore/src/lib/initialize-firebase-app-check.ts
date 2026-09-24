import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseApp } from 'firebase/app';
import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheckToken,
} from 'firebase/app-check';
import { Analytics, logEvent } from 'firebase/analytics';

const APP_CHECK_SITE_KEY_ENV = 'NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY';
const APP_CHECK_DEBUG_TOKEN_ENV = 'NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN';
const APP_CHECK_ENFORCED_ENV = 'NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED';
const IS_DEV_ENV = 'NX_APP_BITE_TRIBE_IS_DEV';
const NATIVE_TOKEN_EXPIRY_FALLBACK_MS = 5 * 60 * 1000;
const TRANSITIONAL_POLICY = 'continue_after_failure';
const ENFORCED_POLICY = 'block_until_ready';

export type FirebaseAppCheckRuntimeMode =
  'dev_simulator' | 'local_prod_firebase' | 'production';

export type FirebaseAppCheckTelemetryOptions = {
  analytics?: Analytics | null;
  runtimeMode: FirebaseAppCheckRuntimeMode;
};

type AppCheckProvider = 'none' | 'native_bridge' | 'recaptcha_enterprise';
type AppCheckStartupStatus = 'completed' | 'failed' | 'skipped';
type AppCheckPlatform = 'android' | 'ios' | 'web' | 'other';

/**
 * Whether the running client is emulated hardware.
 *
 * Firebase's own App Check metrics are per-service and carry no client
 * attribution, so production numbers are the only readiness signal there is
 * for switching enforcement on - and a simulator cannot attest, so its traffic
 * is unverified by construction. Without this parameter a production build on
 * a simulator is indistinguishable from a physical device in our telemetry
 * (same `runtime_mode`, same `platform`), which makes the test traffic
 * polluting those metrics impossible to subtract. Issue #1221.
 */
type AppCheckDeviceClass = 'physical' | 'unknown' | 'virtual';

/**
 * What asked for a token.
 *
 * `recovery` is the mid-session path (issue #1621): a page that started with a
 * token and lost it afterwards. It is kept apart from `retry` - the cold-start
 * gate's button - because the two say different things about a client. A
 * `retry` means the app never started; a `recovery` means it ran and then
 * stopped being able to reach Firebase, which is the state that was previously
 * invisible outside a browser console.
 */
type AppCheckPreflightTrigger = 'recovery' | 'retry' | 'startup';

type AppCheckPreflightResult = {
  ok: boolean;
  reason?: string;
};

type AppCheckStartupResult = {
  platform: AppCheckPlatform;
  provider: AppCheckProvider;
  reason?: string;
  status: AppCheckStartupStatus;
};

/**
 * Readiness verdict returned to the startup gate.
 *
 * `ready` is the only field the caller must react to: when App Check
 * enforcement is enabled and readiness is not achieved, the app must block
 * protected Firebase traffic and show a retry state instead of partial broken
 * Firebase screens (issue #933). When enforcement is off, `ready` is always
 * true and startup continues exactly as before under the transitional policy.
 */
export type AppCheckReadiness = {
  ready: boolean;
  enforced: boolean;
  status: AppCheckStartupStatus;
  provider: AppCheckProvider;
  platform: AppCheckPlatform;
  reason?: string;
};

let appCheckInitialization: Promise<AppCheckReadiness> | null = null;

export const isFirebaseAppCheckEnforced = (): boolean =>
  process.env[APP_CHECK_ENFORCED_ENV] === 'true';

export const initializeFirebaseAppCheck = (
  app: FirebaseApp,
  telemetryOptions?: FirebaseAppCheckTelemetryOptions,
): Promise<AppCheckReadiness> => {
  if (appCheckInitialization) {
    return appCheckInitialization;
  }

  appCheckInitialization = initializeFirebaseAppCheckOnce(
    app,
    telemetryOptions,
  );
  return appCheckInitialization;
};

export type FirebaseAppCheckRecheckOptions =
  FirebaseAppCheckTelemetryOptions & {
    /**
     * Whether this re-check is the cold-start gate's button (`retry`, the
     * default) or the mid-session path (`recovery`).
     */
    trigger?: 'recovery' | 'retry';
  };

/**
 * Re-checks App Check token readiness without re-registering the provider
 * (registering twice throws). Used by the startup gate's retry path: the
 * provider is already registered from the first attempt, so a retry only needs
 * to confirm a token can now be obtained.
 *
 * **The token is always requested with `forceRefresh`.** Both re-check paths
 * run after a token request has just failed, and without the flag the SDK
 * answers a second time out of the cache it answered the first time from, so
 * the re-check re-issues the call that failed instead of asking again. Charter
 * Run 11 cleared this state by deleting the App Check token cache, which is
 * what the flag does (issues #1465, #1621).
 *
 * **A `recovery` checks the token whether or not the client flag is on.**
 * `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` says what this build does about App
 * Check, not what the Firebase Console enforces - the two drift, which is
 * issue #1369. A cold-start `retry` may take the flag at its word, because
 * nothing has contradicted it. A `recovery` runs only after a live request was
 * refused for a missing or invalid token, so on that path the flag has already
 * been proven wrong and short-circuiting to `ready: true` would report a page
 * healthy that cannot reach Firebase (issue #1621).
 */
export const refreshFirebaseAppCheckReadiness = async (
  telemetryOptions?: FirebaseAppCheckRecheckOptions,
): Promise<AppCheckReadiness> => {
  const enforced = isFirebaseAppCheckEnforced();
  const platform = getAppCheckPlatform();
  const trigger = telemetryOptions?.trigger ?? 'retry';
  const skipReason = getRecheckSkipReason(enforced, trigger);

  if (skipReason) {
    return {
      ready: true,
      enforced,
      status: 'skipped',
      provider: 'none',
      platform,
      reason: skipReason,
    };
  }

  const telemetry = await createTelemetry(telemetryOptions);
  const preflight = await preflightAppCheckToken(telemetry, trigger);

  if (!preflight.ok) {
    telemetry.emit('app_check_enforced_blocked', {
      platform,
      reason: preflight.reason ?? 'token_unavailable',
      trigger,
    });
  }

  return {
    ready: preflight.ok,
    enforced,
    status: preflight.ok ? 'completed' : 'failed',
    provider: 'none',
    platform,
    reason: preflight.ok
      ? undefined
      : (preflight.reason ?? 'token_unavailable'),
  };
};

/**
 * Why a re-check answers ready without asking for a token, or nothing when it
 * has to ask.
 *
 * Dev mode never registers a provider, so there is no token to ask for and the
 * emulators enforce nothing; a recovery there would fail forever against a
 * plugin that was never initialized.
 */
const getRecheckSkipReason = (
  enforced: boolean,
  trigger: 'recovery' | 'retry',
): string | undefined => {
  if (process.env[IS_DEV_ENV] === 'true') {
    return 'dev_mode';
  }

  return !enforced && trigger !== 'recovery' ? 'not_enforced' : undefined;
};

export const resetFirebaseAppCheckInitializationForTesting = (): void => {
  appCheckInitialization = null;
};

const initializeFirebaseAppCheckOnce = async (
  app: FirebaseApp,
  telemetryOptions?: FirebaseAppCheckTelemetryOptions,
): Promise<AppCheckReadiness> => {
  const telemetry = await createTelemetry(telemetryOptions);
  const startedAt = Date.now();
  telemetry.emit('app_check_startup_started');

  const result = await initializeFirebaseAppCheckProvider(app, telemetry);
  const durationMs = Date.now() - startedAt;
  const enforced = isFirebaseAppCheckEnforced();
  const tokenReady = await runStartupPreflight(result, enforced, telemetry);

  const ready = isAppCheckReady(result, enforced, tokenReady);

  telemetry.emit(getTerminalEventName(result.status), {
    duration_ms: durationMs,
    platform: result.platform,
    provider: result.provider,
    reason: result.reason,
    transitional_policy:
      !enforced && result.status === 'failed' ? TRANSITIONAL_POLICY : undefined,
    enforced_policy: enforced ? ENFORCED_POLICY : undefined,
  });

  if (enforced && !ready) {
    telemetry.emit('app_check_enforced_blocked', {
      platform: result.platform,
      provider: result.provider,
      reason: result.reason,
    });
  }

  return {
    ready,
    enforced,
    status: result.status,
    provider: result.provider,
    platform: result.platform,
    reason: result.reason,
  };
};

/**
 * Enforced-mode readiness rules:
 * - not enforced: always ready (transitional `continue_after_failure`).
 * - completed: ready only when a token was actually obtained.
 * - skipped for dev or an unsupported platform: ready, because enforcement
 *   cannot apply there (dev simulator / SSR / non-app platform).
 * - skipped for a missing site key, or a failed init: not ready. Enforced mode
 *   fails closed so a misconfigured build blocks with a retry rather than
 *   rendering Firebase screens that will fail against Console enforcement.
 */
const isAppCheckReady = (
  result: AppCheckStartupResult,
  enforced: boolean,
  tokenReady: boolean,
): boolean => {
  if (!enforced) {
    return true;
  }

  switch (result.status) {
    case 'completed':
      return tokenReady;
    case 'skipped':
      return (
        result.reason === 'dev_mode' || result.reason === 'unsupported_platform'
      );
    case 'failed':
    default:
      return false;
  }
};

/**
 * Runs the startup token preflight and reports its outcome.
 *
 * The preflight runs whenever a provider was actually registered, enforced or
 * not. Registering a `CustomProvider` never fetches a token, so before issue
 * #1221 a client that could not attest at all - a simulator, a device with a
 * burned debug token - still reported `app_check_startup_completed` and
 * nothing in our telemetry disagreed. Enforcement could therefore only be
 * validated by switching it on in production.
 *
 * **Enforced mode awaits it; non-enforced mode does not.** Readiness depends
 * on the token only when enforcement is on, so awaiting it there is what the
 * gate needs. When enforcement is off the result changes nothing about
 * startup, and awaiting a token round-trip inside the app initializer would
 * delay initial navigation for every user to buy a metric. It is issued and
 * reported when it settles instead, leaving startup timing unchanged.
 */
const runStartupPreflight = async (
  result: AppCheckStartupResult,
  enforced: boolean,
  telemetry: AppCheckTelemetry,
): Promise<boolean> => {
  if (result.status !== 'completed') {
    return false;
  }

  if (!enforced) {
    void preflightAppCheckToken(telemetry, 'startup');
    return false;
  }

  const preflight = await preflightAppCheckToken(telemetry, 'startup');
  return preflight.ok;
};

const preflightAppCheckToken = async (
  telemetry: AppCheckTelemetry,
  trigger: AppCheckPreflightTrigger,
): Promise<AppCheckPreflightResult> => {
  const preflight = await getAppCheckTokenPreflight(telemetry, trigger);

  telemetry.emit('app_check_token_preflight', {
    reason: preflight.reason,
    succeeded: preflight.ok,
    trigger,
  });

  return preflight;
};

/**
 * `forceRefresh` on every trigger but `startup`, where a cached token is the
 * right answer and the fast one. A re-check has just been told the cached
 * token is no good, so asking for it again answers with the same one.
 */
const getAppCheckTokenPreflight = async (
  telemetry: AppCheckTelemetry,
  trigger: AppCheckPreflightTrigger,
): Promise<AppCheckPreflightResult> => {
  try {
    const { token } = await FirebaseAppCheck.getToken({
      forceRefresh: trigger !== 'startup',
    });

    return token ? { ok: true } : { ok: false, reason: 'empty_token' };
  } catch (error) {
    telemetry.warn('[AppCheck] App Check token preflight failed', error);

    if (!isAppCheckThrottleError(error)) {
      return { ok: false, reason: 'token_request_failed' };
    }

    telemetry.emit('app_check_throttled', {
      platform: getAppCheckPlatform(),
      trigger,
    });

    return { ok: false, reason: 'token_throttled' };
  }
};

/**
 * Whether the App Check SDK is refusing to ask for a token at all.
 *
 * After a 403 from the exchange the SDK applies its own backoff -
 * `appCheck/initial-throttle`, one day - and answers every later request out
 * of that state without a network call: *Requests throttled due to previous
 * 403 error. Attempts allowed again after 01d:00m:00s*. The backoff is held in
 * memory for the life of the page instance, so `forceRefresh` does not reach
 * past it and no wait inside a session outlives it; only a document reload
 * does.
 *
 * That makes it the one failure here that a bounded recovery cannot end, which
 * is why it is told apart from an ordinary failed request rather than counted
 * with it. Before issue #1621 it was visible only as a line in a browser
 * console, hundreds of times over, on a page nobody was watching.
 */
const isAppCheckThrottleError = (error: unknown): boolean => {
  const { code, message } = (error ?? {}) as {
    code?: unknown;
    message?: unknown;
  };
  const text = [
    typeof code === 'string' ? code : '',
    typeof message === 'string' ? message : '',
  ]
    .join(' ')
    .toLowerCase();

  return text.includes('throttl');
};

/**
 * Whether a request was refused for a missing or invalid App Check token.
 *
 * The refusal this answers for is the server's, not the SDK's: Identity
 * Toolkit answers `401 UNAUTHENTICATED` with *Firebase App Check token is
 * invalid* when Console enforcement is on and the request carried no usable
 * token. That reaches the caller as an opaque sign-in failure - a wrong
 * password and a page that has lost its attestation look the same from the
 * login form - so the text of the refusal is the only thing that tells them
 * apart (issue #1621).
 *
 * Matched on the text on purpose. The Firebase JS SDK folds the server's
 * response into `auth/internal-error` and carries the original message with
 * it, the Capacitor plugin passes the native error's message through, and
 * neither exposes a stable code for this. A false positive costs a recovery
 * attempt that finds a healthy token and clears itself; a false negative
 * leaves the operator where this issue found them.
 */
export const isAppCheckRefusal = (error: unknown): boolean => {
  const { code, message } = (error ?? {}) as {
    code?: unknown;
    message?: unknown;
  };
  const text = [
    typeof code === 'string' ? code : '',
    typeof message === 'string' ? message : '',
  ]
    .join(' ')
    .toLowerCase();

  return (
    text.includes('app check') ||
    text.includes('app-check') ||
    text.includes('appcheck')
  );
};

const initializeFirebaseAppCheckProvider = async (
  app: FirebaseApp,
  telemetry: AppCheckTelemetry,
): Promise<AppCheckStartupResult> => {
  if (process.env[IS_DEV_ENV] === 'true') {
    telemetry.info(
      `[AppCheck] Skipping Firebase App Check because ${IS_DEV_ENV} is true`,
    );
    return {
      platform: getAppCheckPlatform(),
      provider: 'none',
      reason: 'dev_mode',
      status: 'skipped',
    };
  }

  const platform = getAppCheckPlatform();

  if (platform === 'ios' || platform === 'android') {
    return initializeNativeFirebaseAppCheckBridge(app, platform, telemetry);
  }

  if (platform !== 'web') {
    telemetry.info(
      `[AppCheck] Skipping Firebase App Check on unsupported platform: ${platform}`,
    );
    return {
      platform,
      provider: 'none',
      reason: 'unsupported_platform',
      status: 'skipped',
    };
  }

  return initializeWebFirebaseAppCheck(telemetry);
};

const initializeWebFirebaseAppCheck = async (
  telemetry: AppCheckTelemetry,
): Promise<AppCheckStartupResult> => {
  const siteKey = process.env[APP_CHECK_SITE_KEY_ENV];

  if (!siteKey) {
    telemetry.warn(
      `[AppCheck] Skipping Firebase App Check because ${APP_CHECK_SITE_KEY_ENV} is not configured. ${APP_CHECK_DEBUG_TOKEN_ENV} does not replace the site key.`,
    );
    return {
      platform: 'web',
      provider: 'none',
      reason: 'missing_site_key',
      status: 'skipped',
    };
  }

  const debugToken = process.env[APP_CHECK_DEBUG_TOKEN_ENV];

  if (process.env[IS_DEV_ENV] === 'false' && !debugToken) {
    telemetry.warn(
      `[AppCheck] ${IS_DEV_ENV} is false but ${APP_CHECK_DEBUG_TOKEN_ENV} is not configured. Localhost production-Firebase testing may fail App Check token exchange.`,
    );
  }

  try {
    telemetry.info('[AppCheck] Initializing Firebase App Check');

    await FirebaseAppCheck.initialize({
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
      ...(debugToken ? { debugToken } : {}),
    });

    telemetry.info('[AppCheck] Firebase App Check initialized');
    return {
      platform: 'web',
      provider: 'recaptcha_enterprise',
      status: 'completed',
    };
  } catch (error) {
    telemetry.warn(
      '[AppCheck] Firebase App Check initialization failed; continuing under transitional policy',
      error,
    );
    return {
      platform: 'web',
      provider: 'recaptcha_enterprise',
      reason: 'initialization_error',
      status: 'failed',
    };
  }
};

const initializeNativeFirebaseAppCheckBridge = async (
  app: FirebaseApp,
  platform: 'ios' | 'android',
  telemetry: AppCheckTelemetry,
): Promise<AppCheckStartupResult> => {
  const platformLabel = getNativePlatformLabel(platform);

  try {
    telemetry.info(
      `[AppCheck] Initializing ${platformLabel} Firebase App Check bridge`,
    );

    await FirebaseAppCheck.setTokenAutoRefreshEnabled({ enabled: true });

    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: getNativeFirebaseAppCheckToken,
      }),
      isTokenAutoRefreshEnabled: true,
    });

    telemetry.info(
      `[AppCheck] ${platformLabel} Firebase App Check bridge initialized`,
    );
    return {
      platform,
      provider: 'native_bridge',
      status: 'completed',
    };
  } catch (error) {
    telemetry.warn(
      `[AppCheck] ${platformLabel} Firebase App Check bridge initialization failed; continuing under transitional policy`,
      error,
    );
    return {
      platform,
      provider: 'native_bridge',
      reason: 'initialization_error',
      status: 'failed',
    };
  }
};

const getNativePlatformLabel = (platform: 'ios' | 'android'): string =>
  platform === 'ios' ? 'iOS' : 'Android';

const getNativeFirebaseAppCheckToken = async (): Promise<AppCheckToken> => {
  const { token, expireTimeMillis } = await FirebaseAppCheck.getToken({
    forceRefresh: false,
  });

  return {
    token,
    expireTimeMillis:
      expireTimeMillis ?? Date.now() + NATIVE_TOKEN_EXPIRY_FALLBACK_MS,
  };
};

const getAppCheckPlatform = (): AppCheckPlatform => {
  const platform = Capacitor.getPlatform();

  return platform === 'android' || platform === 'ios' || platform === 'web'
    ? platform
    : 'other';
};

type AppCheckTelemetryEvent =
  | 'app_check_enforced_blocked'
  | 'app_check_initialization_failed'
  | 'app_check_skipped'
  | 'app_check_startup_completed'
  | 'app_check_startup_started'
  | 'app_check_throttled'
  | 'app_check_token_preflight';

type AppCheckTelemetryParams = {
  device_class: AppCheckDeviceClass;
  duration_ms?: number;
  has_debug_token?: boolean;
  has_site_key?: boolean;
  platform?: AppCheckPlatform;
  provider?: AppCheckProvider;
  reason?: string;
  runtime_mode: FirebaseAppCheckRuntimeMode;
  succeeded?: boolean;
  transitional_policy?: typeof TRANSITIONAL_POLICY;
  trigger?: AppCheckPreflightTrigger;
  enforced_policy?: typeof ENFORCED_POLICY;
};

type AppCheckTelemetry = {
  emit: (
    eventName: AppCheckTelemetryEvent,
    params?: Partial<AppCheckTelemetryParams>,
  ) => void;
  info: (message: string) => void;
  warn: (message: string, error?: unknown) => void;
};

const createTelemetry = async (
  options?: FirebaseAppCheckTelemetryOptions,
): Promise<AppCheckTelemetry> => {
  const runtimeMode = options?.runtimeMode ?? getRuntimeMode();
  const platform = getAppCheckPlatform();
  const shouldEmitTelemetry = runtimeMode !== 'dev_simulator';
  const shouldLogToConsole = runtimeMode === 'local_prod_firebase';
  const shouldUseNativeAnalytics = platform === 'ios' || platform === 'android';
  const baseParams: AppCheckTelemetryParams = {
    device_class: await getAppCheckDeviceClass(platform),
    has_debug_token: Boolean(process.env[APP_CHECK_DEBUG_TOKEN_ENV]),
    has_site_key: Boolean(process.env[APP_CHECK_SITE_KEY_ENV]),
    runtime_mode: runtimeMode,
  };

  return {
    emit: (eventName, params = {}): void => {
      if (!shouldEmitTelemetry) {
        return;
      }

      const eventParams = compactParams({
        ...baseParams,
        ...params,
      });

      if (shouldUseNativeAnalytics) {
        void FirebaseAnalytics.logEvent({
          name: eventName,
          params: eventParams,
        }).catch((error) => {
          if (shouldLogToConsole) {
            console.warn(
              '[AppCheck] Failed to emit native Analytics telemetry',
              error,
            );
          }
        });
        return;
      }

      if (options?.analytics) {
        logEvent(options.analytics, eventName, eventParams);
      }
    },
    info: (message): void => {
      if (shouldLogToConsole) {
        console.info(message);
      }
    },
    warn: (message, error): void => {
      if (shouldLogToConsole) {
        if (error) {
          console.warn(message, error);
        } else {
          console.warn(message);
        }
      }
    },
  };
};

/**
 * Whether this client is emulated hardware, for App Check attribution.
 *
 * Only native platforms are asked. A browser has no simulator/device
 * distinction to make, and `@capacitor/device` answers `isVirtual: false`
 * there, which would report every web client as physical hardware and read as
 * a claim rather than as the absence of one. The lookup is best-effort:
 * attribution is never worth failing startup for.
 */
const getAppCheckDeviceClass = async (
  platform: AppCheckPlatform,
): Promise<AppCheckDeviceClass> => {
  if (platform !== 'android' && platform !== 'ios') {
    return 'unknown';
  }

  try {
    const { isVirtual } = await Device.getInfo();
    return isVirtual ? 'virtual' : 'physical';
  } catch {
    return 'unknown';
  }
};

const getRuntimeMode = (): FirebaseAppCheckRuntimeMode => {
  if (process.env[IS_DEV_ENV] === 'true') {
    return 'dev_simulator';
  }

  if (process.env[IS_DEV_ENV] === 'false') {
    return 'local_prod_firebase';
  }

  return 'production';
};

const getTerminalEventName = (
  status: AppCheckStartupStatus,
): AppCheckTelemetryEvent => {
  if (status === 'failed') {
    return 'app_check_initialization_failed';
  }

  if (status === 'skipped') {
    return 'app_check_skipped';
  }

  return 'app_check_startup_completed';
};

const compactParams = (
  params: AppCheckTelemetryParams,
): Record<string, boolean | number | string> =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Record<string, boolean | number | string>;
