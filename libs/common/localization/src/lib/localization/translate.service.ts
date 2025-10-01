import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { LANG_TO_LOCALE_MAP, SupportedLang } from './model/supported-lang';

@Injectable()
export class TranslateService {
  private readonly translocoService = inject(TranslocoService);

  setActiveLang(lang: SupportedLang): void {
    this.translocoService.setActiveLang(lang);
    // Note: Angular LOCALE_ID cannot be changed at runtime
    // Price formatting will use the Angular formatNumber with explicit locale
  }

  getActiveLang(): string {
    return this.translocoService.getActiveLang();
  }

  getLocaleForLang(lang: SupportedLang): string {
    return LANG_TO_LOCALE_MAP[lang] || 'en-US';
  }
}
