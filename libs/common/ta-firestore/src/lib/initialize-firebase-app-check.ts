import { Capacitor } from '@capacitor/core';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
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
const IS_DEV_ENV = 'NX_APP_BITE_TRIBE_IS_DEV';
const NATIVE_TOKEN_EXPIRY_FALLBACK_MS = 5 * 60 * 1000;
const TRANSITIONAL_POLICY = 'continue_after_failure';

export type FirebaseAppCheckRuntimeMode =
  | 'dev_simulator'
  | 'local_prod_firebase'
  | 'production';

export type FirebaseAppCheckTelemetryOptions = {
  analytics?: Analytics | null;
  runtimeMode: FirebaseAppCheckRuntimeMode;
};

type AppCheckProvider = 'none' | 'native_bridge' | 'recaptcha_enterprise';
type AppCheckStartupStatus = 'completed' | 'failed' | 'skipped';
type AppCheckPlatform = 'android' | 'ios' | 'web' | 'other';

type AppCheckStartupResult = {
  platform: AppCheckPlatform;
  provider: AppCheckProvider;
  reason?: string;
  status: AppCheckStartupStatus;
};

let appCheckInitialization: Promise<void> | null = null;

export const initializeFirebaseAppCheck = (
  app: FirebaseApp,
  telemetryOptions?: FirebaseAppCheckTelemetryOptions,
): Promise<void> => {
  if (appCheckInitialization) {
    return appCheckInitialization;
  }

  appCheckInitialization = initializeFirebaseAppCheckOnce(
    app,
    telemetryOptions,
  );
  return appCheckInitialization;
};

export const resetFirebaseAppCheckInitializationForTesting = (): void => {
  appCheckInitialization = null;
};

const initializeFirebaseAppCheckOnce = async (
  app: FirebaseApp,
  telemetryOptions?: FirebaseAppCheckTelemetryOptions,
): Promise<void> => {
  const telemetry = createTelemetry(telemetryOptions);
  const startedAt = Date.now();
  telemetry.emit('app_check_startup_started');

  const result = await initializeFirebaseAppCheckProvider(app, telemetry);
  const durationMs = Date.now() - startedAt;

  telemetry.emit(getTerminalEventName(result.status), {
    duration_ms: durationMs,
    platform: result.platform,
    provider: result.provider,
    reason: result.reason,
    transitional_policy:
      result.status === 'failed' ? TRANSITIONAL_POLICY : undefined,
  });
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
  | 'app_check_initialization_failed'
  | 'app_check_skipped'
  | 'app_check_startup_completed'
  | 'app_check_startup_started';

type AppCheckTelemetryParams = {
  duration_ms?: number;
  has_debug_token?: boolean;
  has_site_key?: boolean;
  platform?: AppCheckPlatform;
  provider?: AppCheckProvider;
  reason?: string;
  runtime_mode: FirebaseAppCheckRuntimeMode;
  transitional_policy?: typeof TRANSITIONAL_POLICY;
};

type AppCheckTelemetry = {
  emit: (
    eventName: AppCheckTelemetryEvent,
    params?: Partial<AppCheckTelemetryParams>,
  ) => void;
  info: (message: string) => void;
  warn: (message: string, error?: unknown) => void;
};

const createTelemetry = (
  options?: FirebaseAppCheckTelemetryOptions,
): AppCheckTelemetry => {
  const runtimeMode = options?.runtimeMode ?? getRuntimeMode();
  const shouldEmitTelemetry = runtimeMode !== 'dev_simulator';
  const shouldLogToConsole = runtimeMode === 'local_prod_firebase';
  const baseParams: AppCheckTelemetryParams = {
    has_debug_token: Boolean(process.env[APP_CHECK_DEBUG_TOKEN_ENV]),
    has_site_key: Boolean(process.env[APP_CHECK_SITE_KEY_ENV]),
    runtime_mode: runtimeMode,
  };

  return {
    emit: (eventName, params = {}): void => {
      if (!shouldEmitTelemetry || !options?.analytics) {
        return;
      }

      logEvent(
        options.analytics,
        eventName,
        compactParams({
          ...baseParams,
          ...params,
        }),
      );
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
