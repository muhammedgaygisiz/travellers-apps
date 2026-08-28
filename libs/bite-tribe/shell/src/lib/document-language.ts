import {
  DestroyRef,
  EnvironmentProviders,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Keeps `<html lang>` in step with the active Transloco language (issue \#1388).
 *
 * Casing is language-dependent, and the browser picks the rules from the
 * language of the element it uppercases. `index.html` ships `lang="en"`, so
 * every `text-transform: uppercase` surface - Bite cards and the Bitemap
 * drawer through Ionic's `ion-card-subtitle`, the review thread, the currency
 * selector - applied English rules to whatever language the app was in. In
 * Turkish that maps `i` to `I` instead of `İ`, so `ÜMRANİYE, TÜRKİYE` reached
 * the device as `ÜMRANIYE, TÜRKIYE`.
 *
 * Set on the document element rather than per screen, because the property is
 * inherited: every uppercased surface, including the ones inside Ionic's shadow
 * DOM, reads it from here.
 */
export const provideDocumentLanguage = (): EnvironmentProviders =>
  provideAppInitializer(() => {
    const destroyRef = inject(DestroyRef);

    // `langChanges$` replays the active language, so the document is tagged at
    // startup and again on every switch - including the one the app component
    // makes once the stored preference has been read.
    inject(TranslocoService)
      .langChanges$.pipe(takeUntilDestroyed(destroyRef))
      .subscribe((lang) => {
        document.documentElement.lang = lang;
      });
  });
