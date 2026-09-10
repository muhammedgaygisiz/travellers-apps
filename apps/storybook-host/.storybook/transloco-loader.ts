import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

/**
 * The three Transloco catalogues Storybook serves, lowest precedence first.
 *
 * Storybook hosts stories from all three apps in one preview, and each app
 * ships its own catalogue. Loading only the consumer app's left every
 * `Admin/*` and `Business/*` story rendering raw keys - visible in the
 * `New Restaurant` reference image, which read `about-restaurant` and
 * `prefill-from-google-places` (issue #1547).
 *
 * The consumer catalogue is applied **last** so it wins the handful of keys
 * that exist in more than one app with different wording, such as
 * `app-check-blocked-message` and the language names. That keeps every
 * committed consumer reference byte-identical; the two privileged apps are the
 * ones gaining coverage here, not the one being rebaselined.
 */
const CATALOGUES = [
  '/assets/i18n-business',
  '/assets/i18n-admin',
  '/assets/i18n',
] as const;

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string): Observable<Translation> {
    return forkJoin(
      CATALOGUES.map((base) => this.load(`${base}/${lang}.json`)),
    ).pipe(map((translations) => Object.assign({}, ...translations)));
  }

  /**
   * A catalogue that is not there resolves to nothing rather than failing.
   *
   * The admin and business apps ship `en.json` only, so switching the locale
   * toolbar to any other language 404s two of the three requests. Without this
   * the whole `forkJoin` errors and the story loses the consumer catalogue too,
   * so picking German would leave every story rendering raw keys.
   *
   * This is a manual-browsing concern only. Loki renders each story at the
   * default locale, `en`, which all three apps ship - and it would fail a story
   * on the 404 regardless of what the caller does with the error, because it
   * counts any response of 400 or above to the served Storybook build as a
   * failed request (`fetchFailIgnore` in `loki.config.js` forgives external
   * hosts and nothing else).
   */
  private load(url: string): Observable<Translation> {
    return this.http
      .get<Translation>(url)
      .pipe(catchError(() => of({} as Translation)));
  }
}
