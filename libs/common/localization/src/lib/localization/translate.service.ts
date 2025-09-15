import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { SupportedLang } from './model/supported-lang';

@Injectable()
export class TranslateService {
  private readonly translocoService = inject(TranslocoService);

  setActiveLang(lang: SupportedLang): void {
    this.translocoService.setActiveLang(lang);
  }
}
