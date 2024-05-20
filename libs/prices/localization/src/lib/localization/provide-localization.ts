import {
  isDevMode,
  LOCALE_ID,
  makeEnvironmentProviders,
  Provider,
} from '@angular/core';

import { TranslocoHttpLoader } from './transloco-http-loader.service';
import {
  provideTransloco,
  provideTranslocoLoader,
  translocoConfig,
  TranslocoPipe,
} from '@ngneat/transloco';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';
import { SupportedLang } from './model/supported-lang';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

registerLocaleData(localeDe);

const PROVIDERS: Provider[] = [TranslateService, TranslocoPipe, TranslatePipe];

export const provideLocalization = (i18n?: {
  locales: SupportedLang[];
  defaultLang: SupportedLang;
}) =>
  makeEnvironmentProviders([
    provideTranslocoLoader(TranslocoHttpLoader),
    provideTransloco({
      config: translocoConfig({
        availableLangs: i18n?.locales || [SupportedLang.DE],
        defaultLang: i18n?.defaultLang || SupportedLang.DE,
        fallbackLang: SupportedLang.DE,
        // Remove this option if your application
        // doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      }),
    }),
    { provide: LOCALE_ID, useValue: i18n?.defaultLang || SupportedLang.DE },
    ...PROVIDERS,
  ]);
