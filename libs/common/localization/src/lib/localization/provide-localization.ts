import {
  EnvironmentProviders,
  isDevMode,
  LOCALE_ID,
  makeEnvironmentProviders,
  Provider,
} from '@angular/core';

import { TranslocoHttpLoader } from './transloco-http-loader.service';
import {
  provideTransloco,
  translocoConfig,
  TranslocoPipe,
} from '@jsverse/transloco';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { SupportedLang } from './model/supported-lang';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeEn from '@angular/common/locales/en';
import localeFr from '@angular/common/locales/fr';
import { provideHttpClient } from '@angular/common/http';

registerLocaleData(localeDe, 'de-DE');
registerLocaleData(localeDe, 'de-CH');
registerLocaleData(localeEn, 'en-US');
registerLocaleData(localeFr, 'fr-FR');

const PROVIDERS: Provider[] = [TranslateService, TranslocoPipe, TranslatePipe];

interface LocalizationParams {
  locales: SupportedLang[];
  defaultLang: SupportedLang;
}

export const provideLocalization = (
  i18n?: LocalizationParams
): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideHttpClient(),
    provideTransloco({
      loader: TranslocoHttpLoader,
      config: translocoConfig({
        availableLangs: i18n?.locales || [SupportedLang.DE],
        defaultLang: i18n?.defaultLang || SupportedLang.DE,
        fallbackLang: SupportedLang.DE,
        prodMode: !isDevMode(),
      }),
    }),
    { provide: LOCALE_ID, useValue: i18n?.defaultLang || SupportedLang.DE },
    ...PROVIDERS,
  ]);
