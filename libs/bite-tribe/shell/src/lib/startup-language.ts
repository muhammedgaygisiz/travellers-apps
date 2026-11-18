import {
  DestroyRef,
  EnvironmentProviders,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { TranslocoService } from '@jsverse/transloco';
import { concatMap, filter, takeWhile } from 'rxjs';
import {
  FALLBACK_LANGUAGE,
  LANGUAGE_PREFERENCE_KEY,
  languageForLocale,
  readDeviceLocale,
} from 'utils';
import { isSelfCanonicalUrl } from './canonical-url';

const readStoredLanguage = async (): Promise<string | null> => {
  try {
    const { value } = await Preferences.get({ key: LANGUAGE_PREFERENCE_KEY });

    return value || null;
  } catch {
    return null;
  }
};

const shippedLanguages = (transloco: TranslocoService): string[] =>
  transloco
    .getAvailableLangs()
    .map((lang) => (typeof lang === 'string' ? lang : lang.id));

/**
 * The language a start with no stored choice opens in, for a given URL.
 *
 * The device language, when the app ships it. On the web the public pages are
 * the exception: they stay English for a visitor without a choice, so what is
 * indexed and shared reads the same for everyone. A native build has no
 * indexed pages, so it applies the device language everywhere.
 */
export const startupLanguageFor = (
  url: string,
  deviceLanguage: string,
  isNative = Capacitor.isNativePlatform(),
): string =>
  !isNative && isSelfCanonicalUrl(url) ? FALLBACK_LANGUAGE : deviceLanguage;

/**
 * Opens the app in the language chosen on this device, or else in the device
 * language (issue #2104).
 *
 * Before this, a start without a stored choice opened in English, and the
 * device language was first read by the onboarding language step - after
 * sign-in. A Turkish phone saw the start, login and registration pages in
 * English.
 *
 * Without a stored choice the language follows navigation, because on the web
 * it depends on the route: entering the app from a public page switches to the
 * device language. It stops as soon as a choice is stored, which is what
 * sign-in, onboarding and the settings page do.
 *
 * Not awaited: a start-up that waits on storage costs more than a first frame
 * in the fallback language.
 */
export const provideStartupLanguage = (): EnvironmentProviders =>
  provideAppInitializer(() => {
    const transloco = inject(TranslocoService);
    const router = inject(Router);
    const destroyRef = inject(DestroyRef);

    void (async (): Promise<void> => {
      const stored = await readStoredLanguage();

      if (stored) {
        transloco.setActiveLang(stored);
        return;
      }

      const deviceLanguage = languageForLocale(
        readDeviceLocale(),
        shippedLanguages(transloco),
      );

      transloco.setActiveLang(
        startupLanguageFor(location.pathname, deviceLanguage),
      );

      router.events
        .pipe(
          filter(
            (event): event is NavigationEnd => event instanceof NavigationEnd,
          ),
          concatMap(async ({ urlAfterRedirects }) =>
            (await readStoredLanguage())
              ? null
              : startupLanguageFor(urlAfterRedirects, deviceLanguage),
          ),
          takeWhile((language): language is string => language !== null),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe((language) => {
          if (transloco.getActiveLang() !== language) {
            transloco.setActiveLang(language);
          }
        });
    })();
  });
