import { inject, Injectable } from '@angular/core';
import { getBrowserLang, TranslocoService } from '@ngneat/transloco';
import { SupportedLang } from './model/supported-lang';

@Injectable()
export class TranslateService {
  private readonly translocoService = inject(TranslocoService);

  get onTranslationChange() {
    return this.translocoService.events$;
  }

  get currentLang() {
    return this.translocoService.getActiveLang();
  }

  set currentLang(lang: string) {
    this.translocoService.setActiveLang(lang);
  }

  set defaultLang(lang: string) {
    this.translocoService.setDefaultLang(lang);
  }

  instant(key: string) {
    return this.translocoService.translate(key);
  }

  getBrowserLang() {
    return getBrowserLang();
  }

  use(lang: string) {
    this.translocoService.setDefaultLang(lang);
    this.translocoService.setActiveLang(lang);
  }

  getDefaultLang() {
    return this.translocoService.getDefaultLang();
  }

  setDefaultLang(lang: string) {
    this.translocoService.setDefaultLang(lang);
  }

  setAvailableLangs(locales: SupportedLang[] | undefined) {
    if (locales) {
      this.translocoService.setAvailableLangs(locales);
    }
  }
}
